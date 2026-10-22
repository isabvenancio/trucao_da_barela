import { useState } from 'react';
import { Link } from 'react-router-dom';
import { totais } from '../marcador/marcador.ts';
import { useMarcador } from '../marcador/useMarcador.ts';

const formatoData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** UC-020: partidas encerradas no marcador, mais recentes primeiro (RN-025). */
export function HistoricoMarcador() {
  const m = useMarcador();
  const [confirmar, setConfirmar] = useState(false);
  const historico = m.estado.historico;

  return (
    <main className="pagina">
      <h1>Histórico do marcador</h1>
      {m.ignorados > 0 && (
        <p className="formulario__status" role="status">
          {m.ignorados} {m.ignorados === 1 ? 'registro ilegível foi ignorado' : 'registros ilegíveis foram ignorados'}.
        </p>
      )}

      {historico.length === 0 ? (
        <div className="cartao">
          <h2>Nenhuma partida ainda</h2>
          <p>As partidas que terminarem no marcador aparecem aqui, só neste dispositivo.</p>
          <div className="linha-botoes">
            <Link to="/marcador" className="botao botao--aceitar">
              Abrir o marcador
            </Link>
          </div>
        </div>
      ) : (
        <ol className="historico-lista">
          {historico.map((p) => {
            const t = totais(p);
            return (
              <li key={p.id} className="cartao historico-lista__item">
                <details>
                  <summary>
                    <span className="historico-lista__data">{formatoData.format(new Date(p.encerradaEm ?? p.criadaEm))}</span>
                    <span className="historico-lista__placar">
                      <span className={p.vencedora === 0 ? 'historico-lista__vencedor' : ''}>{p.nomes[0]}</span> {t[0]} × {t[1]}{' '}
                      <span className={p.vencedora === 1 ? 'historico-lista__vencedor' : ''}>{p.nomes[1]}</span>
                    </span>
                  </summary>
                  <ol className="historico-lista__registros">
                    {p.registros.map((r, i) => (
                      <li key={i}>
                        +{r.valor} {p.nomes[r.dupla]}
                      </li>
                    ))}
                  </ol>
                </details>
              </li>
            );
          })}
        </ol>
      )}

      <div className="linha-botoes">
        <Link to="/marcador" className="botao botao--aceitar">
          Voltar ao marcador
        </Link>
        {historico.length > 0 && (
          <button type="button" className="botao botao--correr" onClick={() => setConfirmar(true)}>
            Apagar histórico
          </button>
        )}
      </div>

      {confirmar && (
        <div className="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="titulo-apagar">
          <div className="cartao">
            <h2 id="titulo-apagar">Apagar todo o histórico?</h2>
            <p>As {historico.length} partidas serão removidas deste dispositivo. Não dá para desfazer.</p>
            <div className="linha-botoes">
              <button type="button" className="botao botao--correr" onClick={() => { m.apagarHistorico(); setConfirmar(false); }}>
                Apagar
              </button>
              <button type="button" className="botao botao--pedra" onClick={() => setConfirmar(false)} autoFocus>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
