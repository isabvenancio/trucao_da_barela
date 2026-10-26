import { criarBaralho, ehManilha, ehZap, manilhaDaVira } from './baralho.ts';
import { duplaDe, ordemAPartirDe, outraDupla, proximoAssento } from './mesa.ts';
import { embaralhar, inteiro } from './rng.ts';
import { inicianteDaProxima, resultadoDaRodada, vencedorDaMao } from './rodada.ts';
import { motivoSinalProibido } from './sinais.ts';
import { motivoTrucoProibido, proximoValorPedido, respondenteDe } from './truco.ts';
import type {
  Acao,
  Assento,
  Carta,
  CodigoErro,
  Dupla,
  EstadoMao,
  EstadoPartida,
  Evento,
  MotivoFimMao,
  Participante,
  Resultado,
  Sinal,
  TipoMao,
} from './tipos.ts';

export const PONTOS_PARA_VENCER = 12;

export interface OpcoesPartida {
  participantes: EstadoPartida['participantes'];
  semente: number;
  /** Se omitido, é sorteado (RN-006). */
  carteadorInicial?: Assento;
  /** Para retomar partidas e montar cenários de teste. Padrão 0×0. */
  placarInicial?: [number, number];
}

export function criarPartida(opcoes: OpcoesPartida): { estado: EstadoPartida; eventos: Evento[] } {
  let rng = opcoes.semente | 0;
  let carteador = opcoes.carteadorInicial;
  if (carteador === undefined) {
    const sorteio = inteiro(rng, 4);
    rng = sorteio.estado;
    carteador = sorteio.valor as Assento;
  }
  const estado = {
    participantes: opcoes.participantes,
    placar: opcoes.placarInicial ? [...opcoes.placarInicial] : [0, 0],
    fase: 'jogando',
    rng,
    versao: 0,
  } as Omit<EstadoPartida, 'mao'> as EstadoPartida;
  const eventos: Evento[] = [];
  distribuir(estado, carteador, 1, eventos);
  return { estado, eventos };
}

/** RN-026: revanche com as mesmas duplas, placar zerado e novo sorteio do carteador. */
export function criarRevanche(anterior: EstadoPartida, semente?: number): { estado: EstadoPartida; eventos: Evento[] } {
  return criarPartida({
    participantes: structuredClone(anterior.participantes),
    semente: semente ?? anterior.rng,
  });
}

/** RN-015: decide o primeiro humano da dupla na ordem de jogo; se não houver humano, o primeiro bot. */
function decisorDaMaoDeOnze(participantes: Participante[], dupla: Dupla, primeiroAJogar: Assento): Assento {
  const daDupla = ordemAPartirDe(primeiroAJogar).filter((a) => duplaDe(a) === dupla);
  return daDupla.find((a) => participantes[a]?.tipo === 'humano') ?? (daDupla[0] as Assento);
}

/** RN-001, RN-003, RN-006, RN-015, RN-016: prepara uma nova mão. */
function distribuir(estado: EstadoPartida, carteador: Assento, numero: number, eventos: Evento[]): void {
  const embaralhado = embaralhar(criarBaralho(), estado.rng);
  estado.rng = embaralhado.estado;
  const monte = embaralhado.itens;

  const primeiro = proximoAssento(carteador);
  const cartas: EstadoMao['cartas'] = [[], [], [], []];
  for (let volta = 0; volta < 3; volta++) {
    for (const assento of ordemAPartirDe(primeiro)) cartas[assento].push(monte.pop() as Carta);
  }
  const vira = monte.pop() as Carta;
  const manilha = manilhaDaVira(vira);

  const comOnze = ([0, 1] as Dupla[]).filter((d) => estado.placar[d] === PONTOS_PARA_VENCER - 1);
  let tipo: TipoMao = 'normal';
  if (comOnze.length === 2) tipo = 'ferro';
  else if (comOnze.length === 1) tipo = 'onze';

  const mao: EstadoMao = {
    numero,
    carteador,
    tipo,
    cartas,
    vira,
    manilha,
    valor: tipo === 'onze' ? 3 : 1,
    rodadas: [{ iniciante: primeiro, jogadas: [] }],
    vez: primeiro,
  };
  estado.mao = mao;
  eventos.push({ tipo: 'MAO_DISTRIBUIDA', numero, carteador, vira, manilha, tipoMao: tipo });

  if (tipo === 'onze') {
    const dupla = comOnze[0] as Dupla;
    const decisor = decisorDaMaoDeOnze(estado.participantes, dupla, primeiro);
    mao.decisaoOnze = { dupla, decisor };
    eventos.push({ tipo: 'DECISAO_ONZE_PENDENTE', dupla, decisor });
  }
}

/** RN-017: soma os pontos, verifica vitória e prepara a próxima mão. */
function encerrarMao(
  estado: EstadoPartida,
  vencedora: Dupla | null,
  pontos: number,
  motivo: MotivoFimMao,
  eventos: Evento[],
): void {
  const mao = estado.mao;
  mao.resultado = { vencedora, pontos: vencedora === null ? 0 : pontos, motivo };
  mao.pedido = undefined;
  if (vencedora !== null) estado.placar[vencedora] += pontos;
  const placar: [number, number] = [estado.placar[0], estado.placar[1]];
  eventos.push({ tipo: 'MAO_ENCERRADA', vencedora, pontos: mao.resultado.pontos, motivo, placar });

  if (vencedora !== null && estado.placar[vencedora] >= PONTOS_PARA_VENCER) {
    estado.fase = 'encerrada';
    estado.vencedora = vencedora;
    eventos.push({ tipo: 'PARTIDA_ENCERRADA', vencedora, placar });
    return;
  }
  distribuir(estado, proximoAssento(mao.carteador), mao.numero + 1, eventos);
}

function erro(codigo: CodigoErro, mensagem: string): Resultado {
  return { ok: false, erro: { codigo, mensagem } };
}

/**
 * Aplica uma ação ao estado e devolve um NOVO estado (o original não é alterado).
 * Ações inválidas são recusadas sem efeito (RN-008, RNF-001).
 */
export function aplicarAcao(anterior: EstadoPartida, acao: Acao): Resultado {
  if (anterior.fase === 'encerrada') return erro('PARTIDA_ENCERRADA', 'A partida já terminou.');
  const estado = structuredClone(anterior);
  const eventos: Evento[] = [];
  let falha: Resultado | undefined;

  switch (acao.tipo) {
    case 'JOGAR_CARTA':
      falha = jogarCarta(estado, acao.assento, acao.indice, acao.encoberta ?? false, eventos);
      break;
    case 'PEDIR_TRUCO':
      falha = pedirTruco(estado, acao.assento, eventos);
      break;
    case 'RESPONDER_TRUCO':
      falha = responderTruco(estado, acao.assento, acao.resposta, eventos);
      break;
    case 'DECIDIR_MAO_DE_ONZE':
      falha = decidirOnze(estado, acao.assento, acao.decisao, eventos);
      break;
    case 'SINALIZAR':
      falha = sinalizar(estado, acao.assento, acao.sinal, eventos);
      break;
    default:
      return erro('CARTA_INVALIDA', 'Ação desconhecida.');
  }
  if (falha) return falha;
  estado.versao += 1;
  return { ok: true, estado, eventos };
}

/** RN-007 a RN-011, RN-016: jogada de carta e resultados de rodada e mão. */
function jogarCarta(
  estado: EstadoPartida,
  assento: Assento,
  indice: number,
  encoberta: boolean,
  eventos: Evento[],
): Resultado | undefined {
  const mao = estado.mao;
  if (mao.pedido) return erro('DECISAO_PENDENTE', 'Responda o pedido de truco antes de jogar.');
  if (mao.decisaoOnze) return erro('DECISAO_PENDENTE', 'Aguardando a decisão da mão de onze.');
  if (mao.vez !== assento) return erro('FORA_DA_VEZ', 'Não é a sua vez.');

  const naMao = mao.cartas[assento];
  if (!Number.isInteger(indice) || indice < 0 || indice >= naMao.length) {
    return erro('CARTA_INVALIDA', 'Essa carta não está na sua mão.');
  }
  const numeroRodada = mao.rodadas.length;
  if (encoberta && numeroRodada === 1) return erro('ENCOBERTA_PROIBIDA', 'Não pode encobrir na primeira rodada.');
  if (encoberta && mao.tipo === 'ferro') return erro('ENCOBERTA_PROIBIDA', 'Não pode encobrir na mão de ferro.');

  const [carta] = naMao.splice(indice, 1) as [Carta];
  const rodada = mao.rodadas[numeroRodada - 1]!;
  rodada.jogadas.push({ assento, carta, encoberta });
  eventos.push({
    tipo: 'CARTA_JOGADA',
    assento,
    carta,
    encoberta,
    manilha: !encoberta && ehManilha(carta, mao.manilha),
    zap: !encoberta && ehZap(carta, mao.manilha),
  });

  if (rodada.jogadas.length < 4) {
    mao.vez = proximoAssento(assento);
    return undefined;
  }

  const { resultado, vencedor } = resultadoDaRodada(rodada, mao.manilha);
  rodada.resultado = resultado;
  if (vencedor !== undefined) rodada.vencedor = vencedor;
  eventos.push({ tipo: 'RODADA_ENCERRADA', numero: numeroRodada, resultado, vencedor });

  const decisao = vencedorDaMao(mao.rodadas.map((r) => r.resultado!));
  if (decisao === undefined) {
    const iniciante = inicianteDaProxima(rodada);
    mao.rodadas.push({ iniciante, jogadas: [] });
    mao.vez = iniciante;
  } else if (decisao === 'empate') {
    encerrarMao(estado, null, 0, 'empate-total', eventos);
  } else {
    encerrarMao(estado, decisao, mao.valor, 'rodadas', eventos);
  }
  return undefined;
}

/** RN-012, RN-013 */
function pedirTruco(estado: EstadoPartida, assento: Assento, eventos: Evento[]): Resultado | undefined {
  const mao = estado.mao;
  const motivo = motivoTrucoProibido(mao, assento);
  if (motivo) return erro('TRUCO_PROIBIDO', motivo);
  const valor = proximoValorPedido(mao.valor)!;
  const dupla = duplaDe(assento);
  const respondente = respondenteDe(assento);
  mao.pedido = { solicitante: assento, dupla, valor, respondente };
  eventos.push({ tipo: 'TRUCO_PEDIDO', assento, dupla, valor, respondente });
  return undefined;
}

/** RN-012, RN-014 */
function responderTruco(
  estado: EstadoPartida,
  assento: Assento,
  resposta: 'aceitar' | 'correr' | 'aumentar',
  eventos: Evento[],
): Resultado | undefined {
  const mao = estado.mao;
  const pedido = mao.pedido;
  if (!pedido) return erro('SEM_PEDIDO', 'Não há pedido de truco para responder.');
  if (pedido.respondente !== assento) return erro('NAO_E_RESPONDENTE', 'Este pedido é para outro jogador responder.');

  if (resposta === 'correr') {
    eventos.push({ tipo: 'TRUCO_RESPONDIDO', assento, resposta, valor: mao.valor });
    // O solicitante ganha o valor vigente ANTES do pedido.
    encerrarMao(estado, pedido.dupla, mao.valor, 'correu-truco', eventos);
    return undefined;
  }

  if (resposta === 'aumentar') {
    const proximo = proximoValorPedido(pedido.valor);
    if (proximo === undefined) return erro('AUMENTO_PROIBIDO', 'A mão já vale 12.');
    mao.valor = pedido.valor;
    mao.ultimaDuplaQuePediu = pedido.dupla;
    const dupla = duplaDe(assento);
    const respondente = respondenteDe(assento);
    mao.pedido = { solicitante: assento, dupla, valor: proximo, respondente };
    eventos.push({ tipo: 'TRUCO_RESPONDIDO', assento, resposta, valor: mao.valor });
    eventos.push({ tipo: 'TRUCO_PEDIDO', assento, dupla, valor: proximo, respondente });
    return undefined;
  }

  mao.valor = pedido.valor;
  mao.ultimaDuplaQuePediu = pedido.dupla;
  mao.pedido = undefined;
  eventos.push({ tipo: 'TRUCO_RESPONDIDO', assento, resposta, valor: mao.valor });
  return undefined;
}

/** RN-015 */
function decidirOnze(
  estado: EstadoPartida,
  assento: Assento,
  decisao: 'jogar' | 'correr',
  eventos: Evento[],
): Resultado | undefined {
  const mao = estado.mao;
  const pendente = mao.decisaoOnze;
  if (!pendente) return erro('SEM_DECISAO_ONZE', 'Não há decisão de mão de onze pendente.');
  if (pendente.decisor !== assento) return erro('NAO_E_DECISOR', 'Quem decide a mão de onze é outro jogador.');

  mao.decisaoOnze = undefined;
  eventos.push({ tipo: 'ONZE_DECIDIDA', dupla: pendente.dupla, decisao });
  if (decisao === 'correr') encerrarMao(estado, outraDupla(pendente.dupla), 1, 'correu-onze', eventos);
  return undefined;
}

/** RN-027: o sinal só fica registrado; não muda a vez nem o valor da mão. */
function sinalizar(estado: EstadoPartida, assento: Assento, sinal: Sinal, eventos: Evento[]): Resultado | undefined {
  const motivo = motivoSinalProibido(estado, assento, sinal);
  if (motivo) return erro('SINAL_PROIBIDO', motivo);
  const mao = estado.mao;
  mao.sinais = [...(mao.sinais ?? []), { assento, sinal, rodada: mao.rodadas.length }];
  eventos.push({ tipo: 'SINAL_ENVIADO', assento, sinal });
  return undefined;
}

/** Ações de jogo que o assento pode realizar agora — usado pela interface e pelos bots (RF-021, RF-022). Sinais ficam de fora: veja `sinaisDisponiveis`. */
export function acoesValidas(estado: EstadoPartida, assento: Assento): Acao[] {
  if (estado.fase === 'encerrada') return [];
  const mao = estado.mao;

  if (mao.decisaoOnze) {
    if (mao.decisaoOnze.decisor !== assento) return [];
    return [
      { tipo: 'DECIDIR_MAO_DE_ONZE', assento, decisao: 'jogar' },
      { tipo: 'DECIDIR_MAO_DE_ONZE', assento, decisao: 'correr' },
    ];
  }

  if (mao.pedido) {
    if (mao.pedido.respondente !== assento) return [];
    const acoes: Acao[] = [
      { tipo: 'RESPONDER_TRUCO', assento, resposta: 'aceitar' },
      { tipo: 'RESPONDER_TRUCO', assento, resposta: 'correr' },
    ];
    if (proximoValorPedido(mao.pedido.valor) !== undefined) {
      acoes.push({ tipo: 'RESPONDER_TRUCO', assento, resposta: 'aumentar' });
    }
    return acoes;
  }

  if (mao.vez !== assento) return [];
  const acoes: Acao[] = [];
  const podeEncobrir = mao.rodadas.length > 1 && mao.tipo !== 'ferro';
  mao.cartas[assento].forEach((_, indice) => {
    acoes.push({ tipo: 'JOGAR_CARTA', assento, indice });
    if (podeEncobrir) acoes.push({ tipo: 'JOGAR_CARTA', assento, indice, encoberta: true });
  });
  if (!motivoTrucoProibido(mao, assento)) acoes.push({ tipo: 'PEDIR_TRUCO', assento });
  return acoes;
}

/** De quem é a próxima decisão (jogada, resposta ou mão de onze). */
export function assentoDaVez(estado: EstadoPartida): Assento | undefined {
  if (estado.fase === 'encerrada') return undefined;
  const mao = estado.mao;
  if (mao.decisaoOnze) return mao.decisaoOnze.decisor;
  if (mao.pedido) return mao.pedido.respondente;
  return mao.vez;
}
