import { describe, expect, it } from 'vitest';
import { criarBaralho, ehZap, forca, manilhaDaVira, nomeCarta, ORDEM_VALORES } from '../baralho.ts';
import { c } from './ajudantes.ts';

describe('RN-001 - Composição do baralho', () => {
  it('tem 40 cartas distintas, 10 por naipe, sem 8, 9 e 10', () => {
    const baralho = criarBaralho();
    expect(baralho).toHaveLength(40);
    expect(new Set(baralho.map(nomeCarta)).size).toBe(40);
    for (const naipe of ['ouros', 'espadas', 'copas', 'paus']) {
      expect(baralho.filter((x) => x.naipe === naipe)).toHaveLength(10);
    }
    expect(baralho.some((x) => ['8', '9', '10'].includes(x.valor))).toBe(false);
  });
});

describe('RN-002 - Força das cartas comuns', () => {
  it('segue 4 < 5 < 6 < 7 < Q < J < K < A < 2 < 3 quando nenhuma é manilha', () => {
    // vira 3 → manilha 4; usamos só valores de 5 a 3
    const manilha = '4';
    const valores = ORDEM_VALORES.slice(1);
    for (let i = 1; i < valores.length; i++) {
      expect(forca(c(`${valores[i]}o`), manilha)).toBeGreaterThan(forca(c(`${valores[i - 1]}o`), manilha));
    }
  });

  it('o naipe não desempata cartas comuns (7 de ouros = 7 de paus)', () => {
    expect(forca(c('7o'), 'Q')).toBe(forca(c('7p'), 'Q'));
  });
});

describe('RN-003 - Vira e definição da manilha', () => {
  it.each([
    ['7o', 'Q'],
    ['Kc', 'A'],
    ['3e', '4'],
    ['Qp', 'J'],
  ])('vira %s → manilha %s', (vira, esperado) => {
    expect(manilhaDaVira(c(vira))).toBe(esperado);
  });

  it('a manilha mais fraca vence o 3 comum', () => {
    expect(forca(c('4o'), '4')).toBeGreaterThan(forca(c('3p'), '4'));
  });
});

describe('RN-004 - Ordem das manilhas por naipe', () => {
  it('ouros < espadas < copas < paus, sem empate entre manilhas', () => {
    const [o, e, cp, p] = ['5o', '5e', '5c', '5p'].map((x) => forca(c(x), '5'));
    expect(o).toBeLessThan(e!);
    expect(e).toBeLessThan(cp!);
    expect(cp).toBeLessThan(p!);
    expect(ehZap(c('5p'), '5')).toBe(true);
    expect(ehZap(c('5c'), '5')).toBe(false);
  });
});

describe('RN-011 - Carta encoberta (força)', () => {
  it('não tem valor: perde para qualquer carta aberta', () => {
    expect(forca(c('3p'), '4', true)).toBeLessThan(forca(c('4e'), 'Q'));
  });
});
