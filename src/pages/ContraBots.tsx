import { useState } from 'react';
import { Link } from 'react-router-dom';
import { duplaDe } from '../engine/index.ts';
import type { Dificuldade } from '../engine/index.ts';
import { usePerfil, usePreferencias } from '../ui/armazenamento.ts';
import { Avatar } from '../ui/arte/avatares.tsx';
import { Mesa } from '../ui/mesa/Mesa.tsx';
import { MEU_ASSENTO, usePartidaContraBots } from '../ui/mesa/usePartidaContraBots.ts';
import type { ConfigBots } from '../ui/mesa/usePartidaContraBots.ts';

const NIVEIS: { id: Dificuldade; nome: string; detalhe: string }[] = [
  { id: 'facil', nome: 'Fácil', detalhe: 'Joga no impulso' },
  { id: 'medio', nome: 'Médio', detalhe: 'Conhece o jogo' },
  { id: 'dificil', nome: 'Difícil', detalhe: 'Conta as cartas' },
];

function EscolhaNivel({ titulo, valor, onChange }: { titulo: string; valor: Dificuldade; onChange: (d: Dificuldade) => void }) {
  return (
    <fieldset className="escolha">
      <legend>{titulo}</legend>
      <div className="escolha__opcoes">
        {NIVEIS.map((n) => (
          <label key={n.id} className={`escolha__opcao ${valor === n.id ? 'escolha__opcao--ativa' : ''}`}>
            <input type="radio" name={titulo} value={n.id} checked={valor === n.id} onChange={() => onChange(n.id)} />
            <span className="escolha__nome">{n.nome}</span>
            <span className="escolha__detalhe">{n.detalhe}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** UC-004 (iniciar), UC-014 (sair) e UC-016 (fim e revanche) contra bots. */
export function ContraBots() {
  const [perfil] = usePerfil();
  const [preferencias] = usePreferencias();
  const partida = usePartidaContraBots(preferencias);
  const [config, setConfig] = useState<ConfigBots>({ parceiro: 'medio', adversarios: 'medio' });
  const [confirmarSaida, setConfirmarSaida] = useState(false);

  if (!partida.jogo || !partida.visao) {
    return (
      <main className="pagina">
        <h1>Contra bots</h1>
        {partida.salva && (
          <section className="cartao" aria-label="Partida salva">
            <p>
              Você tem uma partida em andamento: <strong>{partida.salva.estado.placar[0]} × {partida.salva.estado.placar[1]}</strong>.
            </p>
            <div className="linha-botoes">
              <button type="button" className="botao botao--aceitar" onClick={partida.continuar}>
                Continuar partida
              </button>
              <button type="button" className="botao botao--pedra" onClick={partida.descartarSalva}>
                Descartar
              </button>
            </div>
          </section>
        )}
        <div className="cartao cartao--duplas">
          <div className="dupla-config">
            <Avatar id={perfil.avatar} tamanho={40} />
            <span>
              <strong>{perfil.apelido}</strong> + bot parceiro
            </span>
          </div>
          <span className="placar__x">×</span>
          <span>2 bots adversários</span>
        </div>
        <EscolhaNivel titulo="Seu parceiro" valor={config.parceiro} onChange={(parceiro) => setConfig({ ...config, parceiro })} />
        <EscolhaNivel titulo="Adversários" valor={config.adversarios} onChange={(adversarios) => setConfig({ ...config, adversarios })} />
        <div className="linha-botoes">
          <button type="button" className="botao botao--grande botao--aceitar" onClick={() => partida.iniciar(perfil, config)}>
            Começar partida
          </button>
          <Link to="/" className="botao botao--pedra">
            Voltar
          </Link>
        </div>
      </main>
    );
  }

  const { visao } = partida;
  const venci = visao.vencedora === duplaDe(MEU_ASSENTO);

  return (
    <main className="pagina pagina--mesa">
      <Mesa
        visao={visao}
        anuncio={partida.anuncio}
        narracao={partida.narracao}
        pausado={partida.pausado}
        onAcao={partida.aplicar}
        onSair={() => setConfirmarSaida(true)}
      />

      {confirmarSaida && (
        <div className="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="titulo-sair">
          <div className="cartao">
            <h2 id="titulo-sair">Sair da partida?</h2>
            <p>A partida contra os bots será encerrada sem resultado.</p>
            <div className="linha-botoes">
              <button type="button" className="botao botao--correr" onClick={() => { setConfirmarSaida(false); partida.sair(); }}>
                Sair
              </button>
              <button type="button" className="botao botao--pedra" onClick={() => setConfirmarSaida(false)} autoFocus>
                Continuar jogando
              </button>
            </div>
          </div>
        </div>
      )}

      {visao.fase === 'encerrada' && !partida.pausado && (
        <div className="sobreposicao" role="dialog" aria-modal="true" aria-labelledby="titulo-fim">
          <div className={`cartao fim ${venci ? 'fim--vitoria' : 'fim--derrota'}`}>
            <h2 id="titulo-fim">{venci ? 'Vocês venceram!' : 'Eles venceram'}</h2>
            <p className="fim__placar">
              {visao.placar[duplaDe(MEU_ASSENTO)]} × {visao.placar[1 - duplaDe(MEU_ASSENTO)]}
            </p>
            <div className="linha-botoes">
              <button type="button" className="botao botao--aceitar" onClick={partida.revanche} autoFocus>
                Revanche
              </button>
              <button type="button" className="botao botao--pedra" onClick={partida.sair}>
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
