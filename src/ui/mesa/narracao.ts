import { duplaDe, nomeCarta } from '../../engine/index.ts';
import type { Assento, Dupla, EstadoPartida, Evento } from '../../engine/index.ts';

export const NOME_PEDIDO: Record<number, string> = { 3: 'Truco', 6: 'Seis', 9: 'Nove', 12: 'Doze' };

/** "Nós" é sempre a dupla do jogador; "Eles", a adversária. */
export function nomeDupla(dupla: Dupla, meuAssento: Assento): string {
  return dupla === duplaDe(meuAssento) ? 'Nós' : 'Eles';
}

function quem(participantes: EstadoPartida['participantes'], assento: Assento, meuAssento: Assento): string {
  return assento === meuAssento ? 'Você' : participantes[assento].nome;
}

/** Texto para a região acessível de narração (RNF-004, CA-022.2). */
export function narrar(e: Evento, participantes: EstadoPartida['participantes'], meu: Assento): string | undefined {
  switch (e.tipo) {
    case 'MAO_DISTRIBUIDA': {
      const tipo = e.tipoMao === 'ferro' ? ' Mão de ferro!' : e.tipoMao === 'onze' ? ' Mão de onze!' : '';
      return `Mão ${e.numero}: vira ${nomeCarta(e.vira)}, manilha ${e.manilha}.${tipo}`;
    }
    case 'DECISAO_ONZE_PENDENTE':
      return `${quem(participantes, e.decisor, meu)} decide se ${nomeDupla(e.dupla, meu).toLowerCase()} jogam a mão de onze.`;
    case 'ONZE_DECIDIDA':
      return e.decisao === 'jogar' ? `${nomeDupla(e.dupla, meu)} vão jogar a mão de onze, valendo 3.` : `${nomeDupla(e.dupla, meu)} correram da mão de onze.`;
    case 'CARTA_JOGADA':
      if (e.encoberta) return `${quem(participantes, e.assento, meu)} jogou uma carta encoberta.`;
      return `${quem(participantes, e.assento, meu)} jogou ${e.carta ? nomeCarta(e.carta) : 'uma carta'}${e.zap ? ' — o zap!' : e.manilha ? ', manilha' : ''}.`;
    case 'RODADA_ENCERRADA':
      return e.resultado === 'empate' ? `Rodada ${e.numero} empatou.` : `Rodada ${e.numero} para ${nomeDupla(e.resultado, meu)}.`;
    case 'TRUCO_PEDIDO':
      return `${quem(participantes, e.assento, meu)} pediu ${NOME_PEDIDO[e.valor]?.toLowerCase()}!`;
    case 'TRUCO_RESPONDIDO':
      if (e.resposta === 'aceitar') return `${quem(participantes, e.assento, meu)} aceitou. A mão vale ${e.valor}.`;
      if (e.resposta === 'correr') return `${quem(participantes, e.assento, meu)} correu.`;
      return undefined;
    case 'MAO_ENCERRADA':
      if (e.vencedora === null) return 'Mão empatada: ninguém pontua.';
      return `${nomeDupla(e.vencedora, meu)} ganharam ${e.pontos} ${e.pontos === 1 ? 'ponto' : 'pontos'}. Placar: ${e.placar[duplaDe(meu)]} × ${e.placar[1 - duplaDe(meu)]}.`;
    case 'PARTIDA_ENCERRADA':
      return e.vencedora === duplaDe(meu) ? 'Vocês venceram a partida!' : 'Eles venceram a partida.';
  }
}

/** Anúncio grande no centro da mesa para os momentos importantes. */
export function textoAnuncio(e: Evento, participantes: EstadoPartida['participantes']): { texto: string; forte: boolean } | undefined {
  switch (e.tipo) {
    case 'TRUCO_PEDIDO':
      return { texto: `${participantes[e.assento].nome}: ${NOME_PEDIDO[e.valor]}${e.valor === 12 ? '!!!' : '!'}`, forte: e.valor >= 9 };
    case 'TRUCO_RESPONDIDO':
      if (e.resposta === 'correr') return { texto: `${participantes[e.assento].nome} correu!`, forte: false };
      if (e.resposta === 'aceitar') return { texto: 'Desce!', forte: false };
      return undefined;
    case 'MAO_DISTRIBUIDA':
      if (e.tipoMao === 'onze') return { texto: 'Mão de onze!', forte: true };
      if (e.tipoMao === 'ferro') return { texto: 'Mão de ferro!', forte: true };
      return undefined;
    case 'CARTA_JOGADA':
      return e.zap ? { texto: 'Zap!', forte: true } : undefined;
  }
  return undefined;
}
