/**
 * Marcador de pontos para partidas com baralho físico (RN-024, RN-025).
 * Lógica pura: sem React nem armazenamento, para ser testada isoladamente.
 */

export type DuplaMarcador = 0 | 1;
export type ValorRegistro = 1 | 3 | 6 | 9 | 12;

export const VALORES_PERMITIDOS: readonly ValorRegistro[] = [1, 3, 6, 9, 12];
export const PONTOS_VITORIA = 12;
export const LIMITE_HISTORICO = 50;
export const NOMES_PADRAO: [string, string] = ['Nós', 'Eles'];

export interface Registro {
  dupla: DuplaMarcador;
  valor: ValorRegistro;
  /** ISO 8601 */
  instante: string;
}

export interface PartidaMarcador {
  id: string;
  nomes: [string, string];
  registros: Registro[];
  criadaEm: string;
  encerradaEm?: string;
  vencedora?: DuplaMarcador;
}

export interface EstadoMarcador {
  atual?: PartidaMarcador;
  /** Mais recentes primeiro (RN-025). */
  historico: PartidaMarcador[];
}

export type Aviso = 'onze' | 'ferro' | 'vitoria';

export function totais(p: PartidaMarcador): [number, number] {
  const t: [number, number] = [0, 0];
  for (const r of p.registros) t[r.dupla] += r.valor;
  return t;
}

export function encerrada(p: PartidaMarcador): boolean {
  return p.vencedora !== undefined;
}

function limparNome(nome: string | undefined, padrao: string): string {
  const limpo = (nome ?? '').trim().slice(0, 24);
  return limpo || padrao;
}

/** UC-017: nova partida 0×0 com os nomes informados ou os padrão. */
export function novaPartida(
  nomes: [string?, string?],
  agora: Date,
  id = `m-${agora.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
): PartidaMarcador {
  return {
    id,
    nomes: [limparNome(nomes[0], NOMES_PADRAO[0]), limparNome(nomes[1], NOMES_PADRAO[1])],
    registros: [],
    criadaEm: agora.toISOString(),
  };
}

/** RN-024: aviso de mão de onze (uma dupla com 11) ou de ferro (as duas com 11). */
export function avisoDoPlacar(t: [number, number]): Exclude<Aviso, 'vitoria'> | undefined {
  if (t[0] === 11 && t[1] === 11) return 'ferro';
  if (t[0] === 11 || t[1] === 11) return 'onze';
  return undefined;
}

export type ResultadoRegistro =
  | { ok: true; estado: EstadoMarcador; aviso?: Aviso }
  | { ok: false; motivo: 'sem-partida' | 'encerrada' | 'valor-invalido' };

/** UC-018 / RN-024: soma um valor permitido; ao chegar a 12 ou mais, declara a vencedora e grava no histórico. */
export function registrar(estado: EstadoMarcador, dupla: DuplaMarcador, valor: number, agora: Date): ResultadoRegistro {
  const p = estado.atual;
  if (!p) return { ok: false, motivo: 'sem-partida' };
  if (encerrada(p)) return { ok: false, motivo: 'encerrada' };
  if (!VALORES_PERMITIDOS.includes(valor as ValorRegistro)) return { ok: false, motivo: 'valor-invalido' };

  const atual: PartidaMarcador = {
    ...p,
    registros: [...p.registros, { dupla, valor: valor as ValorRegistro, instante: agora.toISOString() }],
  };
  const t = totais(atual);
  if (t[dupla] >= PONTOS_VITORIA) {
    atual.vencedora = dupla;
    atual.encerradaEm = agora.toISOString();
    return { ok: true, estado: { atual, historico: adicionarAoHistorico(estado.historico, atual) }, aviso: 'vitoria' };
  }
  return { ok: true, estado: { ...estado, atual }, aviso: avisoDoPlacar(t) };
}

/** UC-019 / RN-024: remove só o último registro; se ele encerrou a partida, reabre e tira do histórico. */
export function desfazer(estado: EstadoMarcador): { estado: EstadoMarcador; desfeito?: Registro } {
  const p = estado.atual;
  if (!p || p.registros.length === 0) return { estado };
  const desfeito = p.registros[p.registros.length - 1]!;
  const atual: PartidaMarcador = { ...p, registros: p.registros.slice(0, -1) };
  let historico = estado.historico;
  if (encerrada(p)) {
    delete atual.vencedora;
    delete atual.encerradaEm;
    historico = historico.filter((h) => h.id !== p.id);
  }
  return { estado: { atual, historico }, desfeito };
}

/** RN-025: mais recente primeiro, no máximo 50. */
export function adicionarAoHistorico(historico: readonly PartidaMarcador[], p: PartidaMarcador): PartidaMarcador[] {
  return [p, ...historico.filter((h) => h.id !== p.id)].slice(0, LIMITE_HISTORICO);
}

/** UC-017 A2 / nova partida: descarta a atual (em andamento não vai para o histórico). */
export function iniciar(estado: EstadoMarcador, nomes: [string?, string?], agora: Date): EstadoMarcador {
  return { ...estado, atual: novaPartida(nomes, agora) };
}

export function apagarHistorico(estado: EstadoMarcador): EstadoMarcador {
  return { ...estado, historico: [] };
}

/* ---------------- Leitura segura do que está salvo (UC-020 E1) ---------------- */

function ehRegistro(r: unknown): r is Registro {
  const x = r as Registro;
  return !!x && (x.dupla === 0 || x.dupla === 1) && VALORES_PERMITIDOS.includes(x.valor) && typeof x.instante === 'string';
}

function ehPartida(p: unknown): p is PartidaMarcador {
  const x = p as PartidaMarcador;
  return (
    !!x &&
    typeof x.id === 'string' &&
    Array.isArray(x.nomes) &&
    x.nomes.length === 2 &&
    x.nomes.every((n) => typeof n === 'string') &&
    Array.isArray(x.registros) &&
    x.registros.every(ehRegistro) &&
    typeof x.criadaEm === 'string' &&
    (x.vencedora === undefined || x.vencedora === 0 || x.vencedora === 1)
  );
}

/** Valida o que veio do armazenamento: registros ilegíveis são ignorados e contados. */
export function carregarEstado(bruto: unknown): { estado: EstadoMarcador; ignorados: number } {
  const x = (bruto ?? {}) as { atual?: unknown; historico?: unknown };
  const lista = Array.isArray(x.historico) ? x.historico : [];
  const historico = lista.filter(ehPartida).slice(0, LIMITE_HISTORICO);
  const estado: EstadoMarcador = { historico };
  if (ehPartida(x.atual)) estado.atual = x.atual;
  return { estado, ignorados: lista.length - historico.length };
}
