import {
  aplicarAcao,
  assentoDaVez,
  criarPartida,
  eventosParaAssento,
  visaoDoAssento,
} from '../engine/index.ts';
import type { Acao, Assento, EstadoPartida, Evento, Participante, Rodada } from '../engine/index.ts';
import { aplicarSinaisDosBots, comecouMao, decidirBot } from '../bots/index.ts';
import { assentosOcupados, controladoPorBot, presente, transferirAnfitriao } from './sala.ts';
import type { AssentoPublico, RespostaEstado, Sala } from './tipos.ts';
import { ErroServidor } from './tipos.ts';

/** Ritmo da mesa online, em ms. */
export const RITMO = { bot: 900, rodada: 1800, mao: 2600 };
/** RN-021: prazos das decisões humanas, em ms. */
export const PRAZO = { jogada: 30_000, decisao: 20_000 };
/** Sem nenhum humano presente por este tempo, a partida é encerrada (UC-014 A4). */
export const MS_SEM_HUMANOS = 120_000;
/** Horas de inatividade até uma partida em andamento expirar. */
const HORAS_INATIVIDADE = 2;
const MAX_LOTES = 40;

const mais = (agora: Date, ms: number) => new Date(agora.getTime() + ms).toISOString();

function participantesDa(sala: Sala): EstadoPartida['participantes'] {
  return sala.assentos.map(
    (o): Participante => ({ nome: o!.nome, avatar: o!.avatar, tipo: o!.tipo, ...(o!.dificuldade ? { dificuldade: o!.dificuldade } : {}) }),
  ) as EstadoPartida['participantes'];
}

function registrarLote(sala: Sala, eventos: Evento[]) {
  if (eventos.length === 0) return;
  sala.lotes = [...sala.lotes, { versao: sala.versao + 1, eventos }].slice(-MAX_LOTES);
}

/** Depois de cada ação: guarda eventos, pausa de fim de rodada, ritmo dos bots e prazo do humano. */
function depoisDaAcao(sala: Sala, anterior: EstadoPartida, novo: EstadoPartida, eventos: Evento[], agora: Date) {
  // RN-027: bots sinalizam ao parceiro assim que a mão começa.
  if (comecouMao(eventos) && novo.fase === 'jogando') {
    const s = aplicarSinaisDosBots(novo, (a) => {
      const o = sala.assentos[a];
      return o?.tipo === 'bot' ? (o.dificuldade ?? 'medio') : undefined;
    });
    novo = s.estado;
    eventos = [...eventos, ...s.eventos];
  }
  sala.partida = novo;
  registrarLote(sala, eventos);
  sala.expiraEm = mais(agora, HORAS_INATIVIDADE * 3_600_000);

  const fimMao = eventos.some((e) => e.tipo === 'MAO_ENCERRADA');
  const fimRodada = eventos.find((e) => e.tipo === 'RODADA_ENCERRADA');
  const espera = fimMao ? RITMO.mao : fimRodada ? RITMO.rodada : RITMO.bot;

  if (fimRodada && fimRodada.tipo === 'RODADA_ENCERRADA') {
    let rodada: Rodada;
    if (novo.mao.numero === anterior.mao.numero) {
      rodada = novo.mao.rodadas[novo.mao.rodadas.length - 2]!;
    } else {
      const ultima = structuredClone(anterior.mao.rodadas[anterior.mao.rodadas.length - 1]!);
      const jogada = eventos.find((e) => e.tipo === 'CARTA_JOGADA');
      if (jogada && jogada.tipo === 'CARTA_JOGADA' && jogada.carta) {
        ultima.jogadas.push({ assento: jogada.assento, carta: jogada.carta, encoberta: jogada.encoberta });
      }
      ultima.resultado = fimRodada.resultado;
      if (fimRodada.vencedor !== undefined) ultima.vencedor = fimRodada.vencedor;
      rodada = ultima;
    }
    sala.destaque = { rodada, placar: [novo.placar[0], novo.placar[1]], ate: mais(agora, espera) };
  } else {
    delete sala.destaque;
  }

  sala.proximoBotEm = mais(agora, espera);
  const vez = assentoDaVez(novo);
  if (novo.fase === 'jogando' && vez !== undefined && presente(sala.assentos[vez] ?? null, agora)) {
    const decidir = novo.mao.pedido || novo.mao.decisaoOnze ? PRAZO.decisao : PRAZO.jogada;
    sala.prazo = mais(agora, espera + decidir);
  } else {
    delete sala.prazo;
  }
  if (novo.fase === 'encerrada') {
    delete sala.prazo;
    sala.expiraEm = mais(agora, HORAS_INATIVIDADE * 3_600_000);
  }
}

/** UC-008 e UC-016: inicia a partida (ou a revanche) com os 4 assentos ocupados. */
export function iniciarPartida(sala: Sala, meu: Assento, agora: Date, semente: number): void {
  if (sala.anfitriao !== meu) throw new ErroServidor('SEM_PERMISSAO', 'Só o anfitrião pode iniciar a partida.', 403);
  const revanche = sala.situacao === 'em_jogo' && sala.partida?.fase === 'encerrada';
  if (!revanche) {
    if (sala.situacao !== 'aguardando') throw new ErroServidor('SALA_EM_JOGO', 'A partida já está em andamento.', 409);
    if (new Date(sala.expiraEm) < agora) throw new ErroServidor('SALA_EXPIRADA', 'Esta sala expirou sem começar.', 410);
    const faltam = 4 - assentosOcupados(sala);
    if (faltam > 0) throw new ErroServidor('ASSENTOS_VAZIOS', `Falta${faltam > 1 ? 'm' : ''} ${faltam} participante${faltam > 1 ? 's' : ''}.`, 409);
  } else {
    // RN-026: na revanche, quem saiu vira bot.
    sala.assentos = sala.assentos.map((o) => (o?.saiu ? { tipo: 'bot', nome: o.nome, avatar: o.avatar, dificuldade: 'medio' } : o)) as Sala['assentos'];
  }
  const anterior = sala.partida;
  const { estado, eventos } = criarPartida({ participantes: participantesDa(sala), semente });
  sala.situacao = 'em_jogo';
  depoisDaAcao(sala, anterior ?? estado, estado, eventos, agora);
  delete sala.destaque;
}

/** UC-010 a UC-013: ação de um humano, validada pelo motor no servidor (RNF-001). */
export function acaoHumana(sala: Sala, meu: Assento, acao: Acao, agora: Date): void {
  if (sala.situacao !== 'em_jogo' || !sala.partida) throw new ErroServidor('REGRA', 'Não há partida em andamento.', 409);
  const anterior = sala.partida;
  const r = aplicarAcao(anterior, { ...acao, assento: meu } as Acao);
  if (!r.ok) throw new ErroServidor('REGRA', r.erro.mensagem, 422);
  if (acao.tipo === 'SINALIZAR') {
    // Sinal não mexe no prazo, na pausa nem no ritmo dos bots (RN-027).
    sala.partida = r.estado;
    registrarLote(sala, r.eventos);
    return;
  }
  depoisDaAcao(sala, anterior, r.estado, r.eventos, agora);
}

/**
 * Avança a mesa quando ninguém humano precisa agir: uma jogada de bot por vez, respeitando o ritmo,
 * decisão automática quando o prazo de um humano expira (RN-021), e encerramento por abandono.
 * Retorna se a sala mudou.
 */
export function avancar(sala: Sala, agora: Date, aleatorio: () => number = Math.random): boolean {
  if (sala.situacao === 'aguardando' && new Date(sala.expiraEm) < agora) {
    sala.situacao = 'encerrada';
    return true;
  }
  const partida = sala.partida;
  if (sala.situacao !== 'em_jogo' || !partida) return false;

  const algumPresente = sala.assentos.some((o) => presente(o, agora));
  if (!algumPresente) {
    const ultimoSinal = Math.max(...sala.assentos.map((o) => (o?.ultimoSinal && !o.saiu ? new Date(o.ultimoSinal).getTime() : 0)));
    if (agora.getTime() - ultimoSinal > MS_SEM_HUMANOS || sala.assentos.every((o) => o?.tipo !== 'humano' || o.saiu)) {
      sala.situacao = 'encerrada';
      sala.expiraEm = agora.toISOString();
      return true;
    }
    return false; // ninguém olhando: não adianta jogar sozinho
  }
  const anfitriaoAntes = sala.anfitriao;
  if (!presente(sala.assentos[sala.anfitriao] ?? null, agora)) transferirAnfitriao(sala, agora);
  const trocouAnfitriao = sala.anfitriao !== anfitriaoAntes;
  if (partida.fase !== 'jogando') return trocouAnfitriao;

  const vez = assentoDaVez(partida);
  if (vez === undefined) return trocouAnfitriao;
  const ocupante = sala.assentos[vez] ?? null;
  const porBot = controladoPorBot(ocupante, agora);
  if (!porBot && !sala.prazo) {
    // Humano na vez sem prazo: ele voltou (UC-015) ou reapareceu depois que a vez dele começou.
    // Sem isso, se ele não jogar, a mesa fica parada para sempre (RN-021).
    const decidir = partida.mao.pedido || partida.mao.decisaoOnze ? PRAZO.decisao : PRAZO.jogada;
    sala.prazo = mais(agora, decidir);
    return true;
  }
  const liberado = porBot
    ? !sala.proximoBotEm || agora >= new Date(sala.proximoBotEm)
    : !!sala.prazo && agora >= new Date(sala.prazo);
  if (!liberado) return trocouAnfitriao;

  const nivel = ocupante?.tipo === 'bot' ? (ocupante.dificuldade ?? 'medio') : 'medio';
  const decisao = decidirBot(visaoDoAssento(partida, vez), nivel, aleatorio);
  if (!decisao) return false;
  const r = aplicarAcao(partida, decisao.acao);
  if (!r.ok) return false;
  depoisDaAcao(sala, partida, r.estado, r.eventos, agora);
  return true;
}

/** O que o navegador de `meu` pode saber da sala (RN-018, RNF-002). */
export function respostaPara(sala: Sala, meu: Assento, desde: number, agora: Date): RespostaEstado {
  const assentos: AssentoPublico[] = sala.assentos.map((o, i) => ({
    assento: i as Assento,
    ocupado: !!o,
    ...(o ? { tipo: o.tipo, nome: o.nome, avatar: o.avatar } : {}),
    ...(o?.dificuldade ? { dificuldade: o.dificuldade } : {}),
    anfitriao: sala.anfitriao === i,
    botNoLugar: !!o && o.tipo === 'humano' && controladoPorBot(o, agora),
    souEu: i === meu,
  }));
  const resposta: RespostaEstado = {
    codigo: sala.codigo,
    situacao: sala.situacao,
    versao: sala.versao,
    meuAssento: meu,
    souAnfitriao: sala.anfitriao === meu,
    assentos,
    expiraEm: sala.expiraEm,
    lotes: sala.lotes
      .filter((l) => l.versao > desde)
      .map((l) => ({ versao: l.versao, eventos: eventosParaAssento(l.eventos, meu) })),
    agora: agora.toISOString(),
  };
  if (sala.partida) resposta.visao = visaoDoAssento(sala.partida, meu);
  if (sala.prazo && sala.partida && assentoDaVez(sala.partida) === meu) resposta.prazo = sala.prazo;
  if (sala.destaque && new Date(sala.destaque.ate) > agora) {
    resposta.destaque = {
      ...sala.destaque,
      rodada: {
        iniciante: sala.destaque.rodada.iniciante,
        resultado: sala.destaque.rodada.resultado,
        vencedor: sala.destaque.rodada.vencedor,
        jogadas: sala.destaque.rodada.jogadas.map((j) => ({
          assento: j.assento,
          encoberta: j.encoberta,
          carta: j.encoberta && j.assento !== meu ? null : j.carta,
        })),
      },
    };
  }
  return resposta;
}
