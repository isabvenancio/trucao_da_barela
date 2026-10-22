import { describe, expect, it } from 'vitest';
import { mesmaCarta } from '../baralho.ts';
import { parceiroDe } from '../mesa.ts';
import { eventosParaAssento, visaoDoAssento } from '../visao.ts';
import { c, jogar, mesa, ok } from './ajudantes.ts';

const MAOS: [string[], string[], string[], string[]] = [
  ['5o', '3o', '6o'],
  ['Ke', '4e', '5e'],
  ['Ac', '7c', '6c'],
  ['Qp', '4p', '5p'],
];

describe('RN-018 - Sigilo das cartas', () => {
  it('cada assento vê só as próprias cartas e a quantidade das demais', () => {
    const v = visaoDoAssento(mesa({ vira: '7o', maos: MAOS }), 1);
    expect(v.minhasCartas).toEqual([c('Ke'), c('4e'), c('5e')]);
    expect(v.quantidadeCartas).toEqual([3, 3, 3, 3]);
    expect(v.cartasParceiro).toBeUndefined();
    const texto = JSON.stringify(v);
    for (const alheia of ['"valor":"A","naipe":"copas"', '"valor":"Q","naipe":"paus"', '"valor":"3","naipe":"ouros"']) {
      expect(texto.includes(alheia)).toBe(false);
    }
    expect('rng' in v).toBe(false);
  });

  it('a visão expõe vira, manilha, vez e ações válidas do assento', () => {
    const v = visaoDoAssento(mesa({ vira: '7o', maos: MAOS }), 0);
    expect(v.vira).toEqual(c('7o'));
    expect(v.manilha).toBe('Q');
    expect(v.aguardando).toBe(0);
    expect(v.acoes.some((a) => a.tipo === 'PEDIR_TRUCO')).toBe(true);
    expect(visaoDoAssento(mesa({ vira: '7o', maos: MAOS }), 1).acoes).toEqual([]);
  });

  it('carta encoberta aparece só para quem a jogou', () => {
    const r = jogar(mesa({ vira: '7o', maos: MAOS }), [
      [0, '5o'], [1, 'Ke'], [2, '6c'], [3, '4p'],
      [1, '4e'], [2, '7c', true],
    ]);
    const doDono = visaoDoAssento(r.estado, 2).rodadas[1]!.jogadas[1]!;
    const deOutro = visaoDoAssento(r.estado, 1).rodadas[1]!.jogadas[1]!;
    expect(doDono.carta).toEqual(c('7c'));
    expect(deOutro).toEqual({ assento: 2, encoberta: true, carta: null });

    const evento = r.eventos.at(-1)!;
    expect(eventosParaAssento([evento], 1)[0]).toMatchObject({ tipo: 'CARTA_JOGADA', carta: null, encoberta: true });
    expect(eventosParaAssento([evento], 2)[0]).toEqual(evento);
  });

  it('mão de onze: a dupla com 11 vê as cartas do parceiro enquanto decide; os adversários não', () => {
    const e = mesa({ placar: [11, 5], vira: '7o', maos: MAOS });
    const decisor = visaoDoAssento(e, 0);
    expect(decisor.cartasParceiro).toEqual([c('Ac'), c('7c'), c('6c')]);
    expect(visaoDoAssento(e, parceiroDe(0)).cartasParceiro).toEqual([c('5o'), c('3o'), c('6o')]);
    expect(visaoDoAssento(e, 1).cartasParceiro).toBeUndefined();
    const depois = ok(e, { tipo: 'DECIDIR_MAO_DE_ONZE', assento: 0, decisao: 'jogar' }).estado;
    expect(visaoDoAssento(depois, 0).cartasParceiro).toBeUndefined();
  });

  it('mão de ferro: ninguém vê as próprias cartas', () => {
    const v = visaoDoAssento(mesa({ placar: [11, 11], vira: '7o', maos: MAOS }), 0);
    expect(v.minhasCartas).toEqual([null, null, null]);
  });

  it('pedido pendente e partida encerrada aparecem na visão', () => {
    const comPedido = ok(mesa({ vira: '7o', maos: MAOS }), { tipo: 'PEDIR_TRUCO', assento: 0 }).estado;
    expect(visaoDoAssento(comPedido, 1).pedido).toMatchObject({ valor: 3, respondente: 1 });
    const fim = mesa();
    fim.fase = 'encerrada';
    fim.vencedora = 1;
    expect(visaoDoAssento(fim, 0).vencedora).toBe(1);
  });

  it('mesmaCarta compara valor e naipe', () => {
    expect(mesmaCarta(c('3o'), c('3o'))).toBe(true);
    expect(mesmaCarta(c('3o'), c('3e'))).toBe(false);
  });
});
