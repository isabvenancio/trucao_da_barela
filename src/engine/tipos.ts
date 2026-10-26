/**
 * Tipos do motor de regras do truco paulista.
 * O motor é puro (RNF-008): sem React, rede ou navegador.
 */

export type Naipe = 'ouros' | 'espadas' | 'copas' | 'paus';
export type Valor = '4' | '5' | '6' | '7' | 'Q' | 'J' | 'K' | 'A' | '2' | '3';

export interface Carta {
  valor: Valor;
  naipe: Naipe;
}

/** Assentos em sentido anti-horário. Parceiros: 0–2 (dupla 0) e 1–3 (dupla 1). RN-005 */
export type Assento = 0 | 1 | 2 | 3;
export type Dupla = 0 | 1;

export type TipoParticipante = 'humano' | 'bot';
export type Dificuldade = 'facil' | 'medio' | 'dificil';

export interface Participante {
  nome: string;
  avatar: string;
  tipo: TipoParticipante;
  dificuldade?: Dificuldade;
}

/** normal; onze = só uma dupla com 11 (RN-015); ferro = ambas com 11 (RN-016) */
export type TipoMao = 'normal' | 'onze' | 'ferro';

export type ValorPedido = 3 | 6 | 9 | 12;

/** RN-027: sinais ao parceiro. */
export type Sinal = 'zap' | 'copas' | 'espadilha' | 'picafumo' | 'tres' | 'dois' | 'as' | 'nada' | 'truca';

export interface SinalFeito {
  assento: Assento;
  sinal: Sinal;
  rodada: number;
}

export interface CartaJogada {
  assento: Assento;
  carta: Carta;
  encoberta: boolean;
}

export type ResultadoRodada = Dupla | 'empate';

export interface Rodada {
  iniciante: Assento;
  jogadas: CartaJogada[];
  resultado?: ResultadoRodada;
  /** Assento que jogou a carta vencedora (ausente em empate). */
  vencedor?: Assento;
}

export interface PedidoTruco {
  solicitante: Assento;
  dupla: Dupla;
  valor: ValorPedido;
  respondente: Assento;
}

export interface DecisaoOnze {
  dupla: Dupla;
  decisor: Assento;
}

export type MotivoFimMao = 'rodadas' | 'correu-truco' | 'correu-onze' | 'empate-total';

export interface ResultadoMao {
  vencedora: Dupla | null;
  pontos: number;
  motivo: MotivoFimMao;
}

export interface EstadoMao {
  numero: number;
  carteador: Assento;
  tipo: TipoMao;
  /** Cartas ainda na mão de cada assento. */
  cartas: [Carta[], Carta[], Carta[], Carta[]];
  vira: Carta;
  manilha: Valor;
  /** Valor vigente da mão (RN-012). */
  valor: number;
  rodadas: Rodada[];
  vez: Assento;
  pedido?: PedidoTruco;
  /** Dupla do último pedido aceito; ela não pode aumentar o próprio pedido (RN-013). */
  ultimaDuplaQuePediu?: Dupla;
  decisaoOnze?: DecisaoOnze;
  resultado?: ResultadoMao;
  /** RN-027: sinais feitos nesta mão; a visão filtra pela dupla. */
  sinais?: SinalFeito[];
}

export type FasePartida = 'jogando' | 'encerrada';

export interface EstadoPartida {
  participantes: [Participante, Participante, Participante, Participante];
  placar: [number, number];
  fase: FasePartida;
  vencedora?: Dupla;
  mao: EstadoMao;
  /** Estado do gerador pseudoaleatório. Nunca sai do servidor no modo online (RNF-002). */
  rng: number;
  versao: number;
}

export type Acao =
  | { tipo: 'JOGAR_CARTA'; assento: Assento; indice: number; encoberta?: boolean }
  | { tipo: 'PEDIR_TRUCO'; assento: Assento }
  | { tipo: 'RESPONDER_TRUCO'; assento: Assento; resposta: 'aceitar' | 'correr' | 'aumentar' }
  | { tipo: 'DECIDIR_MAO_DE_ONZE'; assento: Assento; decisao: 'jogar' | 'correr' }
  | { tipo: 'SINALIZAR'; assento: Assento; sinal: Sinal };

export type Evento =
  | { tipo: 'MAO_DISTRIBUIDA'; numero: number; carteador: Assento; vira: Carta; manilha: Valor; tipoMao: TipoMao }
  | { tipo: 'DECISAO_ONZE_PENDENTE'; dupla: Dupla; decisor: Assento }
  | { tipo: 'ONZE_DECIDIDA'; dupla: Dupla; decisao: 'jogar' | 'correr' }
  /** `carta` é `null` apenas na versão filtrada para quem não pode ver a carta encoberta (RN-018). */
  | { tipo: 'CARTA_JOGADA'; assento: Assento; carta: Carta | null; encoberta: boolean; manilha: boolean; zap: boolean }
  | { tipo: 'RODADA_ENCERRADA'; numero: number; resultado: ResultadoRodada; vencedor?: Assento }
  | { tipo: 'TRUCO_PEDIDO'; assento: Assento; dupla: Dupla; valor: ValorPedido; respondente: Assento }
  | { tipo: 'TRUCO_RESPONDIDO'; assento: Assento; resposta: 'aceitar' | 'correr' | 'aumentar'; valor: number }
  | { tipo: 'MAO_ENCERRADA'; vencedora: Dupla | null; pontos: number; motivo: MotivoFimMao; placar: [number, number] }
  | { tipo: 'PARTIDA_ENCERRADA'; vencedora: Dupla; placar: [number, number] }
  | { tipo: 'SINAL_ENVIADO'; assento: Assento; sinal: Sinal };

export type CodigoErro =
  | 'PARTIDA_ENCERRADA'
  | 'FORA_DA_VEZ'
  | 'DECISAO_PENDENTE'
  | 'CARTA_INVALIDA'
  | 'ENCOBERTA_PROIBIDA'
  | 'TRUCO_PROIBIDO'
  | 'SEM_PEDIDO'
  | 'NAO_E_RESPONDENTE'
  | 'AUMENTO_PROIBIDO'
  | 'SEM_DECISAO_ONZE'
  | 'NAO_E_DECISOR'
  | 'SINAL_PROIBIDO';

export interface ErroRegra {
  codigo: CodigoErro;
  mensagem: string;
}

export type Resultado =
  | { ok: true; estado: EstadoPartida; eventos: Evento[] }
  | { ok: false; erro: ErroRegra };
