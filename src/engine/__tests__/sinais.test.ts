import { describe, expect, it } from 'vitest';
import { aplicarAcao, assentoDaVez } from '../partida.ts';
import { MAX_SINAIS_POR_MAO, sinaisDisponiveis } from '../sinais.ts';
import { eventosParaAssento, visaoDoAssento } from '../visao.ts';
import { jogar, mesa, ok } from './ajudantes.ts';

const MAOS: [string[], string[], string[], string[]] = [
  ['Qp', 'Ko', '4o'],
  ['2e', 'Je', '5e'],
  ['Ac', '7c', '6c'],
  ['3p', '4p', '5p'],
];

describe('RN-027 - Sinais ao parceiro (CT-024.1, CT-024.2)', () => {
  it('o parceiro vê o sinal; a dupla adversária não vê nem o sinal nem o evento', () => {
    const r = ok(mesa({ vira: '7o', maos: MAOS }), { tipo: 'SINALIZAR', assento: 0, sinal: 'zap' });
    expect(visaoDoAssento(r.estado, 2).sinaisDoParceiro).toEqual([{ assento: 0, sinal: 'zap', rodada: 1 }]);
    expect(visaoDoAssento(r.estado, 0).meusSinais).toEqual(['zap']);
    for (const adversario of [1, 3] as const) {
      const v = visaoDoAssento(r.estado, adversario);
      expect(v.sinaisDoParceiro).toEqual([]);
      expect(JSON.stringify(v).includes('"sinal":"zap"')).toBe(false);
      expect(eventosParaAssento(r.eventos, adversario)).toEqual([]);
    }
    expect(eventosParaAssento(r.eventos, 2)).toEqual([{ tipo: 'SINAL_ENVIADO', assento: 0, sinal: 'zap' }]);
  });

  it('não muda a vez nem o valor; pode ser feito fora da vez', () => {
    const e = mesa({ vira: '7o', maos: MAOS });
    const r = ok(e, { tipo: 'SINALIZAR', assento: 3, sinal: 'tres' });
    expect(assentoDaVez(r.estado)).toBe(assentoDaVez(e));
    expect(r.estado.mao.valor).toBe(e.mao.valor);
    expect(r.estado.mao.cartas).toEqual(e.mao.cartas);
  });

  it('no máximo 3 sinais distintos por mão', () => {
    let e = mesa({ vira: '7o', maos: MAOS });
    for (const sinal of ['tres', 'dois', 'nada'] as const) e = ok(e, { tipo: 'SINALIZAR', assento: 0, sinal }).estado;
    const quarto = aplicarAcao(e, { tipo: 'SINALIZAR', assento: 0, sinal: 'as' });
    expect(quarto.ok ? 'ok' : quarto.erro.codigo).toBe('SINAL_PROIBIDO');
    expect(sinaisDisponiveis(e, 0)).toEqual([]);
    expect(MAX_SINAIS_POR_MAO).toBe(3);
    const repetido = aplicarAcao(mesa({ vira: '7o', maos: MAOS }), { tipo: 'SINALIZAR', assento: 0, sinal: 'zap' });
    const de = repetido.ok ? aplicarAcao(repetido.estado, { tipo: 'SINALIZAR', assento: 0, sinal: 'zap' }) : repetido;
    expect(de.ok ? 'ok' : de.erro.codigo).toBe('SINAL_PROIBIDO');
  });

  it('não há sinais na mão de ferro, nem sem cartas, nem com sinal desconhecido', () => {
    const ferro = aplicarAcao(mesa({ placar: [11, 11], vira: '7o', maos: MAOS }), { tipo: 'SINALIZAR', assento: 0, sinal: 'zap' });
    expect(ferro.ok ? 'ok' : ferro.erro.codigo).toBe('SINAL_PROIBIDO');
    const e = mesa({ vira: '7o', maos: MAOS });
    e.mao.cartas[1] = [];
    expect(sinaisDisponiveis(e, 1)).toEqual([]);
    const estranho = aplicarAcao(mesa(), { tipo: 'SINALIZAR', assento: 0, sinal: 'coringa' as never });
    expect(estranho.ok ? 'ok' : estranho.erro.codigo).toBe('SINAL_PROIBIDO');
  });

  it('os sinais valem para a mão: na mão seguinte começam do zero', () => {
    let e = ok(mesa({ vira: '7o', maos: MAOS }), { tipo: 'SINALIZAR', assento: 0, sinal: 'zap' }).estado;
    e = jogar(e, [
      [0, 'Qp'], [1, '5e'], [2, '6c'], [3, '4p'],
      [0, 'Ko'], [1, 'Je'], [2, 'Ac'], [3, '5p'],
    ]).estado;
    expect(e.mao.numero).toBe(2);
    expect(visaoDoAssento(e, 2).sinaisDoParceiro).toEqual([]);
    expect(sinaisDisponiveis(e, 0)).toHaveLength(9);
  });

  it('partida encerrada não aceita sinal', () => {
    const e = mesa();
    e.fase = 'encerrada';
    expect(aplicarAcao(e, { tipo: 'SINALIZAR', assento: 0, sinal: 'nada' }).ok).toBe(false);
    expect(sinaisDisponiveis(e, 0)).toEqual([]);
  });
});
