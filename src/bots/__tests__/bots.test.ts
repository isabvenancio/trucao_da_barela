import { describe, expect, it } from 'vitest';
import { visaoDoAssento } from '../../engine/index.ts';
import type { Acao, Dificuldade } from '../../engine/index.ts';
import { c, jogar, mesa, ok } from '../../engine/__tests__/ajudantes.ts';
import { cartasNaoVistas, probabilidadeImbativel } from '../avaliacao.ts';
import { decidirBot } from '../index.ts';
import { criarAleatorio, simular } from '../simulador.ts';

const NIVEIS: Dificuldade[] = ['facil', 'medio', 'dificil'];
const fixo = () => 0.5;

function acaoDe(acao: Acao | undefined) {
  return acao && acao.tipo === 'JOGAR_CARTA' ? acao.indice : acao;
}

describe('CA-021.1 - O bot decide só com a visão do seu assento (RN-018, RN-019)', () => {
  it('trocar cartas que o bot não pode ver não muda a decisão dele', () => {
    const base = mesa({ vira: '7o', maos: [['3o', 'Ko', '4o'], ['2e', 'Je', '5e'], ['Ac', '7c', '6c'], ['Qp', '4p', '5p']] });
    const trocada = structuredClone(base);
    // O assento 1 não vê as mãos dos assentos 2 e 3: troca uma pela outra.
    [trocada.mao.cartas[2], trocada.mao.cartas[3]] = [trocada.mao.cartas[3], trocada.mao.cartas[2]];
    const a = jogar(base, [[0, '3o']]).estado;
    const b = jogar(trocada, [[0, '3o']]).estado;
    for (const nivel of NIVEIS) {
      const va = visaoDoAssento(a, 1);
      const vb = visaoDoAssento(b, 1);
      expect(va.minhasCartas).toEqual(vb.minhasCartas);
      expect(decidirBot(va, nivel, criarAleatorio(3))).toEqual(decidirBot(vb, nivel, criarAleatorio(3)));
    }
  });

  it('cartas não vistas excluem a própria mão, a vira e as cartas abertas', () => {
    const e = jogar(mesa({ vira: '7o', maos: [['3o', 'Ko', '4o'], ['2e', 'Je', '5e'], ['Ac', '7c', '6c'], ['Qp', '4p', '5p']] }), [[0, '3o']]).estado;
    const naoVistas = cartasNaoVistas(visaoDoAssento(e, 1));
    expect(naoVistas).toHaveLength(40 - 3 - 1 - 1);
    expect(naoVistas.some((x) => x.valor === '3' && x.naipe === 'ouros')).toBe(false);
  });
});

describe('CA-021.2 - Simulação bot × bot (CT-021.2)', () => {
  it('1.000 partidas difícil × fácil: difícil vence ≥ 60% e nenhuma ação inválida', () => {
    const r = simular(['dificil', 'facil', 'dificil', 'facil'], 1000, 2026);
    expect(r.acoesInvalidas).toBe(0);
    expect(r.fallbacks).toBe(0);
    expect(r.vitorias[0] / r.partidas).toBeGreaterThanOrEqual(0.6);
    expect(r.maiorTempoDecisaoMs).toBeLessThan(300); // RNF-003
  });

  it('a hierarquia se mantém: médio > fácil e difícil > médio', () => {
    const medio = simular(['medio', 'facil', 'medio', 'facil'], 400, 5);
    const dificil = simular(['dificil', 'medio', 'dificil', 'medio'], 600, 5);
    expect(medio.vitorias[0] / medio.partidas).toBeGreaterThan(0.7);
    expect(dificil.vitorias[0] / dificil.partidas).toBeGreaterThan(0.53);
  });
});

describe('RF-021 - Fallback para ação segura', () => {
  it('sem decisão pendente para o assento, não há ação', () => {
    expect(decidirBot(visaoDoAssento(mesa(), 2), 'medio')).toBeUndefined();
  });

  it('se a estratégia propõe algo fora das ações válidas, usa uma ação segura e válida', () => {
    // O fácil sorteia dentro das próprias ações válidas; médio e difícil calculam a jogada.
    for (const nivel of ['medio', 'dificil'] as const) {
      const visao = visaoDoAssento(mesa({ vira: '7o', maos: [['3o', 'Ko', '4o'], ['2e', 'Je', '5e'], ['Ac', '7c', '6c'], ['Qp', '4p', '5p']] }), 0);
      const escolhida = decidirBot(visao, nivel, fixo)!.acao;
      visao.acoes = visao.acoes.filter((a) => JSON.stringify(a) !== JSON.stringify(escolhida));
      const d = decidirBot(visao, nivel, fixo)!;
      expect(d.fallback).toBe(true);
      expect(visao.acoes.some((a) => JSON.stringify(a) === JSON.stringify(d.acao))).toBe(true);
    }
  });
});

describe('Escolha de carta (médio e difícil)', () => {
  const MAOS: [string[], string[], string[], string[]] = [['5o', 'Ko', 'Ao'], ['4e', '6e', '2e'], ['Jc', '3c', '6c'], ['6p', '4p', '5p']];
  // vira 7o → manilha Q. Mesa: 0 joga Ao; 1 joga 2e (ganhando); 2 joga Jc. Vez do 3 (último).
  const fim = () => jogar(mesa({ vira: '7o', maos: MAOS }), [[0, 'Ao'], [1, '2e'], [2, 'Jc']]).estado;

  it('último a jogar com o parceiro ganhando: descarta a mais fraca', () => {
    for (const nivel of ['medio', 'dificil'] as const) {
      expect(acaoDe(decidirBot(visaoDoAssento(fim(), 3), nivel, fixo)!.acao)).toBe(1); // 4p (a mais fraca entre 6p, 4p e 5p)
    }
  });

  it('adversário ganhando: usa a menor carta que vence', () => {
    // 0 joga 5o, 1 joga 2e; vez do 2 com Jc, 3c, 6c → só o 3 vence o 2
    const e = jogar(mesa({ vira: '7o', maos: MAOS }), [[0, '5o'], [1, '2e']]).estado;
    expect(acaoDe(decidirBot(visaoDoAssento(e, 2), 'medio', fixo)!.acao)).toBe(1);
  });

  it('não dá para vencer nem empatar com vantagem: descarta a mais fraca', () => {
    // 0 joga Ko; 1 joga 2e (dupla 1 ganhando); o 2 tem Jc, 4c e 6c — nenhuma vence nem empata
    const e = jogar(mesa({ vira: '7o', maos: [['5o', 'Ko', 'Ao'], ['4e', '6e', '2e'], ['Jc', '4c', '6c'], ['Qp', '4p', '5p']] }), [[0, 'Ko'], [1, '2e']]).estado;
    expect(acaoDe(decidirBot(visaoDoAssento(e, 2), 'medio', fixo)!.acao)).toBe(1); // 4c
  });

  it('mão de ferro: escolhe um índice válido mesmo sem ver as cartas', () => {
    const e = mesa({ placar: [11, 11] });
    for (const nivel of NIVEIS) {
      const d = decidirBot(visaoDoAssento(e, 0), nivel, criarAleatorio(1))!;
      expect(d.fallback).toBe(false);
      expect(d.acao.tipo).toBe('JOGAR_CARTA');
    }
  });
});

describe('Truco e mão de onze', () => {
  it('com mão fraca, médio e difícil correm de um truco comum', () => {
    let e = mesa({ vira: '7o', maos: [['3o', 'Qo', 'Qc'], ['4e', '5e', '6e'], ['Ac', '7c', '6c'], ['Qp', '4p', '5p']] });
    e = ok(e, { tipo: 'PEDIR_TRUCO', assento: 0 }).estado;
    for (const nivel of ['medio', 'dificil'] as const) {
      expect(decidirBot(visaoDoAssento(e, 1), nivel, fixo)!.acao).toEqual({ tipo: 'RESPONDER_TRUCO', assento: 1, resposta: 'correr' });
    }
  });

  it('depois de ganhar a 1ª rodada, com o zap e outra manilha, pede truco', () => {
    let e = mesa({ vira: '7o', maos: [['3o', 'Qp', 'Qc'], ['4e', '5e', '6e'], ['Ac', 'Jc', '6c'], ['Ko', '4p', '5p']] });
    e = jogar(e, [[0, '3o'], [1, '4e'], [2, '6c'], [3, '4p']]).estado; // o 3 vence; vez do 0
    for (const nivel of ['medio', 'dificil'] as const) {
      expect(decidirBot(visaoDoAssento(e, 0), nivel, fixo)!.acao).toEqual({ tipo: 'PEDIR_TRUCO', assento: 0 });
    }
  });

  it('não corre quando correr daria a partida ao adversário', () => {
    let e = mesa({ placar: [3, 10], vira: '7o', maos: [['4o', '5o', '6o'], ['Qp', 'Qc', '3e'], ['4c', '5c', '6c'], ['Ke', 'Je', '7e']] });
    e = ok(e, { tipo: 'PEDIR_TRUCO', assento: 0 }).estado;
    e = ok(e, { tipo: 'RESPONDER_TRUCO', assento: 1, resposta: 'aceitar' }).estado; // vale 3
    e = jogar(e, [[0, '4o']]).estado;
    e = ok(e, { tipo: 'PEDIR_TRUCO', assento: 1 }).estado; // seis; responde o 2, com mão péssima
    for (const nivel of ['medio', 'dificil'] as const) {
      const d = decidirBot(visaoDoAssento(e, 2), nivel, fixo)!.acao;
      expect(d.tipo === 'RESPONDER_TRUCO' && d.resposta !== 'correr').toBe(true);
    }
  });

  it('mão de onze: joga com duas manilhas na dupla, corre com mão fraca', () => {
    const forte = mesa({ placar: [11, 4], tipos: ['bot', 'bot', 'bot', 'bot'], vira: '7o', maos: [['Qp', '4o', '5o'], ['4e', '5e', '6e'], ['Qc', '3c', '6c'], ['Ko', '4p', '5p']] });
    const fraca = mesa({ placar: [11, 4], tipos: ['bot', 'bot', 'bot', 'bot'], vira: '7o', maos: [['4o', '5o', '6o'], ['4e', '5e', '6e'], ['Kc', 'Jc', '6c'], ['Ko', '4p', '5p']] });
    for (const nivel of NIVEIS) {
      expect(decidirBot(visaoDoAssento(forte, 0), nivel, fixo)!.acao).toMatchObject({ decisao: 'jogar' });
      expect(decidirBot(visaoDoAssento(fraca, 0), nivel, fixo)!.acao).toMatchObject({ decisao: 'correr' });
    }
  });

  it('fácil responde a truco e pode pedir truco', () => {
    const e = ok(mesa({ vira: '7o' }), { tipo: 'PEDIR_TRUCO', assento: 0 }).estado;
    const respostas = new Set([0.05, 0.3, 0.9].map((v) => {
      const a = decidirBot(visaoDoAssento(e, 1), 'facil', () => v)!.acao;
      return a.tipo === 'RESPONDER_TRUCO' ? a.resposta : '';
    }));
    expect([...respostas].sort()).toEqual(['aceitar', 'aumentar', 'correr']);
    expect(decidirBot(visaoDoAssento(mesa({ vira: '7o' }), 0), 'facil', () => 0.01)!.acao).toEqual({ tipo: 'PEDIR_TRUCO', assento: 0 });
  });
});

describe('Probabilidade de carta imbatível', () => {
  it('o zap é sempre imbatível; um 4 comum quase nunca', () => {
    const v = visaoDoAssento(mesa({ vira: '7o', maos: [['Qp', '4o', '5o'], ['4e', '5e', '6e'], ['Qc', '3c', '6c'], ['Ko', '4p', '5p']] }), 0);
    expect(probabilidadeImbativel(c('Qp'), v)).toBe(1);
    expect(probabilidadeImbativel(c('4o'), v)).toBeLessThan(0.01);
  });
});
