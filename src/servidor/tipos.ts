import type { Assento, Dificuldade, EstadoPartida, Evento, Rodada } from '../engine/index.ts';
import type { RodadaVisivel, VisaoMesa } from '../engine/index.ts';

/**
 * Documento de uma sala online. Fica inteiro no servidor (uma linha da tabela `salas`);
 * o navegador só recebe `RespostaEstado`, montada por assento (RN-018, RNF-002).
 */
export type SituacaoSala = 'aguardando' | 'em_jogo' | 'encerrada';

export interface Ocupante {
  tipo: 'humano' | 'bot';
  nome: string;
  avatar: string;
  dificuldade?: Dificuldade;
  /** SHA-256 da credencial do assento (só humanos). */
  tokenHash?: string;
  /** Último sinal de presença (ISO), atualizado pelas consultas do navegador. */
  ultimoSinal?: string;
  /** Saiu da partida pelo botão Sair: um bot joga no lugar até ele reconectar (RN-022). */
  saiu?: boolean;
}

export interface LoteEventos {
  versao: number;
  eventos: Evento[];
}

export interface Sala {
  codigo: string;
  situacao: SituacaoSala;
  anfitriao: Assento;
  assentos: [Ocupante | null, Ocupante | null, Ocupante | null, Ocupante | null];
  /** Estado completo do motor: nunca enviado ao navegador. */
  partida?: EstadoPartida;
  /** Últimos lotes de eventos, para os navegadores animarem e tocarem sons. */
  lotes: LoteEventos[];
  /** Última rodada encerrada, exibida durante a pausa até `ate`. */
  destaque?: { rodada: Rodada; placar: [number, number]; ate: string };
  /** Prazo da decisão humana pendente (RN-021). */
  prazo?: string;
  /** Quando um bot pode fazer a próxima jogada (ritmo da mesa). */
  proximoBotEm?: string;
  criadaEm: string;
  expiraEm: string;
  atualizadaEm: string;
  versao: number;
}

/** O que o navegador vê de cada assento no lobby e na mesa. */
export interface AssentoPublico {
  assento: Assento;
  ocupado: boolean;
  tipo?: 'humano' | 'bot';
  nome?: string;
  avatar?: string;
  dificuldade?: Dificuldade;
  anfitriao: boolean;
  /** Humano ausente ou que saiu: um bot está jogando por ele. */
  botNoLugar: boolean;
  souEu: boolean;
}

export interface RespostaEstado {
  codigo: string;
  situacao: SituacaoSala;
  versao: number;
  meuAssento: Assento;
  souAnfitriao: boolean;
  assentos: AssentoPublico[];
  expiraEm: string;
  visao?: VisaoMesa;
  /** Lotes posteriores à versão que o navegador já tinha, filtrados para o assento. */
  lotes: LoteEventos[];
  destaque?: { rodada: RodadaVisivel; placar: [number, number]; ate: string };
  prazo?: string;
  agora: string;
}

export interface Perfil {
  apelido: string;
  avatar: string;
}

export type OperacaoAssento =
  | { tipo: 'mover'; para: Assento }
  | { tipo: 'adicionarBot'; assento: Assento; dificuldade: Dificuldade }
  | { tipo: 'removerBot'; assento: Assento }
  | { tipo: 'trocar'; a: Assento; b: Assento }
  | { tipo: 'sortear' };

export type CodigoErroServidor =
  | 'SALA_INEXISTENTE'
  | 'SALA_CHEIA'
  | 'SALA_EM_JOGO'
  | 'SALA_ENCERRADA'
  | 'SALA_EXPIRADA'
  | 'CREDENCIAL_INVALIDA'
  | 'SEM_PERMISSAO'
  | 'ASSENTO_OCUPADO'
  | 'ASSENTOS_VAZIOS'
  | 'DADOS_INVALIDOS'
  | 'REGRA'
  | 'CONFLITO'
  | 'INDISPONIVEL';

export class ErroServidor extends Error {
  codigo: CodigoErroServidor;
  status: number;

  constructor(codigo: CodigoErroServidor, mensagem: string, status = 400) {
    super(mensagem);
    this.codigo = codigo;
    this.status = status;
  }
}
