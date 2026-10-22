import { describe, expect, it } from 'vitest';
import {
  apagarHistorico,
  carregarEstado,
  desfazer,
  iniciar,
  novaPartida,
  registrar,
  totais,
} from '../marcador.ts';
import type { DuplaMarcador, EstadoMarcador } from '../marcador.ts';

const T0 = new Date('2026-10-22T20:00:00Z');
const t = (min: number) => new Date(T0.getTime() + min * 60_000);

function comPartida(nomes: [string?, string?] = []): EstadoMarcador {
  return { atual: novaPartida(nomes, T0, 'p1'), historico: [] };
}

function somar(e: EstadoMarcador, ...jogadas: [DuplaMarcador, number][]): EstadoMarcador {
  for (const [d, v] of jogadas) {
    const r = registrar(e, d, v, t(1));
    if (!r.ok) throw new Error(r.motivo);
    e = r.estado;
  }
  return e;
}

describe('UC-017 - Iniciar marcador (CT-017.1)', () => {
  it('começa 0×0 com os nomes informados', () => {
    const p = novaPartida(['Barela e Carol', 'Ana e Matheus'], T0);
    expect(p.nomes).toEqual(['Barela e Carol', 'Ana e Matheus']);
    expect(totais(p)).toEqual([0, 0]);
  });

  it('nomes vazios ou só com espaços viram "Nós" e "Eles"', () => {
    expect(novaPartida(['  ', undefined], T0).nomes).toEqual(['Nós', 'Eles']);
  });

  it('nova partida com uma em andamento descarta a atual sem gravar no histórico (A2)', () => {
    const e = iniciar(somar(comPartida(), [0, 3]), ['X', 'Y'], t(5));
    expect(totais(e.atual!)).toEqual([0, 0]);
    expect(e.historico).toHaveLength(0);
  });
});

describe('UC-018 / RN-024 - Registrar pontos (CT-018.1, CT-018.2)', () => {
  it('soma +1, +3 e +6 → 10', () => {
    expect(totais(somar(comPartida(), [0, 1], [0, 3], [0, 6]).atual!)).toEqual([10, 0]);
  });

  it('só aceita 1, 3, 6, 9 ou 12', () => {
    const r = registrar(comPartida(), 0, 2, T0);
    expect(r.ok ? 'ok' : r.motivo).toBe('valor-invalido');
  });

  it('ao chegar a 11 avisa mão de onze; com as duas em 11, mão de ferro', () => {
    const e = somar(comPartida(), [0, 9], [0, 1]);
    const onze = registrar(e, 0, 1, T0);
    expect(onze.ok && onze.aviso).toBe('onze');
    const quase = somar(onze.ok ? onze.estado : e, [1, 9], [1, 1]);
    const ferro = registrar(quase, 1, 1, T0);
    expect(ferro.ok && ferro.aviso).toBe('ferro');
  });

  it('10 → +1 → +3: 14, vencedora declarada, partida no histórico e novos registros bloqueados', () => {
    const e = somar(comPartida(), [0, 1], [0, 3], [0, 6], [0, 1]);
    const r = registrar(e, 0, 3, t(9));
    expect(r.ok && r.aviso).toBe('vitoria');
    if (!r.ok) return;
    expect(totais(r.estado.atual!)).toEqual([14, 0]);
    expect(r.estado.atual!.vencedora).toBe(0);
    expect(r.estado.historico[0]!.id).toBe('p1');
    const bloqueado = registrar(r.estado, 1, 1, t(10));
    expect(bloqueado.ok ? 'ok' : bloqueado.motivo).toBe('encerrada');
  });

  it('sem partida, não registra', () => {
    const r = registrar({ historico: [] }, 0, 1, T0);
    expect(r.ok ? 'ok' : r.motivo).toBe('sem-partida');
  });
});

describe('UC-019 - Desfazer (CT-019.1, CT-019.2)', () => {
  it('desfazer o registro da vitória volta a 11, reabre a partida e tira do histórico', () => {
    const venceu = somar(comPartida(), [0, 1], [0, 3], [0, 6], [0, 1], [0, 3]);
    expect(venceu.historico).toHaveLength(1);
    const { estado, desfeito } = desfazer(venceu);
    expect(desfeito).toMatchObject({ dupla: 0, valor: 3 });
    expect(totais(estado.atual!)).toEqual([11, 0]);
    expect(estado.atual!.vencedora).toBeUndefined();
    expect(estado.historico).toHaveLength(0);
  });

  it('remove só o último registro', () => {
    const { estado } = desfazer(somar(comPartida(), [0, 3], [1, 6]));
    expect(totais(estado.atual!)).toEqual([3, 0]);
  });

  it('sem registros não há o que desfazer', () => {
    const e = comPartida();
    const r = desfazer(e);
    expect(r.desfeito).toBeUndefined();
    expect(r.estado).toEqual(e);
    expect(desfazer({ historico: [] }).desfeito).toBeUndefined();
  });
});

describe('UC-020 / RN-025 - Histórico (CT-020.1, CT-020.2)', () => {
  it('guarda no máximo 50 partidas, a mais recente primeiro', () => {
    let e: EstadoMarcador = { historico: [] };
    for (let i = 1; i <= 51; i++) {
      e = { ...e, atual: novaPartida([`A${i}`, 'B'], t(i), `p${i}`) };
      e = somar(e, [0, 12]);
    }
    expect(e.historico).toHaveLength(50);
    expect(e.historico[0]!.id).toBe('p51');
    expect(e.historico.some((h) => h.id === 'p1')).toBe(false);
  });

  it('apagar remove todo o histórico', () => {
    const e = somar(comPartida(), [1, 12]);
    expect(apagarHistorico(e).historico).toEqual([]);
  });

  it('dados corrompidos: registros ilegíveis são ignorados e contados (E1)', () => {
    const boa = somar(comPartida(), [1, 12]).atual!;
    const { estado, ignorados } = carregarEstado({
      atual: { id: 'quebrada' },
      historico: [boa, null, { id: 'x', nomes: ['a'], registros: [] }, { ...boa, id: 'outra', registros: [{ dupla: 3, valor: 1, instante: '' }] }],
    });
    expect(estado.historico.map((h) => h.id)).toEqual(['p1']);
    expect(ignorados).toBe(3);
    expect(estado.atual).toBeUndefined();
    expect(carregarEstado(undefined)).toEqual({ estado: { historico: [] }, ignorados: 0 });
  });

  it('a partida em andamento salva é recuperada (CT-017.2)', () => {
    const salvo = JSON.parse(JSON.stringify(somar(comPartida(), [0, 6], [1, 3], [0, 1])));
    const { estado } = carregarEstado(salvo);
    expect(totais(estado.atual!)).toEqual([7, 3]);
  });
});
