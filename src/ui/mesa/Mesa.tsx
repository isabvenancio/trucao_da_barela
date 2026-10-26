import { useEffect, useRef, useState } from 'react';
import { duplaDe, nomeCarta, proximoValorPedido } from '../../engine/index.ts';
import type { Acao, Assento, Sinal, VisaoMesa } from '../../engine/index.ts';
import { Avatar } from '../arte/avatares.tsx';
import { Carta } from '../arte/Carta.tsx';
import { RostoSinal, SINAIS_INFO } from '../arte/sinais.tsx';
import type { Anuncio } from './usePartidaContraBots.ts';
import { NOME_PEDIDO, nomeDupla } from './narracao.ts';

/** Posição na tela de cada assento, relativa ao jogador (sentido anti-horário: baixo → direita → cima → esquerda). */
const POSICOES = ['baixo', 'direita', 'cima', 'esquerda'] as const;

function posicao(assento: Assento, meu: Assento) {
  return POSICOES[(assento - meu + 4) % 4]!;
}

export interface PropsMesa {
  visao: VisaoMesa;
  anuncio: Anuncio | null;
  narracao: string[];
  pausado: boolean;
  onAcao: (acao: Acao) => void;
  onSair: () => void;
  /** Online: segundos até o prazo da sua decisão (RN-021). */
  segundosRestantes?: number;
  /** Online: aviso por assento, como "bot no lugar". */
  statusAssento?: Partial<Record<Assento, string>>;
  /** Online: aviso de conexão ou erro de ação. */
  alerta?: string;
}

/** Mesa de jogo (RF-022): tudo a partir da visão do assento. */
export function Mesa({ visao, anuncio, narracao, pausado, onAcao, onSair, segundosRestantes, statusAssento, alerta }: PropsMesa) {
  const [encobrir, setEncobrir] = useState(false);
  const meu = visao.assento;
  const minhaDupla = duplaDe(meu);
  const rodadaAtual = visao.rodadas[visao.rodadas.length - 1];
  const podeJogar = (indice: number, encoberta: boolean) =>
    visao.acoes.some((a) => a.tipo === 'JOGAR_CARTA' && a.indice === indice && !!a.encoberta === encoberta);
  const podeEncobrir = visao.acoes.some((a) => a.tipo === 'JOGAR_CARTA' && a.encoberta);
  const podeTruco = visao.acoes.some((a) => a.tipo === 'PEDIR_TRUCO');
  const respostas = visao.acoes.filter((a) => a.tipo === 'RESPONDER_TRUCO');
  const decisaoOnze = visao.acoes.filter((a) => a.tipo === 'DECIDIR_MAO_DE_ONZE');
  const minhaVez = visao.aguardando === meu && !pausado;

  // RN-027: painel de sinais e balão do último sinal recebido do parceiro.
  const [abrirSinais, setAbrirSinais] = useState(false);
  const [balao, setBalao] = useState<{ sinal: Sinal; id: number } | null>(null);
  const recebidos = visao.sinaisDoParceiro.length;
  const ultimoVisto = useRef('');
  useEffect(() => {
    // Cada sinal novo (por mão) mostra o balão uma vez, inclusive os feitos antes da mesa aparecer.
    const chave = `${visao.numeroMao}-${recebidos}`;
    if (recebidos === 0 || chave === ultimoVisto.current) return;
    ultimoVisto.current = chave;
    const sinal = visao.sinaisDoParceiro[recebidos - 1]!.sinal;
    const id = Date.now();
    setBalao({ sinal, id });
    const t = window.setTimeout(() => setBalao((b) => (b?.id === id ? null : b)), 3500);
    return () => window.clearTimeout(t);
  }, [recebidos, visao.numeroMao, visao.sinaisDoParceiro]);
  const podeSinalizar = visao.sinaisDisponiveis.length > 0 && !pausado;
  useEffect(() => {
    if (!podeSinalizar) setAbrirSinais(false);
  }, [podeSinalizar]);
  const sinalizar = (sinal: Sinal) => {
    setAbrirSinais(false);
    onAcao({ tipo: 'SINALIZAR', assento: meu, sinal });
  };
  const nome = (a: Assento) => (a === meu ? 'Você' : visao.participantes[a]!.nome);

  const jogar = (indice: number) => {
    const encoberta = encobrir && podeEncobrir;
    if (!podeJogar(indice, encoberta)) return;
    setEncobrir(false);
    onAcao({ tipo: 'JOGAR_CARTA', assento: meu, indice, ...(encoberta ? { encoberta: true } : {}) });
  };

  return (
    <div className={`mesa mesa--${visao.tipoMao}`}>
      {/* Placar e informações da mão */}
      <header className="mesa__topo">
        <div className="placar" aria-label={`Placar: nós ${visao.placar[minhaDupla]}, eles ${visao.placar[1 - minhaDupla]}`}>
          <div className="placar__dupla placar__dupla--nos">
            <span>Nós</span>
            <strong>{visao.placar[minhaDupla]}</strong>
          </div>
          <span className="placar__x" aria-hidden="true">×</span>
          <div className="placar__dupla placar__dupla--eles">
            <span>Eles</span>
            <strong>{visao.placar[1 - minhaDupla]}</strong>
          </div>
        </div>

        <div className="info-mao">
          <span className="info-mao__valor" aria-label={`A mão vale ${visao.valorMao}`}>
            Vale <strong>{visao.valorMao}</strong>
          </span>
          <ol className="rodadas" aria-label="Rodadas da mão">
            {[0, 1, 2].map((i) => {
              const r = visao.rodadas[i]?.resultado;
              const texto = r === undefined ? 'a jogar' : r === 'empate' ? 'empate' : nomeDupla(r, meu);
              const classe = r === undefined ? '' : r === 'empate' ? 'rodadas__item--empate' : r === minhaDupla ? 'rodadas__item--nos' : 'rodadas__item--eles';
              return <li key={i} className={`rodadas__item ${classe}`} title={`Rodada ${i + 1}: ${texto}`} aria-label={`Rodada ${i + 1}: ${texto}`} />;
            })}
          </ol>
        </div>

        <div className="vira" aria-label={`Vira: ${nomeCarta(visao.vira)}. Manilha: ${visao.manilha}`}>
          <Carta carta={visao.vira} tamanho="p" />
          <span className="vira__manilha">
            Manilha <strong>{visao.manilha}</strong>
          </span>
        </div>

        <button type="button" className="botao botao--pequeno botao--pedra" onClick={onSair}>
          Sair
        </button>
      </header>

      {/* Feltro com os quatro assentos */}
      <section className="feltro" aria-label="Mesa">
        {([0, 1, 2, 3] as Assento[])
          .filter((a) => a !== meu)
          .map((a) => {
            const p = visao.participantes[a]!;
            const pos = posicao(a, meu);
            const parceiro = duplaDe(a) === minhaDupla;
            return (
              <div key={a} className={`assento assento--${pos} ${visao.aguardando === a && !pausado ? 'assento--vez' : ''}`}>
                <Avatar id={p.avatar} tamanho={44} rotulo={p.nome} />
                <div className="assento__info">
                  <span className="assento__nome">{p.nome}</span>
                  <span className={`assento__tag ${parceiro ? 'assento__tag--parceiro' : ''}`}>
                    {parceiro ? 'Parceiro' : 'Adversário'}
                    {p.dificuldade ? ` · ${{ facil: 'fácil', medio: 'médio', dificil: 'difícil' }[p.dificuldade]}` : ''}
                  </span>
                  {statusAssento?.[a] && <span className="assento__status">{statusAssento[a]}</span>}
                </div>
                {parceiro && visao.sinaisDoParceiro.length > 0 && (
                  <div className="assento__sinais" aria-label={`Sinais do parceiro: ${visao.sinaisDoParceiro.map((x) => SINAIS_INFO[x.sinal].nome).join(', ')}`}>
                    {visao.sinaisDoParceiro.map((x) => (
                      <span key={x.sinal} className="assento__sinal" title={`${SINAIS_INFO[x.sinal].nome}: ${SINAIS_INFO[x.sinal].significado.toLowerCase()}`}>
                        <RostoSinal sinal={x.sinal} tamanho={18} />
                        {SINAIS_INFO[x.sinal].nome}
                      </span>
                    ))}
                  </div>
                )}
                {parceiro && balao && (
                  <div key={balao.id} className="balao-sinal" aria-hidden="true">
                    <RostoSinal sinal={balao.sinal} tamanho={40} />
                    <span>
                      <strong>{SINAIS_INFO[balao.sinal].nome}</strong>
                      <small>{SINAIS_INFO[balao.sinal].gesto}</small>
                    </span>
                  </div>
                )}
                <div className="assento__mao" aria-label={`${visao.quantidadeCartas[a]} cartas`}>
                  {Array.from({ length: visao.quantidadeCartas[a] }, (_, i) => (
                    <Carta key={i} carta={null} verso tamanho="p" />
                  ))}
                </div>
                {visao.carteador === a && <span className="assento__pe" title="Carteador">C</span>}
              </div>
            );
          })}

        {/* Cartas jogadas na rodada em destaque */}
        <div className="centro" aria-label="Cartas na mesa">
          {rodadaAtual?.jogadas.map((j) => {
            const venceu = rodadaAtual.vencedor === j.assento;
            return (
              <div key={j.assento} className={`centro__jogada centro__jogada--${posicao(j.assento, meu)}`}>
                <Carta
                  carta={j.carta}
                  verso={j.encoberta}
                  manilha={visao.manilha}
                  destaque={venceu}
                  esmaecida={rodadaAtual.resultado !== undefined && !venceu}
                />
              </div>
            );
          })}
          {anuncio && (
            <div key={anuncio.id} className={`anuncio ${anuncio.forte ? 'anuncio--forte' : ''}`} aria-hidden="true">
              {anuncio.texto}
            </div>
          )}
        </div>
      </section>

      {/* Decisões pendentes do jogador */}
      <section className="painel" aria-label="Suas ações">
        {alerta && (
          <p className="painel__alerta" role="alert">
            {alerta}
          </p>
        )}
        {segundosRestantes !== undefined && minhaVez && (
          <p className={`prazo ${segundosRestantes <= 5 ? 'prazo--acabando' : ''}`} aria-live={segundosRestantes <= 5 ? 'assertive' : 'off'}>
            {segundosRestantes} s
          </p>
        )}
        {visao.pedido && respostas.length > 0 && (
          <div className="decisao" role="group" aria-label="Responder ao pedido">
            <p className="decisao__texto">
              {nome(visao.pedido.solicitante)} pediu <strong>{NOME_PEDIDO[visao.pedido.valor]}!</strong> Valendo {visao.pedido.valor}.
            </p>
            <div className="decisao__botoes">
              {respostas.map((a) => {
                if (a.tipo !== 'RESPONDER_TRUCO') return null;
                const rotulo =
                  a.resposta === 'aceitar' ? 'Aceitar' : a.resposta === 'correr' ? 'Correr' : `${NOME_PEDIDO[proximoValorPedido(visao.pedido!.valor) ?? 12]}!`;
                return (
                  <button key={a.resposta} type="button" className={`botao botao--${a.resposta}`} onClick={() => onAcao(a)}>
                    {rotulo}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {decisaoOnze.length > 0 && (
          <div className="decisao" role="group" aria-label="Mão de onze">
            <p className="decisao__texto">
              <strong>Mão de onze!</strong> Veja as cartas do seu parceiro e decida.
            </p>
            {visao.cartasParceiro && (
              <div className="decisao__cartas" aria-label="Cartas do parceiro">
                {visao.cartasParceiro.map((c) => (
                  <Carta key={nomeCarta(c)} carta={c} manilha={visao.manilha} tamanho="p" />
                ))}
              </div>
            )}
            <div className="decisao__botoes">
              {decisaoOnze.map((a) =>
                a.tipo === 'DECIDIR_MAO_DE_ONZE' ? (
                  <button key={a.decisao} type="button" className={`botao botao--${a.decisao === 'jogar' ? 'aceitar' : 'correr'}`} onClick={() => onAcao(a)}>
                    {a.decisao === 'jogar' ? 'Jogar (vale 3)' : 'Correr (+1 pra eles)'}
                  </button>
                ) : null,
              )}
            </div>
          </div>
        )}

        {!visao.pedido && decisaoOnze.length === 0 && (
          <div className="painel__linha">
            <p className="painel__status" aria-live="polite">
              {pausado
                ? ' '
                : minhaVez
                  ? 'Sua vez: escolha uma carta.'
                  : visao.aguardando !== undefined
                    ? `Vez de ${nome(visao.aguardando)}…`
                    : ' '}
            </p>
            <div className="painel__botoes">
              {podeEncobrir && (
                <label className="encobrir">
                  <input type="checkbox" checked={encobrir} onChange={(e) => setEncobrir(e.target.checked)} />
                  Encoberta
                </label>
              )}
              {podeTruco && (
                <button type="button" className="botao botao--truco" onClick={() => onAcao({ tipo: 'PEDIR_TRUCO', assento: meu })}>
                  {NOME_PEDIDO[proximoValorPedido(visao.valorMao) ?? 12]}!
                </button>
              )}
            </div>
          </div>
        )}

        {visao.tipoMao !== 'ferro' && (
          <div className="painel__sinais">
            <button
              type="button"
              className={`botao botao--pequeno botao--sinais ${abrirSinais ? 'botao--sinais-aberto' : ''}`}
              onClick={() => setAbrirSinais((x) => !x)}
              disabled={!podeSinalizar}
              aria-expanded={abrirSinais}
              aria-controls="lista-sinais"
            >
              Sinais ({visao.sinaisDisponiveis.length > 0 ? 3 - visao.meusSinais.length : 0})
            </button>
            {visao.meusSinais.length > 0 && (
              <span className="painel__meus-sinais" aria-label={`Você sinalizou: ${visao.meusSinais.map((x) => SINAIS_INFO[x].nome).join(', ')}`}>
                Você fez:
                {visao.meusSinais.map((x) => (
                  <span key={x} className="assento__sinal">
                    <RostoSinal sinal={x} tamanho={18} />
                    {SINAIS_INFO[x].nome}
                  </span>
                ))}
              </span>
            )}
          </div>
        )}
        {abrirSinais && (
          <div id="lista-sinais" className="lista-sinais" role="group" aria-label="Escolha um sinal para o parceiro">
            {visao.sinaisDisponiveis.map((x) => (
              <button key={x} type="button" className="lista-sinais__item" onClick={() => sinalizar(x)}>
                <RostoSinal sinal={x} tamanho={36} />
                <span className="lista-sinais__nome">{SINAIS_INFO[x].nome}</span>
                <span className="lista-sinais__gesto">{SINAIS_INFO[x].gesto}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Minha mão */}
      <section className={`minha-mao ${minhaVez ? 'minha-mao--vez' : ''}`} aria-label="Suas cartas">
        <div className="minha-mao__quem">
          <Avatar id={visao.participantes[meu]!.avatar} tamanho={44} rotulo="Você" />
          <span>{visao.participantes[meu]!.nome}</span>
          {visao.carteador === meu && <span className="assento__pe" title="Carteador">C</span>}
        </div>
        <div className="minha-mao__cartas">
          {visao.minhasCartas.map((c, i) => {
            const habilitada = podeJogar(i, encobrir && podeEncobrir);
            return (
              <button
                key={c ? nomeCarta(c) : `oculta-${i}`}
                type="button"
                className="minha-mao__carta"
                disabled={!habilitada}
                onClick={() => jogar(i)}
                aria-label={c ? `Jogar ${nomeCarta(c)}${encobrir ? ' encoberta' : ''}` : `Jogar a carta ${i + 1} (oculta)`}
              >
                <Carta carta={c} verso={c === null} manilha={visao.manilha} tamanho="g" />
              </button>
            );
          })}
        </div>
      </section>

      <div className="sr-only" aria-live="polite">
        {narracao[narracao.length - 1]}
      </div>
      <details className="historico">
        <summary>O que aconteceu</summary>
        <ol>
          {narracao.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ol>
      </details>
    </div>
  );
}
