import { useState } from 'react';
import type { Assento, Dificuldade } from '../engine/index.ts';
import type { AssentoPublico, OperacaoAssento, RespostaEstado } from '../servidor/tipos.ts';
import { Avatar } from '../ui/arte/avatares.tsx';

const NIVEL: Record<Dificuldade, string> = { facil: 'fácil', medio: 'médio', dificil: 'difícil' };

interface PropsLobby {
  r: RespostaEstado;
  aviso?: string;
  operar: (op: OperacaoAssento) => void;
  iniciar: () => void;
  sair: () => void;
}

function Lugar({ a, r, operar }: { a: AssentoPublico; r: RespostaEstado; operar: PropsLobby['operar'] }) {
  const [nivel, setNivel] = useState<Dificuldade>('medio');
  const anfitriao = r.souAnfitriao;

  if (!a.ocupado) {
    return (
      <div className="lugar lugar--vago">
        <span>Vago</span>
        <button type="button" className="botao botao--pequeno botao--pedra" onClick={() => operar({ tipo: 'mover', para: a.assento })}>
          Sentar aqui
        </button>
        {anfitriao && (
          <>
            <label className="sr-only" htmlFor={`nivel-${a.assento}`}>
              Nível do bot
            </label>
            <select id={`nivel-${a.assento}`} value={nivel} onChange={(e) => setNivel(e.target.value as Dificuldade)}>
              <option value="facil">Bot fácil</option>
              <option value="medio">Bot médio</option>
              <option value="dificil">Bot difícil</option>
            </select>
            <button
              type="button"
              className="botao botao--pequeno botao--aceitar"
              onClick={() => operar({ tipo: 'adicionarBot', assento: a.assento, dificuldade: nivel })}
            >
              + Bot
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`lugar ${a.souEu ? 'lugar--eu' : ''}`}>
      <Avatar id={a.avatar!} tamanho={52} rotulo={a.nome} />
      <span className="lugar__nome">{a.nome}</span>
      <span className="lugar__tags">
        {a.souEu && <span className="tag tag--ouro">Você</span>}
        {a.anfitriao && <span className="tag">Anfitrião</span>}
        {a.tipo === 'bot' && <span className="tag">Bot {a.dificuldade ? NIVEL[a.dificuldade] : ''}</span>}
        {a.botNoLugar && <span className="tag">Ausente</span>}
      </span>
      {anfitriao && a.tipo === 'bot' && (
        <button type="button" className="botao botao--pequeno botao--correr" onClick={() => operar({ tipo: 'removerBot', assento: a.assento })}>
          Remover
        </button>
      )}
    </div>
  );
}

/** UC-007 (organizar duplas) e UC-008 (iniciar) — sala em espera. */
export function Lobby({ r, aviso, operar, iniciar, sair }: PropsLobby) {
  const [copiado, setCopiado] = useState(false);
  const link = `${window.location.origin}/sala/${r.codigo}`;
  const vagos = r.assentos.filter((a) => !a.ocupado);
  const minutos = Math.max(0, Math.round((new Date(r.expiraEm).getTime() - new Date(r.agora).getTime()) / 60_000));

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  const completarComBots = () => {
    for (const a of vagos) operar({ tipo: 'adicionarBot', assento: a.assento as Assento, dificuldade: 'medio' });
  };

  return (
    <main className="pagina">
      <h1>Sala online</h1>
      <section className="cartao" aria-label="Convite">
        <p>Passe este código para a galera:</p>
        <p className="sala__codigo" aria-label={`Código da sala: ${r.codigo.split('').join(' ')}`}>
          {r.codigo}
        </p>
        <div className="linha-botoes">
          <button type="button" className="botao botao--pedra" onClick={copiar}>
            {copiado ? 'Link copiado' : 'Copiar link'}
          </button>
        </div>
        <p className="formulario__status">A sala expira em {minutos} min se a partida não começar.</p>
      </section>

      <div className="lobby__duplas">
        {[0, 1].map((d) => (
          <section key={d} className={`lobby__dupla lobby__dupla--${d}`} aria-label={`Dupla ${d + 1}`}>
            <h2>Dupla {d + 1}</h2>
            {[d, d + 2].map((i) => (
              <Lugar key={i} a={r.assentos[i]!} r={r} operar={operar} />
            ))}
          </section>
        ))}
      </div>

      {aviso && (
        <p className="painel__alerta" role="alert">
          {aviso}
        </p>
      )}

      <div className="linha-botoes">
        {r.souAnfitriao ? (
          <>
            {vagos.length === 0 ? (
              <button type="button" className="botao botao--grande botao--aceitar" onClick={iniciar}>
                Começar partida
              </button>
            ) : (
              <button type="button" className="botao botao--aceitar" onClick={completarComBots}>
                Completar com bots ({vagos.length})
              </button>
            )}
            <button type="button" className="botao botao--pedra" onClick={() => operar({ tipo: 'sortear' })}>
              Sortear duplas
            </button>
          </>
        ) : (
          <p aria-live="polite">Aguardando o anfitrião começar…</p>
        )}
        <button type="button" className="botao botao--correr" onClick={sair}>
          Sair da sala
        </button>
      </div>
    </main>
  );
}
