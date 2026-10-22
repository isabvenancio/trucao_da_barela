import { outraDupla } from '../engine/index.ts';
import type { Acao, Dificuldade, VisaoMesa } from '../engine/index.ts';
import {
  adversarioVenceSeCorrermos,
  forcaNormalizada,
  minhasCartas,
  probabilidadeImbativel,
  situacaoDaRodada,
} from './avaliacao.ts';
import type { Aleatorio, MinhaCarta } from './avaliacao.ts';

type Resposta = 'aceitar' | 'correr' | 'aumentar';

function sortear<T>(itens: readonly T[], aleatorio: Aleatorio): T {
  return itens[Math.floor(aleatorio() * itens.length)] as T;
}

function jogar(visao: VisaoMesa, carta: MinhaCarta | undefined): Acao {
  return { tipo: 'JOGAR_CARTA', assento: visao.assento, indice: carta?.indice ?? 0 };
}

/* ------------------------------------------------------------------ */
/* Escolha da carta                                                     */
/* ------------------------------------------------------------------ */

/** Estratégia de carta compartilhada por médio e difícil. */
function escolherCarta(visao: VisaoMesa, aleatorio: Aleatorio): Acao {
  const cartas = minhasCartas(visao);
  // Mão de ferro: ninguém vê as cartas, qualquer escolha é igual.
  if (cartas.length === 0) return { tipo: 'JOGAR_CARTA', assento: visao.assento, indice: sortear(visao.minhasCartas.map((_, i) => i), aleatorio) };

  const s = situacaoDaRodada(visao);
  const fraca = cartas[0]!;
  const forte = cartas[cartas.length - 1]!;
  const descartar = () => jogar(visao, fraca);

  // Abrindo a rodada.
  if (s.jogadas === 0) {
    if (s.numero === 1 && cartas.length === 3) {
      // Guarda a melhor carta e abre com a do meio.
      return jogar(visao, cartas[1]);
    }
    return jogar(visao, forte);
  }

  // O parceiro já está ganhando: economiza, salvo se a carta dele é fraca e ainda há adversário para jogar.
  if (s.parceiroGanhando) {
    if (s.souUltimo || s.maior >= 7) return descartar();
    const cobre = cartas.find((c) => c.forca > s.maior);
    return cobre && cobre.forca < 100 ? jogar(visao, cobre) : descartar();
  }

  // Adversário ganhando ou mesa empatada: a menor carta que vence.
  const vence = cartas.find((c) => c.forca > s.maior);
  if (vence) return jogar(visao, vence);

  // Não dá para vencer: empatar ainda pode decidir a mão (RN-010).
  const empata = cartas.find((c) => c.forca === s.maior && c.forca < 100);
  if (empata && (s.vitorias > 0 || s.numero === 1)) return jogar(visao, empata);

  return descartar();
}

/* ------------------------------------------------------------------ */
/* Avaliação da mão para truco                                          */
/* ------------------------------------------------------------------ */

/** Médio: soma ponderada das duas melhores cartas e do andamento das rodadas. */
function equidadeMedio(visao: VisaoMesa): number {
  const cartas = minhasCartas(visao).map((c) => forcaNormalizada(c.forca)).sort((a, b) => b - a);
  const s = situacaoDaRodada(visao);
  const e =
    0.45 * (cartas[0] ?? 0) +
    0.3 * (cartas[1] ?? 0) +
    0.25 * (s.vitorias - s.derrotas) +
    (s.parceiroGanhando ? 0.15 : 0) -
    (s.adversarioGanhando ? 0.1 : 0);
  return Math.max(0, Math.min(1, e));
}

/** Difícil: probabilidade de cada carta ser imbatível, considerando cartas já vistas e o andamento. */
function equidadeDificil(visao: VisaoMesa): number {
  const probs = minhasCartas(visao)
    .map((c) => probabilidadeImbativel(c.carta, visao))
    .sort((a, b) => b - a);
  const p1 = probs[0] ?? 0;
  const p2 = probs[1] ?? 0;
  const s = situacaoDaRodada(visao);
  const parceiro = s.parceiroGanhando ? 0.2 : 0.1;
  let e: number;
  if (s.vitorias > s.derrotas) e = 1 - (1 - p1) * (1 - parceiro);
  else if (s.derrotas > s.vitorias) e = p1 * Math.max(p2, parceiro);
  else e = p1 * 0.6 + p2 * 0.25 + parceiro;
  return Math.max(0, Math.min(1, e));
}

function equidade(visao: VisaoMesa, nivel: Dificuldade): number {
  return nivel === 'dificil' ? equidadeDificil(visao) : equidadeMedio(visao);
}

/** Exigência para aceitar cresce com o valor em jogo (3, 6, 9, 12). */
function exigenciaAceitar(visao: VisaoMesa): number {
  const degrau = [3, 6, 9, 12].indexOf(visao.pedido?.valor ?? 3);
  return 0.45 + degrau * 0.05;
}

function responder(visao: VisaoMesa, nivel: Dificuldade): Resposta {
  const podeAumentar = visao.acoes.some((a) => a.tipo === 'RESPONDER_TRUCO' && a.resposta === 'aumentar');
  const e = equidade(visao, nivel);
  // Correr daria a partida ao adversário: não há o que perder.
  if (adversarioVenceSeCorrermos(visao)) return podeAumentar && e > 0.6 ? 'aumentar' : 'aceitar';
  if (podeAumentar && e >= 0.85) return 'aumentar';
  return e >= exigenciaAceitar(visao) ? 'aceitar' : 'correr';
}

/*
 * Blefe, "pagar para ver", abrir com a carta fraca e encobrir no descarte foram testados no
 * simulador e pioraram o difícil (vencia o médio em só 53%); sem eles ele vence em ~61%.
 */
function devePedir(visao: VisaoMesa, nivel: Dificuldade): boolean {
  return equidade(visao, nivel) >= 0.75;
}

/* ------------------------------------------------------------------ */
/* Mão de onze                                                          */
/* ------------------------------------------------------------------ */

function decidirOnze(visao: VisaoMesa, nivel: Dificuldade): 'jogar' | 'correr' {
  const todas = [...visao.minhasCartas, ...(visao.cartasParceiro ?? [])].filter((c) => c !== null);
  const manilhas = todas.filter((c) => c.valor === visao.manilha).length;
  const fortes = todas.filter((c) => c.valor !== visao.manilha && (c.valor === '3' || c.valor === '2')).length;
  if (nivel === 'facil') return manilhas > 0 ? 'jogar' : 'correr';
  const pontos = manilhas * 1.5 + fortes * 0.7;
  const placarAdversario = visao.placar[outraDupla(visao.dupla)];
  const exigencia = nivel === 'dificil' && placarAdversario >= 9 ? 1.8 : 2.2;
  return pontos >= exigencia ? 'jogar' : 'correr';
}

/* ------------------------------------------------------------------ */
/* Estratégias por nível                                                */
/* ------------------------------------------------------------------ */

/** Fácil: joga uma carta aberta qualquer, pede truco raramente e responde no impulso. */
function facil(visao: VisaoMesa, aleatorio: Aleatorio): Acao {
  const a = visao.assento;
  if (visao.decisaoOnze) return { tipo: 'DECIDIR_MAO_DE_ONZE', assento: a, decisao: decidirOnze(visao, 'facil') };
  if (visao.pedido) {
    const r = aleatorio();
    const podeAumentar = visao.acoes.some((x) => x.tipo === 'RESPONDER_TRUCO' && x.resposta === 'aumentar');
    return { tipo: 'RESPONDER_TRUCO', assento: a, resposta: r < 0.1 && podeAumentar ? 'aumentar' : r < 0.6 ? 'aceitar' : 'correr' };
  }
  if (visao.acoes.some((x) => x.tipo === 'PEDIR_TRUCO') && aleatorio() < 0.05) return { tipo: 'PEDIR_TRUCO', assento: a };
  const abertas = visao.acoes.filter((x) => x.tipo === 'JOGAR_CARTA' && !x.encoberta);
  return sortear(abertas, aleatorio);
}

function estrategica(visao: VisaoMesa, nivel: Dificuldade, aleatorio: Aleatorio): Acao {
  const a = visao.assento;
  if (visao.decisaoOnze) return { tipo: 'DECIDIR_MAO_DE_ONZE', assento: a, decisao: decidirOnze(visao, nivel) };
  if (visao.pedido) return { tipo: 'RESPONDER_TRUCO', assento: a, resposta: responder(visao, nivel) };
  if (visao.acoes.some((x) => x.tipo === 'PEDIR_TRUCO') && devePedir(visao, nivel)) {
    return { tipo: 'PEDIR_TRUCO', assento: a };
  }
  return escolherCarta(visao, aleatorio);
}

export function estrategia(visao: VisaoMesa, nivel: Dificuldade, aleatorio: Aleatorio): Acao {
  return nivel === 'facil' ? facil(visao, aleatorio) : estrategica(visao, nivel, aleatorio);
}
