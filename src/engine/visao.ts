import { duplaDe, parceiroDe } from './mesa.ts';
import { acoesValidas, assentoDaVez } from './partida.ts';
import { sinaisDisponiveis, sinaisVisiveis } from './sinais.ts';
import type {
  Acao,
  Assento,
  Carta,
  DecisaoOnze,
  Dupla,
  EstadoPartida,
  Evento,
  FasePartida,
  Participante,
  PedidoTruco,
  ResultadoRodada,
  Sinal,
  SinalFeito,
  TipoMao,
  Valor,
} from './tipos.ts';

/** Carta vista por um assento: `null` quando ele não pode saber qual é (RN-018). */
export interface JogadaVisivel {
  assento: Assento;
  carta: Carta | null;
  encoberta: boolean;
}

export interface RodadaVisivel {
  iniciante: Assento;
  jogadas: JogadaVisivel[];
  resultado?: ResultadoRodada;
  vencedor?: Assento;
}

export interface VisaoMesa {
  assento: Assento;
  dupla: Dupla;
  participantes: Participante[];
  placar: [number, number];
  fase: FasePartida;
  vencedora?: Dupla;
  numeroMao: number;
  carteador: Assento;
  tipoMao: TipoMao;
  vira: Carta;
  manilha: Valor;
  valorMao: number;
  /** Suas cartas; na mão de ferro, `null` em cada posição (RN-016). */
  minhasCartas: (Carta | null)[];
  /** Só durante a decisão da mão de onze, para a dupla com 11 (RN-015). */
  cartasParceiro?: Carta[];
  quantidadeCartas: [number, number, number, number];
  rodadas: RodadaVisivel[];
  vez: Assento;
  aguardando?: Assento;
  pedido?: PedidoTruco;
  decisaoOnze?: DecisaoOnze;
  acoes: Acao[];
  /** RN-027: sinais do parceiro nesta mão (nunca os da dupla adversária). */
  sinaisDoParceiro: SinalFeito[];
  meusSinais: Sinal[];
  sinaisDisponiveis: Sinal[];
  versao: number;
}

/**
 * RN-018: gera tudo o que um assento pode saber — e nada além disso.
 * É a única forma de estado que sai do servidor no modo online e que os bots recebem (RN-019, RNF-002).
 */
export function visaoDoAssento(estado: EstadoPartida, assento: Assento): VisaoMesa {
  const mao = estado.mao;
  const ferro = mao.tipo === 'ferro';
  const onzePendenteMinhaDupla = mao.decisaoOnze !== undefined && mao.decisaoOnze.dupla === duplaDe(assento);

  const visao: VisaoMesa = {
    assento,
    dupla: duplaDe(assento),
    participantes: structuredClone(estado.participantes),
    placar: [estado.placar[0], estado.placar[1]],
    fase: estado.fase,
    numeroMao: mao.numero,
    carteador: mao.carteador,
    tipoMao: mao.tipo,
    vira: { ...mao.vira },
    manilha: mao.manilha,
    valorMao: mao.valor,
    minhasCartas: mao.cartas[assento].map((c) => (ferro ? null : { ...c })),
    quantidadeCartas: [mao.cartas[0].length, mao.cartas[1].length, mao.cartas[2].length, mao.cartas[3].length],
    rodadas: mao.rodadas.map((r) => ({
      iniciante: r.iniciante,
      resultado: r.resultado,
      vencedor: r.vencedor,
      jogadas: r.jogadas.map((j) => ({
        assento: j.assento,
        encoberta: j.encoberta,
        carta: j.encoberta && j.assento !== assento ? null : { ...j.carta },
      })),
    })),
    vez: mao.vez,
    aguardando: assentoDaVez(estado),
    acoes: acoesValidas(estado, assento),
    sinaisDoParceiro: sinaisVisiveis(estado, assento).filter((s) => s.assento !== assento).map((s) => ({ ...s })),
    meusSinais: sinaisVisiveis(estado, assento).filter((s) => s.assento === assento).map((s) => s.sinal),
    sinaisDisponiveis: sinaisDisponiveis(estado, assento),
    versao: estado.versao,
  };
  if (estado.vencedora !== undefined) visao.vencedora = estado.vencedora;
  if (mao.pedido) visao.pedido = { ...mao.pedido };
  if (mao.decisaoOnze) visao.decisaoOnze = { ...mao.decisaoOnze };
  if (onzePendenteMinhaDupla) visao.cartasParceiro = mao.cartas[parceiroDe(assento)].map((c) => ({ ...c }));
  return visao;
}

/** Remove dos eventos o que o assento não pode saber: carta encoberta alheia e sinais da outra dupla. */
export function eventosParaAssento(eventos: readonly Evento[], assento: Assento): Evento[] {
  return eventos.filter((e) => e.tipo !== 'SINAL_ENVIADO' || duplaDe(e.assento) === duplaDe(assento)).map((e) => {
    if (e.tipo === 'CARTA_JOGADA' && e.encoberta && e.assento !== assento) {
      return { ...e, carta: null, manilha: false, zap: false };
    }
    return e;
  });
}
