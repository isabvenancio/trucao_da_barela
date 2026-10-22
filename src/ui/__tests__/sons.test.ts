import { describe, expect, it } from 'vitest';
import type { Evento } from '../../engine/index.ts';
import { sonsDosEventos } from '../sons.ts';

const carta = { valor: '3', naipe: 'ouros' } as const;

describe('Plano 9.1 - Mapeamento de eventos para slots de som', () => {
  it('escada do truco tem um som para cada valor', () => {
    const eventos: Evento[] = [3, 6, 9, 12].map((valor) => ({ tipo: 'TRUCO_PEDIDO', assento: 1, dupla: 1, valor: valor as 3, respondente: 2 }));
    expect(sonsDosEventos(eventos, 0)).toEqual(['truco', 'seis', 'nove', 'doze']);
  });

  it('carta comum, manilha, zap e encoberta têm sons diferentes', () => {
    const base = { tipo: 'CARTA_JOGADA', assento: 0, carta } as const;
    expect(
      sonsDosEventos(
        [
          { ...base, encoberta: false, manilha: false, zap: false },
          { ...base, encoberta: false, manilha: true, zap: false },
          { ...base, encoberta: false, manilha: true, zap: true },
          { ...base, encoberta: true, manilha: false, zap: false },
        ],
        0,
      ),
    ).toEqual(['jogar', 'manilha', 'zap', 'encoberta']);
  });

  it('vitória e derrota dependem da dupla de quem ouve; rodada e mão só tocam para quem ganhou', () => {
    const fim: Evento[] = [
      { tipo: 'RODADA_ENCERRADA', numero: 2, resultado: 0, vencedor: 2 },
      { tipo: 'MAO_ENCERRADA', vencedora: 0, pontos: 3, motivo: 'rodadas', placar: [12, 4] },
      { tipo: 'PARTIDA_ENCERRADA', vencedora: 0, placar: [12, 4] },
    ];
    expect(sonsDosEventos(fim, 0)).toEqual(['ganharRodada', 'ganharMao', 'vitoria']);
    expect(sonsDosEventos(fim, 1)).toEqual(['derrota']);
  });

  it('mão de onze, mão de ferro, aceitar e correr', () => {
    const vira = carta;
    expect(
      sonsDosEventos(
        [
          { tipo: 'MAO_DISTRIBUIDA', numero: 1, carteador: 0, vira, manilha: '4', tipoMao: 'normal' },
          { tipo: 'MAO_DISTRIBUIDA', numero: 2, carteador: 1, vira, manilha: '4', tipoMao: 'onze' },
          { tipo: 'MAO_DISTRIBUIDA', numero: 3, carteador: 2, vira, manilha: '4', tipoMao: 'ferro' },
          { tipo: 'TRUCO_RESPONDIDO', assento: 1, resposta: 'aceitar', valor: 3 },
          { tipo: 'TRUCO_RESPONDIDO', assento: 1, resposta: 'aumentar', valor: 3 },
          { tipo: 'TRUCO_RESPONDIDO', assento: 1, resposta: 'correr', valor: 3 },
          { tipo: 'ONZE_DECIDIDA', dupla: 0, decisao: 'correr' },
        ],
        0,
      ),
    ).toEqual(['distribuir', 'maoDeOnze', 'maoDeFerro', 'aceitar', 'correr', 'correr']);
  });
});
