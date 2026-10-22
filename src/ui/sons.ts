import type { Dupla, Evento } from '../engine/index.ts';

/**
 * Efeitos sonoros (plano, seção 9.1). Cada evento tem um slot em public/sons/manifesto.json.
 * Slot com arquivo → toca o arquivo; slot vazio ou arquivo com erro → som sintetizado de reserva.
 */
export const SLOTS = [
  'distribuir', 'jogar', 'encoberta', 'suaVez', 'tempoAcabando', 'manilha', 'zap',
  'truco', 'seis', 'nove', 'doze', 'aceitar', 'correr',
  'ganharRodada', 'ganharMao', 'maoDeOnze', 'maoDeFerro', 'vitoria', 'derrota',
  'entrouSala', 'saiuSala',
] as const;

export type Slot = (typeof SLOTS)[number];

type Manifesto = Partial<Record<Slot, string | null>>;

let ctx: AudioContext | undefined;
let mestre: GainNode | undefined;
let volume = 0.7;
let ligado = true;
const arquivos = new Map<Slot, HTMLAudioElement>();
let carregando: Promise<void> | undefined;

export function configurarSom(opcoes: { ligado: boolean; volume: number }) {
  ligado = opcoes.ligado;
  volume = Math.max(0, Math.min(1, opcoes.volume / 100));
  for (const a of arquivos.values()) a.volume = volume;
}

/** Carrega o manifesto uma vez e pré-carrega os arquivos indicados. */
export function carregarSons(base = '/sons/'): Promise<void> {
  carregando ??= (async () => {
    try {
      const resposta = await fetch(`${base}manifesto.json`, { cache: 'no-cache' });
      if (!resposta.ok) return;
      const manifesto = (await resposta.json()) as Manifesto;
      for (const slot of SLOTS) {
        const arquivo = manifesto[slot];
        if (!arquivo) continue;
        const audio = new Audio(`${base}${arquivo}`);
        audio.preload = 'auto';
        audio.volume = volume;
        audio.addEventListener('error', () => arquivos.delete(slot));
        arquivos.set(slot, audio);
      }
    } catch {
      /* sem manifesto: só sons sintetizados */
    }
  })();
  return carregando;
}

export function tocar(slot: Slot): void {
  if (!ligado || volume === 0) return;
  const arquivo = arquivos.get(slot);
  if (arquivo) {
    const copia = arquivo.cloneNode(true) as HTMLAudioElement;
    copia.volume = volume;
    copia.play().catch(() => sintetizar(slot));
    return;
  }
  sintetizar(slot);
}

/** Converte os eventos do motor nos sons a tocar, do ponto de vista de `minhaDupla`. */
export function sonsDosEventos(eventos: readonly Evento[], minhaDupla: Dupla): Slot[] {
  const sons: Slot[] = [];
  for (const e of eventos) {
    switch (e.tipo) {
      case 'MAO_DISTRIBUIDA':
        sons.push(e.tipoMao === 'ferro' ? 'maoDeFerro' : e.tipoMao === 'onze' ? 'maoDeOnze' : 'distribuir');
        break;
      case 'CARTA_JOGADA':
        sons.push(e.encoberta ? 'encoberta' : e.zap ? 'zap' : e.manilha ? 'manilha' : 'jogar');
        break;
      case 'TRUCO_PEDIDO':
        sons.push(({ 3: 'truco', 6: 'seis', 9: 'nove', 12: 'doze' } as const)[e.valor]);
        break;
      case 'TRUCO_RESPONDIDO':
        if (e.resposta !== 'aumentar') sons.push(e.resposta === 'aceitar' ? 'aceitar' : 'correr');
        break;
      case 'ONZE_DECIDIDA':
        if (e.decisao === 'correr') sons.push('correr');
        break;
      case 'RODADA_ENCERRADA':
        if (e.resultado === minhaDupla) sons.push('ganharRodada');
        break;
      case 'MAO_ENCERRADA':
        if (e.vencedora === minhaDupla) sons.push('ganharMao');
        break;
      case 'PARTIDA_ENCERRADA':
        sons.push(e.vencedora === minhaDupla ? 'vitoria' : 'derrota');
        break;
    }
  }
  // Na virada de mão, o som da nova distribuição vem depois do resultado.
  return sons;
}

/** Toca uma sequência com pequeno intervalo entre os sons. */
export function tocarSequencia(slots: readonly Slot[], intervaloMs = 140): void {
  slots.forEach((s, i) => window.setTimeout(() => tocar(s), i * intervaloMs));
}

/* ------------------------- Reserva sintetizada (Web Audio) ------------------------- */

function agora(): number | undefined {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return undefined;
      ctx = new Ctor();
      mestre = ctx.createGain();
      mestre.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    mestre!.gain.value = volume * 0.35;
    return ctx.currentTime + 0.02;
  } catch {
    return undefined;
  }
}

function osc(t: number, tipo: OscillatorType, f0: number, f1: number, d: number, v: number) {
  const o = ctx!.createOscillator();
  const g = ctx!.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + d);
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g).connect(mestre!);
  o.start(t);
  o.stop(t + d + 0.02);
}

function ruido(t: number, d: number, v: number, filtro: BiquadFilterType, freq: number) {
  const buffer = ctx!.createBuffer(1, Math.ceil(ctx!.sampleRate * d), ctx!.sampleRate);
  const dados = buffer.getChannelData(0);
  for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
  const fonte = ctx!.createBufferSource();
  const f = ctx!.createBiquadFilter();
  const g = ctx!.createGain();
  fonte.buffer = buffer;
  f.type = filtro;
  f.frequency.value = freq;
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + d);
  fonte.connect(f).connect(g).connect(mestre!);
  fonte.start(t);
}

const SINTESE: Record<Slot, (t: number) => void> = {
  distribuir: (t) => { for (let i = 0; i < 6; i++) ruido(t + i * 0.07, 0.05, 0.5, 'bandpass', 1800 + i * 150); },
  jogar: (t) => { osc(t, 'square', 190, 80, 0.09, 0.5); ruido(t, 0.06, 0.4, 'lowpass', 900); },
  encoberta: (t) => { ruido(t, 0.18, 0.5, 'lowpass', 450); osc(t, 'triangle', 140, 90, 0.15, 0.3); },
  suaVez: (t) => { osc(t, 'triangle', 880, 880, 0.07, 0.4); osc(t + 0.1, 'triangle', 1175, 1175, 0.09, 0.4); },
  tempoAcabando: (t) => { [0, 0.35, 0.6, 0.8, 0.95].forEach((d, i) => { ruido(t + d, 0.03, 0.6, 'highpass', 3000); osc(t + d, 'square', 1200 + i * 120, 1200 + i * 120, 0.03, 0.15); }); },
  manilha: (t) => { [1319, 1760, 2093, 2637].forEach((f, i) => osc(t + i * 0.05, 'triangle', f, f, 0.12, 0.35)); },
  zap: (t) => { [1319, 1760, 2093, 2637, 3136].forEach((f, i) => osc(t + i * 0.045, 'triangle', f, f, 0.12, 0.35)); osc(t + 0.25, 'sine', 90, 40, 0.5, 0.8); ruido(t + 0.25, 0.3, 0.4, 'lowpass', 300); },
  truco: (t) => { ruido(t, 0.06, 0.5, 'lowpass', 1500); [0, 0.18].forEach((d) => osc(t + d, 'square', 220, 440, 0.15, 0.35)); },
  seis: (t) => { ruido(t, 0.06, 0.5, 'lowpass', 1500); [0, 0.15, 0.3].forEach((d) => osc(t + d, 'square', 294, 587, 0.13, 0.35)); },
  nove: (t) => { ruido(t, 0.06, 0.5, 'lowpass', 1500); [0, 0.11, 0.22, 0.33].forEach((d) => osc(t + d, 'square', 392, 784, 0.1, 0.35)); },
  doze: (t) => { osc(t, 'sawtooth', 70, 35, 0.7, 0.6); ruido(t, 0.4, 0.6, 'lowpass', 250); osc(t + 0.2, 'sawtooth', 180, 1400, 1.1, 0.25); [1.35, 1.5, 1.65].forEach((d) => osc(t + d, 'square', 1047, 1047, 0.12, 0.35)); osc(t + 1.8, 'square', 1568, 1568, 0.4, 0.35); },
  aceitar: (t) => { [523, 659, 784].forEach((f) => osc(t, 'square', f, f, 0.28, 0.18)); osc(t, 'triangle', 262, 262, 0.3, 0.3); },
  correr: (t) => { osc(t, 'triangle', 392, 392, 0.18, 0.45); osc(t + 0.2, 'triangle', 370, 370, 0.18, 0.45); osc(t + 0.4, 'triangle', 349, 349, 0.18, 0.45); osc(t + 0.6, 'triangle', 330, 110, 0.7, 0.45); },
  ganharRodada: (t) => { osc(t, 'square', 660, 660, 0.07, 0.3); osc(t + 0.08, 'square', 990, 990, 0.14, 0.3); },
  ganharMao: (t) => { osc(t, 'square', 988, 988, 0.07, 0.3); osc(t + 0.07, 'square', 1319, 1319, 0.35, 0.3); },
  maoDeOnze: (t) => { [0, 0.25, 0.45, 0.6, 0.72].forEach((d, i) => { osc(t + d, 'sine', 130, 60, 0.2, 0.4 + i * 0.12); ruido(t + d, 0.05, 0.2 + i * 0.06, 'lowpass', 600); }); },
  maoDeFerro: (t) => { [820, 1130, 1560, 2110, 2890].forEach((f) => osc(t, 'square', f, f * 0.99, 0.9, 0.09)); ruido(t, 0.04, 0.7, 'highpass', 2500); osc(t, 'sine', 180, 150, 0.4, 0.4); },
  vitoria: (t) => { [523, 659, 784, 1047].forEach((f, i) => osc(t + i * 0.12, 'square', f, f, 0.12, 0.3)); [1047, 1319, 1568].forEach((f) => osc(t + 0.5, 'square', f, f, 0.7, 0.16)); osc(t + 0.5, 'triangle', 523, 523, 0.7, 0.35); },
  derrota: (t) => { [392, 370, 349, 330].forEach((f, i) => osc(t + i * 0.28, 'square', f, f, 0.26, 0.28)); osc(t + 1.12, 'triangle', 262, 98, 0.8, 0.4); },
  entrouSala: (t) => osc(t, 'square', 440, 880, 0.12, 0.3),
  saiuSala: (t) => osc(t, 'square', 880, 440, 0.12, 0.3),
};

function sintetizar(slot: Slot): void {
  const t = agora();
  if (t === undefined) return;
  try {
    SINTESE[slot](t);
  } catch {
    /* navegador sem Web Audio completo: silêncio */
  }
}
