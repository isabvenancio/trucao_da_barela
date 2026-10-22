import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { avisoDoPlacar, encerrada, NOMES_PADRAO, PONTOS_VITORIA, totais, VALORES_PERMITIDOS } from '../marcador/marcador.ts';
import type { DuplaMarcador } from '../marcador/marcador.ts';
import { useMarcador } from '../marcador/useMarcador.ts';

function BarraDePontos({ pontos }: { pontos: number }) {
  return (
    <div className="barra-pontos" aria-hidden="true">
      {Array.from({ length: PONTOS_VITORIA }, (_, i) => (
        <span key={i} className={`barra-pontos__bloco ${i < pontos ? 'barra-pontos__bloco--cheio' : ''} ${i === 10 ? 'barra-pontos__bloco--onze' : ''}`} />
      ))}
    </div>
  );
}

/** UC-017 (iniciar), UC-018 (registrar) e UC-019 (desfazer) do marcador físico. */
export function Marcador() {
  const m = useMarcador();
  const [nomes, setNomes] = useState<[string, string]>(['', '']);
  const [configurando, setConfigurando] = useState(false);
  const [confirmarNova, setConfirmarNova] = useState(false);
  const [status, setStatus] = useState('');
  const p = m.estado.atual;

  const comecar = (e: FormEvent) => {
    e.preventDefault();
    m.iniciar(nomes);
    setNomes(['', '']);
    setConfigurando(false);
    setStatus('Partida iniciada: 0 × 0.');
  };

  const pedirNova = () => {
    if (p && !encerrada(p) && p.registros.length > 0) setConfirmarNova(true);
    else setConfigurando(true);
  };

  if (!p || configurando) {
    return (
      <main className="pagina">
        <h1>Marcador de pontos</h1>
        <p>Para jogar com baralho de verdade: o app só conta os pontos.</p>
        <form className="cartao formulario" onSubmit={comecar}>
          {([0, 1] as DuplaMarcador[]).map((d) => (
            <label key={d} className="campo">
              <span>{d === 0 ? 'Primeira dupla' : 'Segunda dupla'}</span>
              <input
                value={nomes[d]}
                maxLength={24}
                placeholder={NOMES_PADRAO[d]}
                onChange={(e) => setNomes(d === 0 ? [e.target.value, nomes[1]] : [nomes[0], e.target.value])}
              />
            </label>
          ))}
          <div className="linha-botoes">
            <button type="submit" className="botao botao--grande botao--aceitar">
              Começar
            </button>
            {p ? (
              <button type="button" className="botao botao--pedra" onClick={() => setConfigurando(false)}>
                Cancelar
              </button>
            ) : (
              <Link to="/" className="botao botao--pedra">
                Voltar
              </Link>
            )}
          </div>
        </form>
        <Link to="/marcador/historico" className="link-discreto">
          Histórico de partidas
        </Link>
      </main>
    );
  }

  const t = totais(p);
  const fim = encerrada(p);
  const aviso = fim ? undefined : avisoDoPlacar(t);
  const ultimo = p.registros[p.registros.length - 1];

  const registrar = (d: DuplaMarcador, v: (typeof VALORES_PERMITIDOS)[number]) => {
    const r = m.registrar(d, v);
    const total = t[d] + v;
    setStatus(
      r === 'vitoria'
        ? `${p.nomes[d]} venceram com ${total} pontos!`
        : r === 'ferro'
          ? 'Mão de ferro! As duas duplas têm 11.'
          : r === 'onze'
            ? `Mão de onze para ${p.nomes[d]}!`
            : `+${v} para ${p.nomes[d]}: ${total} pontos.`,
    );
  };

  const desfazer = () => {
    const r = m.desfazer();
    if (r) setStatus(`Desfeito: +${r.valor} de ${p.nomes[r.dupla]}.`);
  };

  return (
    <main className="pagina pagina--marcador">
      <div className="marcador__topo">
        <h1>Marcador</h1>
        <div className="linha-botoes">
          <Link to="/marcador/historico" className="botao botao--pequeno botao--pedra">
            Histórico
          </Link>
          <button type="button" className="botao botao--pequeno botao--pedra" onClick={pedirNova}>
            Nova partida
          </button>
          <Link to="/" className="botao botao--pequeno botao--pedra">
            Início
          </Link>
        </div>
      </div>

      {aviso && (
        <p className={`marcador__aviso ${aviso === 'ferro' ? 'marcador__aviso--ferro' : ''}`} role="status">
          {aviso === 'ferro' ? 'Mão de ferro: ninguém vê as próprias cartas e quem vencer leva.' : 'Mão de onze: a dupla com 11 vê as cartas do parceiro e decide se joga (vale 3).'}
        </p>
      )}

      <div className="marcador__duplas">
        {([0, 1] as DuplaMarcador[]).map((d) => (
          <section
            key={d}
            className={`marcador__dupla marcador__dupla--${d} ${p.vencedora === d ? 'marcador__dupla--venceu' : ''}`}
            aria-label={`${p.nomes[d]}: ${t[d]} pontos`}
          >
            <h2 className="marcador__nome">{p.nomes[d]}</h2>
            <p className="marcador__total">{t[d]}</p>
            <BarraDePontos pontos={t[d]} />
            <div className="marcador__botoes">
              {VALORES_PERMITIDOS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="botao botao--ponto"
                  disabled={fim}
                  onClick={() => registrar(d, v)}
                  aria-label={`Somar ${v} para ${p.nomes[d]}`}
                >
                  +{v}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {fim && (
        <div className="cartao fim fim--vitoria" role="status">
          <h2>{p.nomes[p.vencedora!]} venceram!</h2>
          <p className="fim__placar">
            {t[0]} × {t[1]}
          </p>
          <div className="linha-botoes">
            <button type="button" className="botao botao--aceitar" onClick={() => setConfigurando(true)}>
              Nova partida
            </button>
          </div>
        </div>
      )}

      <div className="marcador__rodape">
        <button type="button" className="botao botao--pedra" onClick={desfazer} disabled={!ultimo}>
          Desfazer{ultimo ? ` (+${ultimo.valor} ${p.nomes[ultimo.dupla]})` : ''}
        </button>
        <p className="marcador__status" aria-live="polite">
          {status}
        </p>
      </div>
      {!m.persistiu && <p className="formulario__status">O placar vale só nesta sessão: o armazenamento do navegador está indisponível.</p>}

      {confirmarNova && (
        <div className="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="titulo-nova">
          <div className="cartao">
            <h2 id="titulo-nova">Começar outra partida?</h2>
            <p>
              O placar atual ({t[0]} × {t[1]}) será descartado e não vai para o histórico.
            </p>
            <div className="linha-botoes">
              <button type="button" className="botao botao--correr" onClick={() => { setConfirmarNova(false); setConfigurando(true); }}>
                Descartar e começar
              </button>
              <button type="button" className="botao botao--pedra" onClick={() => setConfirmarNova(false)} autoFocus>
                Manter placar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
