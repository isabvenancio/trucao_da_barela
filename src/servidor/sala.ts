import { ASSENTOS } from '../engine/index.ts';
import type { Assento } from '../engine/index.ts';
import { AVATARES } from '../ui/arte/avatares-catalogo.ts';
import type { Ocupante, OperacaoAssento, Perfil, Sala } from './tipos.ts';
import { ErroServidor } from './tipos.ts';

/** RN-020 */
export const MINUTOS_PARA_INICIAR = 30;
/** RN-022 */
export const SEGUNDOS_SEM_SINAL = 60;
/** Sinal de presença só é regravado depois deste intervalo, para poupar escritas. */
export const SEGUNDOS_ENTRE_SINAIS = 15;

const NOMES_BOTS = ['Tijolo', 'Cascalho', 'Brasa', 'Musgo', 'Granito', 'Argila', 'Pavio', 'Sereno'];

const mais = (agora: Date, ms: number) => new Date(agora.getTime() + ms).toISOString();

/** RN-023: apelido de 2 a 16 caracteres e avatar do catálogo. */
export function validarPerfil(perfil: unknown): Perfil {
  const p = perfil as Perfil;
  const apelido = typeof p?.apelido === 'string' ? p.apelido.trim() : '';
  if (apelido.length < 2 || apelido.length > 16) throw new ErroServidor('DADOS_INVALIDOS', 'O apelido precisa ter de 2 a 16 caracteres.');
  const avatar = AVATARES.some((a) => a.id === p.avatar) ? p.avatar : AVATARES[0]!.id;
  return { apelido, avatar };
}

export function novaSala(codigo: string, perfil: Perfil, tokenHash: string, agora: Date): Sala {
  return {
    codigo,
    situacao: 'aguardando',
    anfitriao: 0,
    assentos: [{ tipo: 'humano', nome: perfil.apelido, avatar: perfil.avatar, tokenHash, ultimoSinal: agora.toISOString() }, null, null, null],
    lotes: [],
    criadaEm: agora.toISOString(),
    expiraEm: mais(agora, MINUTOS_PARA_INICIAR * 60_000),
    atualizadaEm: agora.toISOString(),
    versao: 0,
  };
}

export function presente(o: Ocupante | null, agora: Date): boolean {
  if (!o || o.tipo !== 'humano' || o.saiu || !o.ultimoSinal) return false;
  return agora.getTime() - new Date(o.ultimoSinal).getTime() <= SEGUNDOS_SEM_SINAL * 1000;
}

/** RN-019, RN-022: bot de verdade, ou humano que saiu ou sumiu há mais de 60 s. */
export function controladoPorBot(o: Ocupante | null, agora: Date): boolean {
  return !!o && (o.tipo === 'bot' || !presente(o, agora));
}

export function assentoDoToken(sala: Sala, tokenHash: string): Assento | undefined {
  const i = sala.assentos.findIndex((o) => o?.tokenHash === tokenHash);
  return i >= 0 ? (i as Assento) : undefined;
}

/** RN-023: apelidos repetidos na sala ganham sufixo numérico ("Ana", "Ana 2"). */
export function nomeUnico(sala: Sala, apelido: string, ignorar?: Assento): string {
  const usados = new Set(sala.assentos.filter((o, i) => o && i !== ignorar).map((o) => o!.nome.toLowerCase()));
  if (!usados.has(apelido.toLowerCase())) return apelido;
  for (let n = 2; ; n++) {
    const candidato = `${apelido.slice(0, 13)} ${n}`;
    if (!usados.has(candidato.toLowerCase())) return candidato;
  }
}

function exigirAguardando(sala: Sala, agora: Date) {
  if (sala.situacao === 'encerrada') throw new ErroServidor('SALA_ENCERRADA', 'Esta sala já foi encerrada.', 410);
  if (sala.situacao === 'em_jogo') throw new ErroServidor('SALA_EM_JOGO', 'A partida desta sala já começou.', 409);
  if (new Date(sala.expiraEm) < agora) throw new ErroServidor('SALA_EXPIRADA', 'Esta sala expirou sem começar.', 410);
}

/** UC-006: ocupa o primeiro assento vazio, ou substitui um bot (A3). */
export function entrar(sala: Sala, perfil: Perfil, tokenHash: string, agora: Date): Assento {
  exigirAguardando(sala, agora);
  let alvo = sala.assentos.findIndex((o) => o === null);
  if (alvo < 0) alvo = sala.assentos.findIndex((o) => o?.tipo === 'bot');
  if (alvo < 0) throw new ErroServidor('SALA_CHEIA', 'A sala está cheia.', 409);
  sala.assentos[alvo] = {
    tipo: 'humano',
    nome: nomeUnico(sala, perfil.apelido, alvo as Assento),
    avatar: perfil.avatar,
    tokenHash,
    ultimoSinal: agora.toISOString(),
  };
  return alvo as Assento;
}

/** UC-015: a mesma credencial recupera o mesmo assento. */
export function reconectar(sala: Sala, tokenHash: string, agora: Date): Assento | undefined {
  const assento = assentoDoToken(sala, tokenHash);
  if (assento === undefined) return undefined;
  const o = sala.assentos[assento]!;
  if (o.saiu && sala.situacao === 'encerrada') return undefined;
  delete o.saiu;
  o.ultimoSinal = agora.toISOString();
  return assento;
}

/** Atualiza a presença; retorna se houve mudança a gravar. */
export function registrarSinal(sala: Sala, assento: Assento, agora: Date): boolean {
  const o = sala.assentos[assento];
  if (!o || o.saiu) return false;
  const ultimo = o.ultimoSinal ? new Date(o.ultimoSinal).getTime() : 0;
  if (agora.getTime() - ultimo < SEGUNDOS_ENTRE_SINAIS * 1000) return false;
  o.ultimoSinal = agora.toISOString();
  return true;
}

function botNovo(sala: Sala, dificuldade: Ocupante['dificuldade']): Ocupante {
  const usados = new Set(sala.assentos.map((o) => o?.nome));
  const nome = NOMES_BOTS.find((n) => !usados.has(n)) ?? `Bot ${sala.assentos.filter(Boolean).length + 1}`;
  const avatares = AVATARES.map((a) => a.id).filter((id) => !sala.assentos.some((o) => o?.avatar === id));
  return { tipo: 'bot', nome, avatar: avatares[0] ?? 'golem', dificuldade: dificuldade ?? 'medio' };
}

/** UC-007: organizar duplas. Só o anfitrião mexe em outros assentos (CA-007.3). */
export function operarAssento(sala: Sala, meu: Assento, op: OperacaoAssento, agora: Date, aleatorio = Math.random): void {
  exigirAguardando(sala, agora);
  const anfitriao = sala.anfitriao === meu;
  const exigirAnfitriao = () => {
    if (!anfitriao) throw new ErroServidor('SEM_PERMISSAO', 'Só o anfitrião pode fazer isso.', 403);
  };
  const valido = (a: unknown): a is Assento => ASSENTOS.includes(a as Assento);

  switch (op.tipo) {
    case 'mover': {
      if (!valido(op.para)) throw new ErroServidor('DADOS_INVALIDOS', 'Assento inválido.');
      if (sala.assentos[op.para]) throw new ErroServidor('ASSENTO_OCUPADO', 'Esse assento já está ocupado.', 409);
      sala.assentos[op.para] = sala.assentos[meu];
      sala.assentos[meu] = null;
      if (anfitriao) sala.anfitriao = op.para;
      return;
    }
    case 'adicionarBot': {
      exigirAnfitriao();
      if (!valido(op.assento)) throw new ErroServidor('DADOS_INVALIDOS', 'Assento inválido.');
      if (sala.assentos[op.assento]) throw new ErroServidor('ASSENTO_OCUPADO', 'Esse assento já está ocupado.', 409);
      sala.assentos[op.assento] = botNovo(sala, ['facil', 'medio', 'dificil'].includes(op.dificuldade) ? op.dificuldade : 'medio');
      return;
    }
    case 'removerBot': {
      exigirAnfitriao();
      if (!valido(op.assento) || sala.assentos[op.assento]?.tipo !== 'bot') throw new ErroServidor('DADOS_INVALIDOS', 'Não há bot nesse assento.');
      sala.assentos[op.assento] = null;
      return;
    }
    case 'trocar': {
      exigirAnfitriao();
      if (!valido(op.a) || !valido(op.b)) throw new ErroServidor('DADOS_INVALIDOS', 'Assento inválido.');
      [sala.assentos[op.a], sala.assentos[op.b]] = [sala.assentos[op.b], sala.assentos[op.a]];
      if (sala.anfitriao === op.a) sala.anfitriao = op.b;
      else if (sala.anfitriao === op.b) sala.anfitriao = op.a;
      return;
    }
    case 'sortear': {
      exigirAnfitriao();
      const anfitriaoOcupante = sala.assentos[sala.anfitriao];
      const embaralhados = [...sala.assentos].sort(() => aleatorio() - 0.5) as Sala['assentos'];
      sala.assentos = embaralhados;
      sala.anfitriao = sala.assentos.indexOf(anfitriaoOcupante) as Assento;
      return;
    }
    default:
      throw new ErroServidor('DADOS_INVALIDOS', 'Operação desconhecida.');
  }
}

/** Passa a função de anfitrião ao próximo humano presente; retorna `false` se não houver nenhum. */
export function transferirAnfitriao(sala: Sala, agora: Date): boolean {
  if (presente(sala.assentos[sala.anfitriao] ?? null, agora)) return true;
  for (let i = 1; i <= 4; i++) {
    const a = ((sala.anfitriao + i) % 4) as Assento;
    if (presente(sala.assentos[a] ?? null, agora)) {
      sala.anfitriao = a;
      return true;
    }
  }
  return false;
}

/** UC-014: sair da sala ou da partida (RN-022). */
export function sair(sala: Sala, meu: Assento, agora: Date): void {
  const o = sala.assentos[meu];
  if (!o) return;
  if (sala.situacao === 'aguardando') {
    sala.assentos[meu] = null;
  } else {
    o.saiu = true;
  }
  if (!transferirAnfitriao(sala, agora)) {
    sala.situacao = 'encerrada';
    sala.expiraEm = agora.toISOString();
  }
}

export function assentosOcupados(sala: Sala): number {
  return sala.assentos.filter(Boolean).length;
}
