import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { duplaDe } from '../engine/index.ts';
import type { Assento } from '../engine/index.ts';
import { api, credenciais } from '../online/cliente.ts';
import { Lobby } from '../online/Lobby.tsx';
import { useSalaOnline } from '../online/useSalaOnline.ts';
import { usePerfil } from '../ui/armazenamento.ts';
import { Avatar } from '../ui/arte/avatares.tsx';
import { Mesa } from '../ui/mesa/Mesa.tsx';

/** UC-005 (criar) e entrada por código (UC-006). */
function Entrada() {
  const [perfil] = usePerfil();
  const navegar = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string>();
  const [ocupado, setOcupado] = useState(false);

  const criar = async () => {
    setOcupado(true);
    setErro(undefined);
    try {
      const c = await api.criar(perfil);
      credenciais.gravar(c);
      navegar(`/sala/${c.codigo}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar a sala.');
      setOcupado(false);
    }
  };

  const entrar = (e: FormEvent) => {
    e.preventDefault();
    const limpo = codigo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (limpo.length !== 6) {
      setErro('O código tem 6 letras e números.');
      return;
    }
    navegar(`/sala/${limpo}`);
  };

  return (
    <main className="pagina">
      <h1>Jogar online</h1>
      <Link to="/perfil" className="perfil-resumo">
        <Avatar id={perfil.avatar} tamanho={44} />
        <span>
          <strong>{perfil.apelido}</strong>
          <small>É assim que vão te ver</small>
        </span>
      </Link>
      <section className="cartao">
        <h2>Criar uma sala</h2>
        <p>Você vira o anfitrião e recebe um código para chamar os amigos.</p>
        <div className="linha-botoes">
          <button type="button" className="botao botao--grande botao--aceitar" onClick={criar} disabled={ocupado}>
            {ocupado ? 'Criando…' : 'Criar sala'}
          </button>
        </div>
      </section>
      <form className="cartao formulario entrada__codigo" onSubmit={entrar} noValidate>
        <h2>Entrar com código</h2>
        <label className="campo">
          <span>Código da sala</span>
          <input
            value={codigo}
            maxLength={8}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="K7MP2Q"
            onChange={(e) => {
              setCodigo(e.target.value);
              setErro(undefined);
            }}
          />
        </label>
        <div className="linha-botoes">
          <button type="submit" className="botao botao--aceitar">
            Entrar
          </button>
        </div>
      </form>
      {erro && (
        <p className="painel__alerta" role="alert">
          {erro}
        </p>
      )}
      <Link to="/" className="link-discreto">
        Voltar ao início
      </Link>
    </main>
  );
}

/** Sala: lobby enquanto aguarda; mesa durante a partida (UC-007 a UC-016). */
function Sala({ codigo }: { codigo: string }) {
  const [perfil] = usePerfil();
  const navegar = useNavigate();
  const s = useSalaOnline(codigo, perfil);
  const [confirmarSaida, setConfirmarSaida] = useState(false);

  const sairDaqui = async () => {
    await s.sair();
    navegar('/');
  };

  if (s.fase === 'entrando') {
    return (
      <main className="pagina">
        <p aria-live="polite">Entrando na sala {codigo}…</p>
      </main>
    );
  }
  if (s.fase === 'erro' || !s.resposta) {
    return (
      <main className="pagina">
        <h1>Sala {codigo}</h1>
        <div className="cartao">
          <p role="alert">{s.erro ?? 'Não foi possível abrir a sala.'}</p>
          <div className="linha-botoes">
            <Link to="/sala" className="botao botao--aceitar">
              Outra sala
            </Link>
            <Link to="/" className="botao botao--pedra">
              Início
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const r = s.resposta;
  if (r.situacao === 'encerrada') {
    return (
      <main className="pagina">
        <h1>Sala {codigo}</h1>
        <div className="cartao">
          <p>Esta sala foi encerrada.</p>
          <div className="linha-botoes">
            <Link to="/sala" className="botao botao--aceitar">
              Criar ou entrar em outra
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (r.situacao === 'aguardando' || !s.visao) {
    return <Lobby r={r} aviso={s.aviso} operar={s.operar} iniciar={s.iniciar} sair={sairDaqui} />;
  }

  const visao = s.visao;
  const minhaDupla = duplaDe(r.meuAssento);
  const status: Partial<Record<Assento, string>> = {};
  for (const a of r.assentos) if (a.botNoLugar) status[a.assento] = 'bot no lugar';
  const venci = visao.vencedora === minhaDupla;

  return (
    <main className="pagina pagina--mesa">
      {!s.conectado && (
        <p className="conexao" role="alert">
          Sem conexão. Tentando reconectar…
        </p>
      )}
      <Mesa
        visao={visao}
        anuncio={s.anuncio}
        narracao={s.narracao}
        pausado={s.pausado}
        onAcao={s.acao}
        onSair={() => setConfirmarSaida(true)}
        segundosRestantes={s.segundosRestantes}
        statusAssento={status}
        alerta={s.aviso}
      />

      {confirmarSaida && (
        <div className="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="titulo-sair">
          <div className="cartao">
            <h2 id="titulo-sair">Sair da partida?</h2>
            <p>Um bot vai jogar no seu lugar. Se voltar para esta sala por este aparelho, você recupera o assento.</p>
            <div className="linha-botoes">
              <button type="button" className="botao botao--correr" onClick={sairDaqui}>
                Sair
              </button>
              <button type="button" className="botao botao--pedra" onClick={() => setConfirmarSaida(false)} autoFocus>
                Continuar jogando
              </button>
            </div>
          </div>
        </div>
      )}

      {visao.fase === 'encerrada' && !s.pausado && (
        <div className="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="titulo-fim">
          <div className={`cartao fim ${venci ? 'fim--vitoria' : 'fim--derrota'}`}>
            <h2 id="titulo-fim">{venci ? 'Vocês venceram!' : 'Eles venceram'}</h2>
            <p className="fim__placar">
              {visao.placar[minhaDupla]} × {visao.placar[1 - minhaDupla]}
            </p>
            <div className="linha-botoes">
              {r.souAnfitriao ? (
                <button type="button" className="botao botao--aceitar" onClick={s.iniciar} autoFocus>
                  Revanche
                </button>
              ) : (
                <p aria-live="polite">Aguardando o anfitrião…</p>
              )}
              <button type="button" className="botao botao--pedra" onClick={sairDaqui}>
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export function SalaOnline() {
  const { codigo } = useParams<{ codigo?: string }>();
  return codigo ? <Sala key={codigo} codigo={codigo.toUpperCase()} /> : <Entrada />;
}
