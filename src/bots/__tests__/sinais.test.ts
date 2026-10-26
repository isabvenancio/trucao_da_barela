import { describe, expect, it } from 'vitest';
import { aplicarAcao, visaoDoAssento } from '../../engine/index.ts';
import { mesa, ok } from '../../engine/__tests__/ajudantes.ts';
import { forcaSinalizadaDoParceiro } from '../avaliacao.ts';
import { decidirBot } from '../index.ts';
import { aplicarSinaisDosBots, sinaisDoBot } from '../../engine/sinais.ts';
import { simular } from '../simulador.ts';

const fixo = () => 0.9;

describe('CA-024.3 - Bots e sinais', () => {
  it('o bot sinaliza honestamente as duas melhores cartas que têm sinal (CT-024.3)', () => {
    // vira 7 → manilha Q
    const e = mesa({ vira: '7o', maos: [['Qp', '3o', 'Qe'], ['4e', '5e', '6e'], ['Ac', '7c', '6c'], ['Ko', '4p', '5p']] });
    expect(sinaisDoBot(visaoDoAssento(e, 0), 'medio', fixo)).toEqual(['zap', 'espadilha']);
    expect(sinaisDoBot(visaoDoAssento(e, 2), 'dificil', fixo)).toEqual(['as']);
    expect(sinaisDoBot(visaoDoAssento(e, 1), 'medio', fixo)).toEqual(['nada']);
  });

  it('sinaliza uma vez por mão e não sinaliza na mão de ferro', () => {
    const e = ok(mesa({ vira: '7o' }), { tipo: 'SINALIZAR', assento: 0, sinal: 'nada' }).estado;
    expect(sinaisDoBot(visaoDoAssento(e, 0), 'medio', fixo)).toEqual([]);
    expect(sinaisDoBot(visaoDoAssento(mesa({ placar: [11, 11] }), 0), 'medio', fixo)).toEqual([]);
  });

  it('o fácil às vezes esquece de sinalizar', () => {
    const v = visaoDoAssento(mesa({ vira: '7o' }), 0);
    expect(sinaisDoBot(v, 'facil', () => 0.1)).toEqual([]);
    expect(sinaisDoBot(v, 'facil', () => 0.9).length).toBeGreaterThan(0);
  });

  it('aplicarSinaisDosBots só sinaliza pelos assentos de bot', () => {
    const e = mesa({ vira: '7o', maos: [['Qp', '3o', 'Qe'], ['4e', '5e', '6e'], ['Ac', '7c', '6c'], ['Ko', '4p', '5p']] });
    const r = aplicarSinaisDosBots(e, (a) => (a === 0 ? undefined : 'medio'), fixo);
    expect(r.estado.mao.sinais!.some((s) => s.assento === 0)).toBe(false);
    expect(r.eventos.every((ev) => ev.tipo === 'SINAL_ENVIADO')).toBe(true);
    expect(visaoDoAssento(r.estado, 0).sinaisDoParceiro.map((s) => s.sinal)).toEqual(['as']);
  });

  it('o bot lê o sinal do parceiro; carta sinalizada já jogada deixa de contar', () => {
    let e = mesa({ vira: '7o', maos: [['Qp', '3o', 'Qe'], ['4e', '5e', '6e'], ['Ac', '7c', '6c'], ['Ko', '4p', '5p']] });
    e = ok(e, { tipo: 'SINALIZAR', assento: 0, sinal: 'zap' }).estado;
    expect(forcaSinalizadaDoParceiro(visaoDoAssento(e, 2))).toBe(1);
    expect(forcaSinalizadaDoParceiro(visaoDoAssento(e, 1))).toBeUndefined();
    const jogou = aplicarAcao(e, { tipo: 'JOGAR_CARTA', assento: 0, indice: 0 });
    expect(jogou.ok && forcaSinalizadaDoParceiro(visaoDoAssento(jogou.estado, 2))).toBeUndefined();
    const nada = ok(mesa(), { tipo: 'SINALIZAR', assento: 0, sinal: 'nada' }).estado;
    expect(forcaSinalizadaDoParceiro(visaoDoAssento(nada, 2))).toBe(-1);
  });

  it('com o parceiro avisando zap, o bot com mão média aceita um truco que recusaria', () => {
    // Assento 1 pede truco; o 2 responde com mão fraca. Sem sinal corre; com sinal do zap do 0, aceita.
    const base = mesa({ carteador: 0, vira: '7o', maos: [['Qp', '4o', '5o'], ['3e', '2e', 'Ae'], ['Kc', 'Jc', '6c'], ['4p', '5p', '6p']] });
    const pedido = ok(base, { tipo: 'PEDIR_TRUCO', assento: 1 }).estado;
    const sem = decidirBot(visaoDoAssento(pedido, 2), 'medio', fixo)!.acao;
    const comSinal = ok(pedido, { tipo: 'SINALIZAR', assento: 0, sinal: 'zap' }).estado;
    const com = decidirBot(visaoDoAssento(comSinal, 2), 'medio', fixo)!.acao;
    expect(sem).toMatchObject({ resposta: 'correr' });
    expect(com).toMatchObject({ resposta: 'aceitar' });
  });

  it('em simulação, a dupla que troca sinais vence a que não troca', () => {
    const r = simular(['medio', 'medio', 'medio', 'medio'], 600, 31, { sinais: [true, false] });
    expect(r.acoesInvalidas).toBe(0);
    expect(r.vitorias[0] / r.partidas).toBeGreaterThan(0.52);
  });
});
