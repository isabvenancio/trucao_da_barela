import { useCallback, useEffect, useRef, useState } from 'react';
import {
  aplicarAcao,
  assentoDaVez,
  criarPartida,
  criarRevanche,
  eventosParaAssento,
  mesmaCarta,
  visaoDoAssento,
} from '../../engine/index.ts';
import type { Acao, Assento, Dificuldade, EstadoPartida, Evento, Participante, VisaoMesa } from '../../engine/index.ts';
import { aplicarSinaisDosBots, comecouMao, decidirBot } from '../../bots/index.ts';
import { AVATARES } from '../arte/avatares.tsx';
import { apagar, FATOR_VELOCIDADE, gravar, lerBruto } from '../armazenamento.ts';
import type { Perfil, Preferencias } from '../armazenamento.ts';
import { sonsDosEventos, tocar, tocarSequencia } from '../sons.ts';
import { narrar, textoAnuncio } from './narracao.ts';

export const MEU_ASSENTO: Assento = 0;
export const CHAVE_PARTIDA_BOTS = 'trucao.partidaBots.v1';

export interface ConfigBots {
  parceiro: Dificuldade;
  adversarios: Dificuldade;
}

interface PartidaSalva {
  estado: EstadoPartida;
  config: ConfigBots;
}

export interface Anuncio {
  id: number;
  texto: string;
  forte: boolean;
}

const NOMES_BOTS = ['Tijolo', 'Cascalho', 'Brasa', 'Musgo', 'Granito', 'Argila', 'Pavio', 'Sereno'];

/** Tempos base em ms, multiplicados pela velocidade das preferências (UC-002). */
const TEMPO = { bot: 750, rodada: 1300, mao: 2100, anuncio: 1700 };

/** RN-027: os bots (assentos 1 a 3) sinalizam ao parceiro no começo de cada mão. */
function comSinaisDosBots(estado: EstadoPartida, eventos: Evento[]): { estado: EstadoPartida; eventos: Evento[] } {
  if (!comecouMao(eventos) || estado.fase !== 'jogando') return { estado, eventos };
  const s = aplicarSinaisDosBots(estado, (a) => (estado.participantes[a].tipo === 'bot' ? (estado.participantes[a].dificuldade ?? 'medio') : undefined));
  return { estado: s.estado, eventos: [...eventos, ...s.eventos] };
}

function sortear<T>(lista: readonly T[], quantos: number): T[] {
  return [...lista].sort(() => Math.random() - 0.5).slice(0, quantos);
}

function montarParticipantes(perfil: Perfil, config: ConfigBots): EstadoPartida['participantes'] {
  const [p, a1, a2] = sortear(NOMES_BOTS, 3) as [string, string, string];
  const avatares = sortear(AVATARES.filter((a) => a.id !== perfil.avatar), 3).map((a) => a.id);
  const bot = (nome: string, avatar: string, dificuldade: Dificuldade): Participante => ({ nome, avatar, tipo: 'bot', dificuldade });
  return [
    { nome: perfil.apelido.trim(), avatar: perfil.avatar, tipo: 'humano' },
    bot(a1, avatares[0]!, config.adversarios),
    bot(p, avatares[1]!, config.parceiro),
    bot(a2, avatares[2]!, config.adversarios),
  ];
}

/**
 * Vista "congelada" exibida durante a pausa no fim de uma rodada ou de uma mão,
 * para o jogador ver as quatro cartas antes de a mesa ser limpa.
 */
function vistaDaPausa(anterior: EstadoPartida, novo: EstadoPartida, eventos: Evento[]): VisaoMesa {
  const fimMao = eventos.find((e) => e.tipo === 'MAO_ENCERRADA');
  if (!fimMao) {
    const v = visaoDoAssento(novo, MEU_ASSENTO);
    return { ...v, rodadas: v.rodadas.slice(0, -1), acoes: [], aguardando: undefined };
  }
  const v = visaoDoAssento(anterior, MEU_ASSENTO);
  const jogada = eventos.find((e) => e.tipo === 'CARTA_JOGADA');
  const rodada = eventos.find((e) => e.tipo === 'RODADA_ENCERRADA');
  const ultima = v.rodadas[v.rodadas.length - 1]!;
  if (jogada && jogada.tipo === 'CARTA_JOGADA') {
    ultima.jogadas.push({ assento: jogada.assento, encoberta: jogada.encoberta, carta: jogada.encoberta && jogada.assento !== MEU_ASSENTO ? null : jogada.carta });
    if (jogada.assento === MEU_ASSENTO) {
      const i = v.minhasCartas.findIndex((c) => c === null || (jogada.carta !== null && mesmaCarta(c, jogada.carta)));
      if (i >= 0) v.minhasCartas.splice(i, 1);
    }
    v.quantidadeCartas[jogada.assento] -= 1;
  }
  if (rodada && rodada.tipo === 'RODADA_ENCERRADA') {
    ultima.resultado = rodada.resultado;
    ultima.vencedor = rodada.vencedor;
  }
  if (fimMao.tipo === 'MAO_ENCERRADA') v.placar = fimMao.placar;
  return { ...v, acoes: [], aguardando: undefined, pedido: undefined, decisaoOnze: undefined, cartasParceiro: undefined };
}

export function usePartidaContraBots(preferencias: Preferencias) {
  const [jogo, setJogo] = useState<PartidaSalva | null>(null);
  const [pausa, setPausa] = useState<VisaoMesa | null>(null);
  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);
  const [narracao, setNarracao] = useState<string[]>([]);
  const [salva, setSalva] = useState<PartidaSalva | undefined>(() => lerBruto<PartidaSalva>(CHAVE_PARTIDA_BOTS));

  const jogoRef = useRef(jogo);
  jogoRef.current = jogo;
  const pausaRef = useRef(pausa);
  pausaRef.current = pausa;
  const fator = FATOR_VELOCIDADE[preferencias.velocidade];
  const timers = useRef<number[]>([]);

  const agendar = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current = timers.current.filter((t) => t !== id);
      fn();
    }, ms);
    timers.current.push(id);
  }, []);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  /** Sons, anúncios e narração de um lote de eventos. */
  const processar = useCallback(
    (todos: Evento[], estado: EstadoPartida) => {
      // Só o que o jogador pode saber (RN-018): sinais da dupla adversária e cartas encobertas alheias ficam de fora.
      const eventos = eventosParaAssento(todos, MEU_ASSENTO);
      if (eventos.length === 0) return;
      tocarSequencia(sonsDosEventos(eventos, 0, MEU_ASSENTO));
      const frases = eventos.map((e) => narrar(e, estado.participantes, MEU_ASSENTO)).filter((f): f is string => !!f);
      if (frases.length) setNarracao((n) => [...n, ...frases].slice(-8));
      for (const e of eventos) {
        const a = textoAnuncio(e, estado.participantes);
        if (a) {
          const id = Date.now() + Math.random();
          setAnuncio({ id, ...a });
          agendar(() => setAnuncio((atual) => (atual?.id === id ? null : atual)), TEMPO.anuncio * fator);
        }
      }
    },
    [agendar, fator],
  );

  const salvar = useCallback((p: PartidaSalva) => {
    if (p.estado.fase === 'jogando') gravar(CHAVE_PARTIDA_BOTS, p);
    else apagar(CHAVE_PARTIDA_BOTS);
  }, []);

  /** Aplica uma ação (humana ou de bot) e cuida das pausas de fim de rodada e de mão. */
  const aplicar = useCallback(
    (acao: Acao): boolean => {
      const atual = jogoRef.current;
      if (!atual || pausaRef.current) return false;
      const aplicado = aplicarAcao(atual.estado, acao);
      if (!aplicado.ok) {
        setNarracao((n) => [...n, aplicado.erro.mensagem].slice(-8));
        return false;
      }
      const r = { ok: true as const, ...comSinaisDosBots(aplicado.estado, aplicado.eventos) };
      const proximo = { ...atual, estado: r.estado };
      const corte = r.eventos.findIndex((e) => e.tipo === 'MAO_DISTRIBUIDA');
      const agora = corte >= 0 ? r.eventos.slice(0, corte) : r.eventos;
      const depois = corte >= 0 ? r.eventos.slice(corte) : [];
      const fimDeRodada = r.eventos.some((e) => e.tipo === 'RODADA_ENCERRADA' || e.tipo === 'MAO_ENCERRADA');

      processar(agora, r.estado);
      if (fimDeRodada) {
        const congelada = vistaDaPausa(atual.estado, r.estado, r.eventos);
        setPausa(congelada);
        pausaRef.current = congelada;
        const duracao = (r.eventos.some((e) => e.tipo === 'MAO_ENCERRADA') ? TEMPO.mao : TEMPO.rodada) * fator;
        agendar(() => {
          setPausa(null);
          pausaRef.current = null;
          processar(depois, r.estado);
        }, duracao);
      } else {
        processar(depois, r.estado);
      }
      setJogo(proximo);
      jogoRef.current = proximo;
      salvar(proximo);
      return true;
    },
    [agendar, fator, processar, salvar],
  );

  // Vez dos bots (RF-021): decide com a visão do assento após um pequeno intervalo.
  const ultimaVezMinha = useRef<string>('');
  useEffect(() => {
    if (!jogo || pausa || jogo.estado.fase !== 'jogando') return;
    const assento = assentoDaVez(jogo.estado);
    if (assento === undefined) return;
    if (assento === MEU_ASSENTO) {
      const chave = `${jogo.estado.versao}`;
      if (ultimaVezMinha.current !== chave) {
        ultimaVezMinha.current = chave;
        tocar('suaVez');
      }
      return;
    }
    const participante = jogo.estado.participantes[assento];
    const id = window.setTimeout(() => {
      const d = decidirBot(visaoDoAssento(jogo.estado, assento), participante.dificuldade ?? 'medio');
      if (d) aplicar(d.acao);
    }, TEMPO.bot * fator);
    return () => window.clearTimeout(id);
  }, [jogo, pausa, aplicar, fator]);

  const iniciar = useCallback(
    (perfil: Perfil, config: ConfigBots) => {
      const nova = criarPartida({ participantes: montarParticipantes(perfil, config), semente: Date.now() });
      const { estado, eventos } = comSinaisDosBots(nova.estado, nova.eventos);
      const novo = { estado, config };
      setJogo(novo);
      jogoRef.current = novo;
      setPausa(null);
      setNarracao([]);
      salvar(novo);
      setSalva(undefined);
      processar(eventos, estado);
    },
    [processar, salvar],
  );

  const continuar = useCallback(() => {
    if (!salva) return;
    setJogo(salva);
    jogoRef.current = salva;
    setSalva(undefined);
    setNarracao(['Partida retomada.']);
  }, [salva]);

  const descartarSalva = useCallback(() => {
    apagar(CHAVE_PARTIDA_BOTS);
    setSalva(undefined);
  }, []);

  /** UC-014: sair encerra a partida contra bots sem registrar resultado. */
  const sair = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    apagar(CHAVE_PARTIDA_BOTS);
    setJogo(null);
    jogoRef.current = null;
    setPausa(null);
    setAnuncio(null);
  }, []);

  /** UC-016: revanche com as mesmas duplas e placar zerado. */
  const revanche = useCallback(() => {
    const atual = jogoRef.current;
    if (!atual) return;
    const nova = criarRevanche(atual.estado, Date.now());
    const { estado, eventos } = comSinaisDosBots(nova.estado, nova.eventos);
    const novo = { ...atual, estado };
    setJogo(novo);
    jogoRef.current = novo;
    setNarracao([]);
    salvar(novo);
    processar(eventos, estado);
  }, [processar, salvar]);

  const visao = jogo ? (pausa ?? visaoDoAssento(jogo.estado, MEU_ASSENTO)) : null;

  return {
    jogo,
    visao,
    pausado: pausa !== null,
    anuncio,
    narracao,
    salva,
    iniciar,
    continuar,
    descartarSalva,
    aplicar,
    sair,
    revanche,
  };
}
