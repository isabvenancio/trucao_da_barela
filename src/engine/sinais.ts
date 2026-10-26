import { duplaDe } from './mesa.ts';
import type { Assento, EstadoPartida, Sinal } from './tipos.ts';

/** RN-027: todos os sinais, do mais forte para o mais fraco. */
export const SINAIS: readonly Sinal[] = ['zap', 'copas', 'espadilha', 'picafumo', 'tres', 'dois', 'as', 'nada', 'truca'];
export const MAX_SINAIS_POR_MAO = 3;

/** Motivo pelo qual o assento não pode sinalizar agora (ou `undefined` se pode). */
export function motivoSinalProibido(estado: EstadoPartida, assento: Assento, sinal?: Sinal): string | undefined {
  if (estado.fase === 'encerrada') return 'A partida já terminou.';
  const mao = estado.mao;
  if (mao.resultado) return 'A mão já terminou.';
  if (mao.tipo === 'ferro') return 'Não há sinais na mão de ferro.';
  if (mao.cartas[assento].length === 0) return 'Você não tem mais cartas nesta mão.';
  const meus = (mao.sinais ?? []).filter((s) => s.assento === assento);
  if (meus.length >= MAX_SINAIS_POR_MAO) return `No máximo ${MAX_SINAIS_POR_MAO} sinais por mão.`;
  if (sinal !== undefined) {
    if (!SINAIS.includes(sinal)) return 'Sinal desconhecido.';
    if (meus.some((s) => s.sinal === sinal)) return 'Você já fez esse sinal nesta mão.';
  }
  return undefined;
}

/** Sinais que o assento ainda pode fazer nesta mão. */
export function sinaisDisponiveis(estado: EstadoPartida, assento: Assento): Sinal[] {
  if (motivoSinalProibido(estado, assento)) return [];
  return SINAIS.filter((s) => !motivoSinalProibido(estado, assento, s));
}

/** Sinais visíveis para o assento: os dele e os do parceiro — nunca os da dupla adversária (RN-018). */
export function sinaisVisiveis(estado: EstadoPartida, assento: Assento) {
  return (estado.mao.sinais ?? []).filter((s) => duplaDe(s.assento) === duplaDe(assento));
}
