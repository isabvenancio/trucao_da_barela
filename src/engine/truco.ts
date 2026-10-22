import { duplaDe, proximoAssento } from './mesa.ts';
import type { Assento, EstadoMao, ValorPedido } from './tipos.ts';

/** RN-012: escada do truco a partir do valor vigente. */
export function proximoValorPedido(valorAtual: number): ValorPedido | undefined {
  if (valorAtual < 3) return 3;
  if (valorAtual < 6) return 6;
  if (valorAtual < 9) return 9;
  if (valorAtual < 12) return 12;
  return undefined;
}

/**
 * RN-013: só o participante da vez, antes de jogar, sem pedido pendente,
 * em mão normal, com valor menor que 12 e se sua dupla não fez o último pedido aceito.
 */
export function motivoTrucoProibido(mao: EstadoMao, assento: Assento): string | undefined {
  if (mao.resultado) return 'A mão já terminou.';
  if (mao.decisaoOnze) return 'Aguardando a decisão da mão de onze.';
  if (mao.pedido) return 'Já existe um pedido de truco pendente.';
  if (mao.vez !== assento) return 'Só quem está na vez pode pedir truco.';
  if (mao.tipo === 'onze') return 'Não há truco na mão de onze.';
  if (mao.tipo === 'ferro') return 'Não há truco na mão de ferro.';
  if (proximoValorPedido(mao.valor) === undefined) return 'A mão já vale 12.';
  if (mao.ultimaDuplaQuePediu === duplaDe(assento)) return 'Sua dupla não pode aumentar o próprio pedido.';
  return undefined;
}

/** RN-014: responde o primeiro adversário na ordem de jogo após o solicitante. */
export function respondenteDe(solicitante: Assento): Assento {
  return proximoAssento(solicitante);
}
