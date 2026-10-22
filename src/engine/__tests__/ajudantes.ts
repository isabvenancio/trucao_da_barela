import { manilhaDaVira } from '../baralho.ts';
import { aplicarAcao, criarPartida } from '../partida.ts';
import type { Acao, Assento, Carta, EstadoPartida, Naipe, Participante, Resultado, Valor } from '../tipos.ts';

const NAIPES: Record<string, Naipe> = { o: 'ouros', e: 'espadas', c: 'copas', p: 'paus' };

/** Notação curta: c('3o') = 3 de ouros; c('Qp') = dama de paus. */
export function c(codigo: string): Carta {
  return { valor: codigo.slice(0, -1) as Valor, naipe: NAIPES[codigo.slice(-1)] as Naipe };
}

export function participantes(tipos: ('humano' | 'bot')[] = ['humano', 'bot', 'bot', 'bot']): EstadoPartida['participantes'] {
  return tipos.map((tipo, i): Participante => ({ nome: `J${i}`, avatar: 'padrao', tipo })) as EstadoPartida['participantes'];
}

export interface Cenario {
  carteador?: Assento;
  placar?: [number, number];
  vira?: string;
  /** Cartas de cada assento em notação curta. */
  maos?: [string[], string[], string[], string[]];
  tipos?: ('humano' | 'bot')[];
  semente?: number;
}

/** Monta uma partida com cartas e vira escolhidas, mantendo as demais regras de distribuição. */
export function mesa(cenario: Cenario = {}): EstadoPartida {
  const { estado } = criarPartida({
    participantes: participantes(cenario.tipos),
    semente: cenario.semente ?? 42,
    carteadorInicial: cenario.carteador ?? 3,
    placarInicial: cenario.placar,
  });
  if (cenario.vira) {
    estado.mao.vira = c(cenario.vira);
    estado.mao.manilha = manilhaDaVira(estado.mao.vira);
  }
  if (cenario.maos) {
    estado.mao.cartas = cenario.maos.map((m) => m.map(c)) as EstadoPartida['mao']['cartas'];
  }
  return estado;
}

/** Aplica e exige sucesso. */
export function ok(estado: EstadoPartida, acao: Acao): Extract<Resultado, { ok: true }> {
  const r = aplicarAcao(estado, acao);
  if (!r.ok) throw new Error(`Ação recusada: ${r.erro.codigo} — ${r.erro.mensagem}`);
  return r;
}

/** Joga, na ordem dada, a carta (pela notação) de cada assento. */
export function jogar(estado: EstadoPartida, jogadas: [Assento, string, boolean?][]): ReturnType<typeof ok> {
  let r: ReturnType<typeof ok> = { ok: true, estado, eventos: [] };
  for (const [assento, codigo, encoberta] of jogadas) {
    const alvo = c(codigo);
    const indice = r.estado.mao.cartas[assento].findIndex((x) => x.valor === alvo.valor && x.naipe === alvo.naipe);
    const proximo = ok(r.estado, { tipo: 'JOGAR_CARTA', assento, indice, encoberta });
    r = { ok: true, estado: proximo.estado, eventos: [...r.eventos, ...proximo.eventos] };
  }
  return r;
}
