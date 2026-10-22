import { describe, expect, it } from 'vitest';
import { inicianteDaProxima, resultadoDaRodada, vencedorDaMao } from '../rodada.ts';
import type { Assento, ResultadoRodada } from '../tipos.ts';
import { c } from './ajudantes.ts';

function rodada(jogadas: [Assento, string, boolean?][]) {
  return { jogadas: jogadas.map(([assento, carta, encoberta]) => ({ assento, carta: c(carta), encoberta: !!encoberta })) };
}

describe('RN-009 - Vencedor da rodada', () => {
  it('maior carta vence', () => {
    expect(resultadoDaRodada(rodada([[0, '2o'], [1, '3e'], [2, 'Ko'], [3, '4c']]), 'Q')).toEqual({ resultado: 1, vencedor: 1 });
  });

  it('comuns de mesmo valor de duplas diferentes empatam (CT-010.2)', () => {
    // manilha Q: 3♦ (A), 3♠ (B), 2♥ (A), K♣ (B)
    expect(resultadoDaRodada(rodada([[0, '3o'], [1, '3e'], [2, '2c'], [3, 'Kp']]), 'Q').resultado).toBe('empate');
  });

  it('as maiores da mesma dupla dão a vitória a ela, creditada a quem jogou primeiro', () => {
    expect(resultadoDaRodada(rodada([[1, '2o'], [2, '3o'], [3, '4p'], [0, '3c']]), 'J')).toEqual({ resultado: 0, vencedor: 2 });
  });

  it('manilha vence carta comum e o zap vence as outras manilhas', () => {
    expect(resultadoDaRodada(rodada([[0, '3o'], [1, 'Qo'], [2, 'Qc'], [3, 'Qp']]), 'Q')).toEqual({ resultado: 1, vencedor: 3 });
  });

  it('carta encoberta nunca vence (RN-011)', () => {
    expect(resultadoDaRodada(rodada([[0, '3o', true], [1, '4e'], [2, '5c', true], [3, '5o', true]]), 'Q')).toEqual({ resultado: 1, vencedor: 1 });
  });

  it('rodada só com encobertas empata', () => {
    expect(resultadoDaRodada(rodada([[0, '3o', true], [1, '4e', true], [2, '5c', true], [3, '6o', true]]), 'Q').resultado).toBe('empate');
  });
});

describe('RN-007 - Quem inicia a próxima rodada', () => {
  it('o vencedor da rodada', () => {
    expect(inicianteDaProxima({ iniciante: 0, jogadas: [], resultado: 1, vencedor: 3 })).toBe(3);
  });
  it('em empate, quem iniciou a rodada empatada', () => {
    expect(inicianteDaProxima({ iniciante: 3, jogadas: [], resultado: 'empate' })).toBe(3);
  });
});

describe('RN-010 - Vencedor da mão (tabela de verdade com todas as sequências)', () => {
  const A = 0 as const;
  const B = 1 as const;
  const E = 'empate' as const;

  it('mão não decidida enquanto faltam rodadas', () => {
    expect(vencedorDaMao([])).toBeUndefined();
    expect(vencedorDaMao([A])).toBeUndefined();
    expect(vencedorDaMao([A, B])).toBeUndefined();
    expect(vencedorDaMao([E, E])).toBeUndefined();
  });

  it('termina antes da 3ª quando já está decidida', () => {
    expect(vencedorDaMao([A, A])).toBe(A);
    expect(vencedorDaMao([E, B])).toBe(B);
    expect(vencedorDaMao([A, E])).toBe(A);
  });

  // Esperado para cada sequência completa de 3 resultados.
  const esperado = (r1: ResultadoRodada, r2: ResultadoRodada, r3: ResultadoRodada): ResultadoRodada => {
    const vitA = [r1, r2, r3].filter((x) => x === A).length;
    const vitB = [r1, r2, r3].filter((x) => x === B).length;
    if (vitA >= 2) return A;
    if (vitB >= 2) return B;
    if (r1 === E && r2 !== E) return r2; // 1ª empatada → 2ª decide
    if (r1 !== E && r2 === E) return r1; // 2ª empatada → 1ª decide
    if (r1 === E && r2 === E) return r3; // 3ª decide; três empates → ninguém
    return r1; // 1–1 e 3ª empatada → quem venceu a 1ª
  };

  const todos: ResultadoRodada[] = [A, B, E];
  for (const r1 of todos)
    for (const r2 of todos)
      for (const r3 of todos) {
        it(`${r1}/${r2}/${r3}`, () => {
          const decidiuNa2 = vencedorDaMao([r1, r2]);
          const final = decidiuNa2 ?? vencedorDaMao([r1, r2, r3]);
          expect(final).toBe(esperado(r1, r2, r3));
        });
      }

  it('três empates: ninguém pontua', () => {
    expect(vencedorDaMao([E, E, E])).toBe('empate');
  });
});
