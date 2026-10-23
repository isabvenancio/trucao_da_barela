import type { Acao, Assento } from '../engine/index.ts';
import { gerarCodigo, gerarToken, hashToken, normalizarCodigo } from './cripto.ts';
import { acaoHumana, avancar, iniciarPartida, respostaPara } from './jogo.ts';
import type { Repositorio } from './repositorio.ts';
import { assentoDoToken, entrar, novaSala, operarAssento, reconectar, registrarSinal, sair, validarPerfil } from './sala.ts';
import type { OperacaoAssento, RespostaEstado, Sala } from './tipos.ts';
import { ErroServidor } from './tipos.ts';

const TENTATIVAS = 6;
/** RNF-007: a linha some do banco 24 h depois da expiração/encerramento da sala. */
const MS_RETENCAO = 24 * 3_600_000;

export interface Credencial {
  codigo: string;
  token: string;
  assento: Assento;
}

/**
 * Casos de uso online sobre o repositório. Cada operação lê a sala, aplica a regra numa cópia
 * e grava com controle de versão; em conflito, relê e tenta de novo (RNF-001).
 */
export class Servico {
  private repo: Repositorio;
  private relogio: () => Date;
  private semente: () => number;
  private aleatorio: () => number;

  constructor(
    repo: Repositorio,
    relogio: () => Date = () => new Date(),
    semente: () => number = () => Date.now() ^ Math.floor(Math.random() * 0x7fffffff),
    aleatorio: () => number = Math.random,
  ) {
    this.repo = repo;
    this.relogio = relogio;
    this.semente = semente;
    this.aleatorio = aleatorio;
  }

  private async carregar(codigo: string): Promise<Sala> {
    const sala = await this.repo.buscar(normalizarCodigo(codigo));
    if (!sala) throw new ErroServidor('SALA_INEXISTENTE', 'Sala não encontrada. Confira o código.', 404);
    return sala;
  }

  private async meuAssento(sala: Sala, token: unknown): Promise<Assento> {
    if (typeof token !== 'string' || token.length < 16) throw new ErroServidor('CREDENCIAL_INVALIDA', 'Credencial inválida.', 401);
    const assento = assentoDoToken(sala, await hashToken(token));
    if (assento === undefined) throw new ErroServidor('CREDENCIAL_INVALIDA', 'Você não está nesta sala.', 401);
    return assento;
  }

  /** Lê, aplica `fn` numa cópia e grava se `fn` disser que mudou. */
  private async transacao<T>(codigo: string, fn: (sala: Sala, agora: Date) => Promise<{ mudou: boolean; valor: T }>): Promise<T> {
    for (let i = 0; i < TENTATIVAS; i++) {
      const original = await this.carregar(codigo);
      const sala = structuredClone(original);
      const agora = this.relogio();
      const { mudou, valor } = await fn(sala, agora);
      if (!mudou) return valor;
      sala.versao = original.versao + 1;
      sala.atualizadaEm = agora.toISOString();
      if (await this.repo.salvar(sala, original.versao)) return valor;
    }
    throw new ErroServidor('CONFLITO', 'Muita gente mexendo ao mesmo tempo. Tente de novo.', 409);
  }

  /** UC-005 */
  async criarSala(perfil: unknown): Promise<Credencial> {
    const p = validarPerfil(perfil);
    const agora = this.relogio();
    await this.repo.limparExpiradas(new Date(agora.getTime() - MS_RETENCAO)).catch(() => undefined);
    const token = gerarToken();
    const hash = await hashToken(token);
    for (let i = 0; i < 10; i++) {
      const codigo = gerarCodigo();
      if (await this.repo.criar(novaSala(codigo, p, hash, agora))) return { codigo, token, assento: 0 };
    }
    throw new ErroServidor('INDISPONIVEL', 'Não foi possível gerar um código de sala. Tente de novo.', 503);
  }

  /** UC-006 e UC-015 (com a credencial já guardada, é reconexão). */
  async entrar(codigo: string, perfil: unknown, token?: unknown): Promise<Credencial & { reconectou: boolean }> {
    const cod = normalizarCodigo(codigo);
    if (typeof token === 'string' && token.length >= 16) {
      const hash = await hashToken(token);
      const assento = await this.transacao(cod, async (sala, agora) => {
        const a = reconectar(sala, hash, agora);
        return { mudou: a !== undefined, valor: a };
      });
      if (assento !== undefined) return { codigo: cod, token, assento, reconectou: true };
      const sala = await this.carregar(cod);
      if (sala.situacao !== 'aguardando') throw new ErroServidor('CREDENCIAL_INVALIDA', 'Não há assento seu para recuperar nesta sala.', 401);
    }
    const p = validarPerfil(perfil);
    const novo = gerarToken();
    const hash = await hashToken(novo);
    const assento = await this.transacao(cod, async (sala, agora) => ({ mudou: true, valor: entrar(sala, p, hash, agora) }));
    return { codigo: cod, token: novo, assento, reconectou: false };
  }

  /** UC-007 */
  async operar(codigo: string, token: unknown, op: OperacaoAssento): Promise<void> {
    await this.transacao(codigo, async (sala, agora) => {
      operarAssento(sala, await this.meuAssento(sala, token), op, agora, this.aleatorio);
      return { mudou: true, valor: undefined };
    });
  }

  /** UC-008 e UC-016 */
  async iniciar(codigo: string, token: unknown): Promise<void> {
    await this.transacao(codigo, async (sala, agora) => {
      iniciarPartida(sala, await this.meuAssento(sala, token), agora, this.semente());
      return { mudou: true, valor: undefined };
    });
  }

  /** UC-010 a UC-013 */
  async acao(codigo: string, token: unknown, acao: Acao): Promise<void> {
    if (!acao || typeof acao !== 'object' || typeof (acao as Acao).tipo !== 'string') {
      throw new ErroServidor('DADOS_INVALIDOS', 'Ação inválida.');
    }
    await this.transacao(codigo, async (sala, agora) => {
      const meu = await this.meuAssento(sala, token);
      registrarSinal(sala, meu, agora);
      acaoHumana(sala, meu, acao, agora);
      return { mudou: true, valor: undefined };
    });
  }

  /** UC-014 */
  async sair(codigo: string, token: unknown): Promise<void> {
    await this.transacao(codigo, async (sala, agora) => {
      sair(sala, await this.meuAssento(sala, token), agora);
      return { mudou: true, valor: undefined };
    });
  }

  /**
   * Consulta periódica do navegador: registra presença, deixa bots jogarem / aplica prazos
   * e devolve o que este assento pode ver desde a versão `desde`.
   */
  async estado(codigo: string, token: unknown, desde: number): Promise<RespostaEstado> {
    return this.transacao(codigo, async (sala, agora) => {
      const meu = await this.meuAssento(sala, token);
      const sinal = registrarSinal(sala, meu, agora);
      const avancou = avancar(sala, agora, this.aleatorio);
      const mudou = sinal || avancou;
      const resposta = respostaPara(sala, meu, Number.isFinite(desde) ? desde : -1, agora);
      // Se vamos gravar, a versão final será a próxima.
      if (mudou) resposta.versao = sala.versao + 1;
      return { mudou, valor: resposta };
    });
  }
}
