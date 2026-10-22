import { describe, expect, it } from 'vitest';
import { nomeCarta } from '../baralho.ts';
import { acoesValidas, aplicarAcao, assentoDaVez, criarPartida, criarRevanche } from '../partida.ts';
import type { Acao, Assento, EstadoPartida } from '../tipos.ts';
import { jogar, mesa, ok, participantes } from './ajudantes.ts';

/** Primeira mão com carteador 3: joga primeiro o assento 0. Vira 7 → manilha Q. */
const MAOS_PADRAO: [string[], string[], string[], string[]] = [
  ['3o', 'Ko', '4o'],
  ['2e', 'Je', '5e'],
  ['Ac', '7c', '6c'],
  ['Qp', '4p', '5p'],
];

describe('RN-005 - Duplas e assentos', () => {
  it('a vez passa no sentido anti-horário: 0 → 1 → 2 → 3', () => {
    let e = mesa({ vira: '7o', maos: MAOS_PADRAO });
    const ordem: Assento[] = [];
    for (let i = 0; i < 4; i++) {
      ordem.push(e.mao.vez);
      e = ok(e, { tipo: 'JOGAR_CARTA', assento: e.mao.vez, indice: 0 }).estado;
    }
    expect(ordem).toEqual([0, 1, 2, 3]);
  });
});

describe('RN-006 - Distribuição e rodízio do carteador (CT-009.1, CT-009.2)', () => {
  it('cada um recebe 3 cartas distintas, diferentes da vira, e a vira define a manilha', () => {
    const { estado, eventos } = criarPartida({ participantes: participantes(), semente: 7 });
    const todas = [...estado.mao.cartas.flat(), estado.mao.vira].map(nomeCarta);
    expect(estado.mao.cartas.every((m) => m.length === 3)).toBe(true);
    expect(new Set(todas).size).toBe(13);
    expect(eventos[0]).toMatchObject({ tipo: 'MAO_DISTRIBUIDA', numero: 1, manilha: estado.mao.manilha });
  });

  it('a mesma semente reproduz a mesma distribuição', () => {
    const a = criarPartida({ participantes: participantes(), semente: 123 }).estado.mao;
    const b = criarPartida({ participantes: participantes(), semente: 123 }).estado.mao;
    expect(a).toEqual(b);
  });

  it('carteador 2 → começa o 3; na mão seguinte carteador 3 e começa o 0', () => {
    let e = mesa({ carteador: 2, vira: '7o', maos: [['4o', '5o', '6o'], ['3e', '2e', 'Ae'], ['4c', '5c', '6c'], ['3p', '2p', 'Ap']] });
    expect(e.mao.vez).toBe(3);
    // Dupla 1 vence duas rodadas e encerra a mão.
    e = jogar(e, [[3, '3p'], [0, '4o'], [1, '3e'], [2, '4c']]).estado; // empate? 3p e 3e são da mesma dupla → dupla 1
    e = jogar(e, [[3, '2p'], [0, '5o'], [1, '2e'], [2, '5c']]).estado;
    expect(e.mao.numero).toBe(2);
    expect(e.mao.carteador).toBe(3);
    expect(e.mao.vez).toBe(0);
  });
});

describe('RN-007 e RN-008 - Ordem de jogo e jogada válida (CT-010.1)', () => {
  it('recusa jogada fora da vez sem alterar o estado', () => {
    const e = mesa({ vira: '7o', maos: MAOS_PADRAO });
    const r = aplicarAcao(e, { tipo: 'JOGAR_CARTA', assento: 1, indice: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro.codigo).toBe('FORA_DA_VEZ');
    expect(e.mao.rodadas[0]!.jogadas).toHaveLength(0);
  });

  it('recusa índice de carta inexistente', () => {
    const e = mesa({ vira: '7o', maos: MAOS_PADRAO });
    for (const indice of [3, -1, 1.5]) {
      const r = aplicarAcao(e, { tipo: 'JOGAR_CARTA', assento: 0, indice });
      expect(r.ok ? 'ok' : r.erro.codigo).toBe('CARTA_INVALIDA');
    }
  });

  it('não altera o estado original (função pura)', () => {
    const e = mesa({ vira: '7o', maos: MAOS_PADRAO });
    const copia = structuredClone(e);
    ok(e, { tipo: 'JOGAR_CARTA', assento: 0, indice: 0 });
    expect(e).toEqual(copia);
  });

  it('quem vence a rodada inicia a próxima', () => {
    // manilha Q: 2e (assento 1) vence
    const r = jogar(mesa({ vira: '7o', maos: MAOS_PADRAO }), [[0, 'Ko'], [1, '2e'], [2, '7c'], [3, '4p']]);
    expect(r.estado.mao.vez).toBe(1);
    expect(r.eventos).toContainEqual({ tipo: 'RODADA_ENCERRADA', numero: 1, resultado: 1, vencedor: 1 });
  });

  it('em empate, a próxima rodada começa com quem iniciou a empatada', () => {
    const r = jogar(mesa({ vira: '7o', maos: [['3o', 'Ko', '4o'], ['3e', 'Je', '5e'], ['Ac', '7c', '6c'], ['Ap', '4p', '5p']] }), [
      [0, '3o'], [1, '3e'], [2, 'Ac'], [3, 'Ap'],
    ]);
    expect(r.estado.mao.rodadas[0]!.resultado).toBe('empate');
    expect(r.estado.mao.vez).toBe(0);
  });
});

describe('RN-010 e RN-017 - Fim da mão e pontuação', () => {
  it('dupla que vence duas rodadas leva o valor da mão e a mão termina sem a 3ª', () => {
    const r = jogar(mesa({ vira: '7o', maos: MAOS_PADRAO }), [
      [0, '3o'], [1, '5e'], [2, '6c'], [3, '4p'], // dupla 0 (3o)
      [0, 'Ko'], [1, 'Je'], [2, 'Ac'], [3, '5p'], // dupla 0 (Ac)
    ]);
    expect(r.eventos).toContainEqual({ tipo: 'MAO_ENCERRADA', vencedora: 0, pontos: 1, motivo: 'rodadas', placar: [1, 0] });
    expect(r.estado.mao.numero).toBe(2);
  });

  it('três empates: ninguém pontua e uma nova mão é distribuída', () => {
    const r = jogar(mesa({ vira: '7o', maos: [['3o', '2o', 'Ao'], ['3e', '2e', 'Ae'], ['4c', '5c', '6c'], ['4p', '5p', '6p']] }), [
      [0, '3o'], [1, '3e'], [2, '4c'], [3, '4p'],
      [0, '2o'], [1, '2e'], [2, '5c'], [3, '5p'],
      [0, 'Ao'], [1, 'Ae'], [2, '6c'], [3, '6p'],
    ]);
    expect(r.eventos).toContainEqual({ tipo: 'MAO_ENCERRADA', vencedora: null, pontos: 0, motivo: 'empate-total', placar: [0, 0] });
    expect(r.estado.placar).toEqual([0, 0]);
  });

  it('dupla com 10 vence mão de truco (3) → 13 e a partida termina', () => {
    let e = mesa({ placar: [10, 4], vira: '7o', maos: MAOS_PADRAO });
    e = ok(e, { tipo: 'PEDIR_TRUCO', assento: 0 }).estado;
    e = ok(e, { tipo: 'RESPONDER_TRUCO', assento: 1, resposta: 'aceitar' }).estado;
    const r = jogar(e, [
      [0, '3o'], [1, '5e'], [2, '6c'], [3, '4p'],
      [0, 'Ko'], [1, 'Je'], [2, 'Ac'], [3, '5p'],
    ]);
    expect(r.estado.fase).toBe('encerrada');
    expect(r.estado.vencedora).toBe(0);
    expect(r.eventos.at(-1)).toEqual({ tipo: 'PARTIDA_ENCERRADA', vencedora: 0, placar: [13, 4] });
    expect(aplicarAcao(r.estado, { tipo: 'PEDIR_TRUCO', assento: 0 }).ok).toBe(false);
    expect(acoesValidas(r.estado, 0)).toEqual([]);
    expect(assentoDaVez(r.estado)).toBeUndefined();
  });
});

describe('RN-011 - Carta encoberta (CT-010.3)', () => {
  it('é proibida na 1ª rodada', () => {
    const r = aplicarAcao(mesa({ vira: '7o', maos: MAOS_PADRAO }), { tipo: 'JOGAR_CARTA', assento: 0, indice: 0, encoberta: true });
    expect(r.ok ? 'ok' : r.erro.codigo).toBe('ENCOBERTA_PROIBIDA');
  });

  it('na 2ª rodada um 3 encoberto perde para um 4 aberto', () => {
    const r = jogar(mesa({ vira: '7o', maos: [['5o', '3o', '6o'], ['Ke', '4e', '5e'], ['Ac', '7c', '6c'], ['Qp', '4p', '5p']] }), [
      [0, '5o'], [1, 'Ke'], [2, '6c'], [3, '4p'], // dupla 1 (K) — vence o 1
      [1, '4e'], [2, '7c', true], [3, '5p', true], [0, '3o', true],
    ]);
    expect(r.estado.placar).toEqual([0, 1]);
  });
});

describe('RN-012, RN-013 e RN-014 - Truco', () => {
  it('escada 1 → 3 → 6 → 9 → 12 e nada além de 12', () => {
    let e = mesa({ vira: '7o', maos: MAOS_PADRAO });
    e = ok(e, { tipo: 'PEDIR_TRUCO', assento: 0 }).estado;
    expect(e.mao.pedido).toMatchObject({ valor: 3, respondente: 1 });
    e = ok(e, { tipo: 'RESPONDER_TRUCO', assento: 1, resposta: 'aumentar' }).estado; // seis
    expect(e.mao.valor).toBe(3);
    expect(e.mao.pedido).toMatchObject({ valor: 6, dupla: 1, respondente: 2 });
    e = ok(e, { tipo: 'RESPONDER_TRUCO', assento: 2, resposta: 'aumentar' }).estado; // nove
    e = ok(e, { tipo: 'RESPONDER_TRUCO', assento: 3, resposta: 'aumentar' }).estado; // doze
    expect(e.mao.pedido).toMatchObject({ valor: 12, respondente: 0 });
    const semAumento = aplicarAcao(e, { tipo: 'RESPONDER_TRUCO', assento: 0, resposta: 'aumentar' });
    expect(semAumento.ok ? 'ok' : semAumento.erro.codigo).toBe('AUMENTO_PROIBIDO');
    e = ok(e, { tipo: 'RESPONDER_TRUCO', assento: 0, resposta: 'aceitar' }).estado;
    expect(e.mao.valor).toBe(12);
    expect(aplicarAcao(e, { tipo: 'PEDIR_TRUCO', assento: 0 }).ok).toBe(false);
  });

  it('a mesma dupla não aumenta o próprio pedido (CT-011.1)', () => {
    let e = mesa({ vira: '7o', maos: MAOS_PADRAO });
    e = ok(e, { tipo: 'PEDIR_TRUCO', assento: 0 }).estado;
    e = ok(e, { tipo: 'RESPONDER_TRUCO', assento: 1, resposta: 'aceitar' }).estado;
    e = jogar(e, [[0, '4o'], [1, '5e']]).estado;
    // vez do assento 2 (dupla 0, que fez o último pedido aceito)
    const r = aplicarAcao(e, { tipo: 'PEDIR_TRUCO', assento: 2 });
    expect(r.ok ? 'ok' : r.erro.codigo).toBe('TRUCO_PROIBIDO');
    e = jogar(e, [[2, '6c']]).estado;
    // vez do assento 3 (dupla 1) — pode pedir seis
    expect(ok(e, { tipo: 'PEDIR_TRUCO', assento: 3 }).estado.mao.pedido?.valor).toBe(6);
  });

  it('só o participante da vez pede, e sem pedido pendente', () => {
    let e = mesa({ vira: '7o', maos: MAOS_PADRAO });
    expect(aplicarAcao(e, { tipo: 'PEDIR_TRUCO', assento: 1 }).ok).toBe(false);
    e = ok(e, { tipo: 'PEDIR_TRUCO', assento: 0 }).estado;
    expect(aplicarAcao(e, { tipo: 'PEDIR_TRUCO', assento: 0 }).ok).toBe(false);
    const jogada = aplicarAcao(e, { tipo: 'JOGAR_CARTA', assento: 0, indice: 0 });
    expect(jogada.ok ? 'ok' : jogada.erro.codigo).toBe('DECISAO_PENDENTE');
  });

  it('só o respondente responde', () => {
    const e = ok(mesa({ vira: '7o', maos: MAOS_PADRAO }), { tipo: 'PEDIR_TRUCO', assento: 0 }).estado;
    const r = aplicarAcao(e, { tipo: 'RESPONDER_TRUCO', assento: 3, resposta: 'aceitar' });
    expect(r.ok ? 'ok' : r.erro.codigo).toBe('NAO_E_RESPONDENTE');
    const semPedido = aplicarAcao(mesa(), { tipo: 'RESPONDER_TRUCO', assento: 1, resposta: 'aceitar' });
    expect(semPedido.ok ? 'ok' : semPedido.erro.codigo).toBe('SEM_PEDIDO');
  });

  it('aceitar devolve a vez a quem pediu (CT-012.1)', () => {
    let e = ok(mesa({ vira: '7o', maos: MAOS_PADRAO }), { tipo: 'PEDIR_TRUCO', assento: 0 }).estado;
    e = ok(e, { tipo: 'RESPONDER_TRUCO', assento: 1, resposta: 'aceitar' }).estado;
    expect(e.mao.valor).toBe(3);
    expect(assentoDaVez(e)).toBe(0);
  });

  it('correr: o solicitante ganha o valor anterior ao pedido (CT-012.2)', () => {
    let e = mesa({ placar: [4, 4], vira: '7o', maos: MAOS_PADRAO });
    e = ok(e, { tipo: 'PEDIR_TRUCO', assento: 0 }).estado;
    e = ok(e, { tipo: 'RESPONDER_TRUCO', assento: 1, resposta: 'aceitar' }).estado; // vale 3
    e = jogar(e, [[0, '4o']]).estado;
    e = ok(e, { tipo: 'PEDIR_TRUCO', assento: 1 }).estado; // dupla 1 pede seis
    const r = ok(e, { tipo: 'RESPONDER_TRUCO', assento: 2, resposta: 'correr' });
    expect(r.estado.placar).toEqual([4, 7]);
    expect(r.estado.mao.numero).toBe(2);
  });

  it('pedido de truco recusado logo de cara vale 1', () => {
    let e = ok(mesa({ vira: '7o', maos: MAOS_PADRAO }), { tipo: 'PEDIR_TRUCO', assento: 0 }).estado;
    e = ok(e, { tipo: 'RESPONDER_TRUCO', assento: 1, resposta: 'correr' }).estado;
    expect(e.placar).toEqual([1, 0]);
  });

  it('aumentar e correr depois: quem aumentou leva o valor já aceito (CT-012.3)', () => {
    let e = ok(mesa({ vira: '7o', maos: MAOS_PADRAO }), { tipo: 'PEDIR_TRUCO', assento: 0 }).estado;
    e = ok(e, { tipo: 'RESPONDER_TRUCO', assento: 1, resposta: 'aumentar' }).estado;
    expect(e.mao.pedido).toMatchObject({ valor: 6, respondente: 2 });
    e = ok(e, { tipo: 'RESPONDER_TRUCO', assento: 2, resposta: 'correr' }).estado;
    expect(e.placar).toEqual([0, 3]);
  });
});

describe('RN-015 - Mão de onze (CT-013.1, CT-013.2)', () => {
  it('apenas uma dupla com 11: mão vale 3, decisão pendente do primeiro humano da dupla', () => {
    const e = mesa({ placar: [11, 5], tipos: ['bot', 'bot', 'humano', 'bot'] });
    expect(e.mao.tipo).toBe('onze');
    expect(e.mao.valor).toBe(3);
    expect(e.mao.decisaoOnze).toEqual({ dupla: 0, decisor: 2 });
    expect(assentoDaVez(e)).toBe(2);
  });

  it('sem humano na dupla, decide o primeiro bot dela na ordem de jogo', () => {
    const e = mesa({ placar: [5, 11], tipos: ['humano', 'bot', 'humano', 'bot'] });
    expect(e.mao.decisaoOnze).toEqual({ dupla: 1, decisor: 1 });
  });

  it('correr dá 1 ponto à adversária e distribui nova mão de onze', () => {
    const r = ok(mesa({ placar: [11, 5] }), { tipo: 'DECIDIR_MAO_DE_ONZE', assento: 0, decisao: 'correr' });
    expect(r.estado.placar).toEqual([11, 6]);
    expect(r.estado.mao.tipo).toBe('onze');
  });

  it('jogar libera a mão valendo 3 e sem truco', () => {
    let e = mesa({ placar: [11, 5], vira: '7o', maos: MAOS_PADRAO });
    expect(aplicarAcao(e, { tipo: 'JOGAR_CARTA', assento: 0, indice: 0 }).ok).toBe(false);
    e = ok(e, { tipo: 'DECIDIR_MAO_DE_ONZE', assento: 0, decisao: 'jogar' }).estado;
    expect(e.mao.valor).toBe(3);
    const truco = aplicarAcao(e, { tipo: 'PEDIR_TRUCO', assento: 0 });
    expect(truco.ok ? 'ok' : truco.erro.codigo).toBe('TRUCO_PROIBIDO');
    const r = jogar(e, [
      [0, '3o'], [1, '5e'], [2, '6c'], [3, '4p'],
      [0, 'Ko'], [1, 'Je'], [2, 'Ac'], [3, '5p'],
    ]);
    expect(r.estado.placar).toEqual([14, 5]);
    expect(r.estado.fase).toBe('encerrada');
  });

  it('só o decisor decide, e só quando há decisão pendente', () => {
    const e = mesa({ placar: [11, 5] });
    const outro = aplicarAcao(e, { tipo: 'DECIDIR_MAO_DE_ONZE', assento: 2, decisao: 'jogar' });
    expect(outro.ok ? 'ok' : outro.erro.codigo).toBe('NAO_E_DECISOR');
    const semOnze = aplicarAcao(mesa(), { tipo: 'DECIDIR_MAO_DE_ONZE', assento: 0, decisao: 'jogar' });
    expect(semOnze.ok ? 'ok' : semOnze.erro.codigo).toBe('SEM_DECISAO_ONZE');
  });
});

describe('RN-016 - Mão de ferro (CT-009.3)', () => {
  it('11×11: vale 1, sem truco, sem encoberta; quem vencer termina com 12', () => {
    let e = mesa({ placar: [11, 11], vira: '7o', maos: MAOS_PADRAO });
    expect(e.mao.tipo).toBe('ferro');
    expect(e.mao.valor).toBe(1);
    expect(e.mao.decisaoOnze).toBeUndefined();
    expect(aplicarAcao(e, { tipo: 'PEDIR_TRUCO', assento: 0 }).ok).toBe(false);
    e = jogar(e, [[0, '3o'], [1, '5e'], [2, '6c'], [3, '4p']]).estado;
    const enc = aplicarAcao(e, { tipo: 'JOGAR_CARTA', assento: 0, indice: 0, encoberta: true });
    expect(enc.ok ? 'ok' : enc.erro.codigo).toBe('ENCOBERTA_PROIBIDA');
    const r = jogar(e, [[0, 'Ko'], [1, 'Je'], [2, 'Ac'], [3, '5p']]);
    expect(r.estado.placar).toEqual([12, 11]);
    expect(r.estado.vencedora).toBe(0);
  });
});

describe('RN-026 - Revanche', () => {
  it('mantém as duplas e zera o placar', () => {
    const fim = mesa({ placar: [11, 11] });
    fim.fase = 'encerrada';
    fim.vencedora = 0;
    const { estado } = criarRevanche(fim, 99);
    expect(estado.placar).toEqual([0, 0]);
    expect(estado.fase).toBe('jogando');
    expect(estado.participantes).toEqual(fim.participantes);
    expect(estado.mao.numero).toBe(1);
  });

  it('sem semente informada, continua a sequência aleatória da partida anterior', () => {
    const fim = mesa();
    expect(criarRevanche(fim).estado.mao).toEqual(criarRevanche(fim).estado.mao);
  });
});

describe('Robustez - partidas aleatórias até o fim', () => {
  function sortear(estado: EstadoPartida, s: number): Acao {
    const assento = assentoDaVez(estado)!;
    const acoes = acoesValidas(estado, assento);
    return acoes[s % acoes.length]!;
  }

  it('300 partidas com ações válidas aleatórias sempre terminam sem erro e com placar ≥ 12', () => {
    for (let semente = 1; semente <= 300; semente++) {
      let e = criarPartida({ participantes: participantes(), semente }).estado;
      let passos = 0;
      let s = semente * 7919;
      while (e.fase === 'jogando') {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        const r = aplicarAcao(e, sortear(e, s));
        if (!r.ok) throw new Error(`semente ${semente}: ${r.erro.codigo}`);
        e = r.estado;
        if (++passos > 5000) throw new Error(`semente ${semente}: partida não terminou`);
      }
      expect(Math.max(...e.placar)).toBeGreaterThanOrEqual(12);
      expect(e.placar[e.vencedora!]).toBeGreaterThanOrEqual(12);
    }
  });
});
