import { useCallback, useEffect, useRef, useState } from 'react';
import type { Acao, VisaoMesa } from '../engine/index.ts';
import type { OperacaoAssento, Perfil, RespostaEstado } from '../servidor/tipos.ts';
import type { Anuncio } from '../ui/mesa/usePartidaContraBots.ts';
import { narrar, textoAnuncio } from '../ui/mesa/narracao.ts';
import { sonsDosEventos, tocar, tocarSequencia } from '../ui/sons.ts';
import { api, credenciais, ErroApi } from './cliente.ts';

/** Intervalos da consulta periódica (substitui o serviço de tempo real; plano, seção 2). */
const INTERVALO = { visivel: 700, oculto: 2500 };
/** RNF-006: sem resposta por este tempo, avisa que a conexão caiu. */
const MS_SEM_CONEXAO = 5000;

export type Fase = 'entrando' | 'pronto' | 'erro';

/**
 * Entradas em andamento por sala. Se o efeito de entrada rodar duas vezes (React StrictMode,
 * remontagem rápida), a segunda reaproveita a mesma requisição em vez de ocupar outro assento.
 */
const entradas = new Map<string, ReturnType<typeof api.entrar>>();

function entrarUmaVez(codigo: string, perfil: Perfil, token?: string) {
  let p = entradas.get(codigo);
  if (!p) {
    p = api.entrar(codigo, perfil, token);
    entradas.set(codigo, p);
    p.finally(() => window.setTimeout(() => entradas.delete(codigo), 1000)).catch(() => undefined);
  }
  return p;
}

/** UC-006, UC-015 e a sincronização da sala online. */
export function useSalaOnline(codigo: string, perfil: Perfil) {
  const [fase, setFase] = useState<Fase>('entrando');
  const [erro, setErro] = useState<string>();
  const [resposta, setResposta] = useState<RespostaEstado | null>(null);
  const [conectado, setConectado] = useState(true);
  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);
  const [narracao, setNarracao] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string>();
  const [, forcar] = useState(0);

  const token = useRef<string | undefined>(undefined);
  const versao = useRef(-1);
  const primeira = useRef(true);
  const ultimoOk = useRef(Date.now());
  const desvioRelogio = useRef(0);
  const avisouTempo = useRef<string | undefined>(undefined);

  const processar = useCallback((r: RespostaEstado) => {
    const participantes = r.visao?.participantes;
    if (!primeira.current && participantes) {
      for (const lote of r.lotes) {
        if (lote.versao <= versao.current) continue;
        tocarSequencia(sonsDosEventos(lote.eventos, r.visao!.dupla, r.meuAssento));
        const frases = lote.eventos
          .map((e) => narrar(e, participantes as never, r.meuAssento))
          .filter((f): f is string => !!f);
        if (frases.length) setNarracao((n) => [...n, ...frases].slice(-10));
        for (const e of lote.eventos) {
          const a = textoAnuncio(e, participantes as never);
          if (a) {
            const id = Date.now() + Math.random();
            setAnuncio({ id, ...a });
            window.setTimeout(() => setAnuncio((x) => (x?.id === id ? null : x)), 1700);
          }
        }
      }
    }
    primeira.current = false;
    versao.current = Math.max(versao.current, r.versao);
    desvioRelogio.current = new Date(r.agora).getTime() - Date.now();
    setResposta(r);
  }, []);

  const atualizar = useCallback(async () => {
    if (!token.current) return;
    try {
      const r = await api.estado(codigo, token.current, versao.current);
      ultimoOk.current = Date.now();
      setConectado(true);
      processar(r);
    } catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        credenciais.apagar(codigo);
        token.current = undefined;
        setErro('Você não está mais nesta sala.');
        setFase('erro');
        return;
      }
      if (Date.now() - ultimoOk.current > MS_SEM_CONEXAO) setConectado(false);
    }
  }, [codigo, processar]);

  // Entrar ou reconectar (UC-006 / UC-015).
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const guardado = credenciais.ler(codigo);
      try {
        const c = await entrarUmaVez(codigo, perfil, guardado);
        if (cancelado) return;
        credenciais.gravar(c);
        token.current = c.token;
        if (c.reconectou) setNarracao(['Você voltou para a sala.']);
        tocar('entrouSala');
        await atualizar();
        if (!cancelado) setFase('pronto');
      } catch (e) {
        if (cancelado) return;
        if (guardado) credenciais.apagar(codigo);
        setErro(e instanceof Error ? e.message : 'Não foi possível entrar na sala.');
        setFase('erro');
      }
    })();
    return () => {
      cancelado = true;
    };
    // O perfil só importa na entrada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  // Consulta periódica.
  useEffect(() => {
    if (fase !== 'pronto') return;
    let id: number;
    const laco = async () => {
      await atualizar();
      id = window.setTimeout(laco, document.hidden ? INTERVALO.oculto : INTERVALO.visivel);
    };
    id = window.setTimeout(laco, INTERVALO.visivel);
    return () => window.clearTimeout(id);
  }, [fase, atualizar]);

  const executar = useCallback(
    async (fn: (t: string) => Promise<unknown>) => {
      if (!token.current) return false;
      try {
        await fn(token.current);
        setAviso(undefined);
        await atualizar();
        return true;
      } catch (e) {
        setAviso(e instanceof Error ? e.message : 'Algo deu errado.');
        await atualizar();
        return false;
      }
    },
    [atualizar],
  );

  const acao = useCallback((a: Acao) => void executar((t) => api.acao(codigo, t, a)), [codigo, executar]);
  const operar = useCallback((op: OperacaoAssento) => void executar((t) => api.operar(codigo, t, op)), [codigo, executar]);
  const iniciar = useCallback(() => void executar((t) => api.iniciar(codigo, t)), [codigo, executar]);
  const sair = useCallback(async () => {
    const t = token.current;
    if (t) await api.sair(codigo, t).catch(() => undefined);
    if (resposta?.situacao === 'aguardando') credenciais.apagar(codigo);
    tocar('saiuSala');
  }, [codigo, resposta?.situacao]);

  /* --------- Vista exibida: pausa de fim de rodada e prazo --------- */
  const agoraServidor = Date.now() + desvioRelogio.current;
  const destaqueAtivo = !!resposta?.destaque && new Date(resposta.destaque.ate).getTime() > agoraServidor;

  useEffect(() => {
    if (!destaqueAtivo || !resposta?.destaque) return;
    const espera = new Date(resposta.destaque.ate).getTime() - agoraServidor;
    const id = window.setTimeout(() => forcar((n) => n + 1), Math.max(0, espera) + 20);
    return () => window.clearTimeout(id);
  }, [destaqueAtivo, resposta?.destaque, agoraServidor]);

  let visao: VisaoMesa | undefined = resposta?.visao;
  if (visao && destaqueAtivo && resposta?.destaque) {
    const atual = visao.rodadas[visao.rodadas.length - 1];
    const anteriores = atual && atual.jogadas.length === 0 ? visao.rodadas.slice(0, -1) : visao.rodadas;
    const mesmaMao = anteriores.length > 0;
    visao = {
      ...visao,
      rodadas: mesmaMao ? [...anteriores.slice(0, -1), resposta.destaque.rodada] : [resposta.destaque.rodada],
      acoes: [],
      aguardando: undefined,
    };
  }

  // O prazo do servidor inclui a pausa da mesa; o contador nunca passa do tempo da decisão (30 s / 20 s).
  const limite = resposta?.visao?.pedido || resposta?.visao?.decisaoOnze ? 20 : 30;
  const segundosRestantes = resposta?.prazo
    ? Math.min(limite, Math.max(0, Math.ceil((new Date(resposta.prazo).getTime() - agoraServidor) / 1000)))
    : undefined;
  useEffect(() => {
    if (segundosRestantes !== undefined && segundosRestantes <= 5 && segundosRestantes > 0 && avisouTempo.current !== resposta?.prazo) {
      avisouTempo.current = resposta?.prazo;
      tocar('tempoAcabando');
    }
  }, [segundosRestantes, resposta?.prazo]);

  return {
    fase,
    erro,
    resposta,
    visao,
    pausado: destaqueAtivo,
    conectado,
    anuncio,
    narracao,
    aviso,
    segundosRestantes,
    acao,
    operar,
    iniciar,
    sair,
  };
}
