import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PREFERENCIAS_PADRAO, usePreferencias } from '../ui/armazenamento.ts';
import type { Velocidade } from '../ui/armazenamento.ts';
import { carregarSons, NOMES_SLOTS, origemDosSons, SLOTS, tocar } from '../ui/sons.ts';

/** RF-023: toca cada slot e mostra se vem do arquivo próprio ou da reserva sintetizada. */
function TestarSons() {
  const [origem, setOrigem] = useState(origemDosSons);
  useEffect(() => {
    void carregarSons().then(() => setOrigem(origemDosSons()));
  }, []);
  const comArquivo = SLOTS.filter((s) => origem[s]).length;
  return (
    <details className="testar-sons">
      <summary>
        Testar sons ({comArquivo} de {SLOTS.length} com arquivo próprio)
      </summary>
      <p className="formulario__status">
        Para trocar um som, coloque o arquivo em <code>public/sons/</code> e escreva o nome dele no <code>manifesto.json</code>.
      </p>
      <ul className="testar-sons__lista">
        {SLOTS.map((s) => (
          <li key={s}>
            <button type="button" className="botao botao--pequeno botao--pedra" onClick={() => tocar(s)} aria-label={`Tocar ${NOMES_SLOTS[s]}`}>
              ▶
            </button>
            <span className="testar-sons__nome">{NOMES_SLOTS[s]}</span>
            <code className="testar-sons__slot">{s}</code>
            <span className={`tag ${origem[s] ? 'tag--ouro' : ''}`}>{origem[s] ?? 'reserva'}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** UC-002: som, velocidade e alto contraste, aplicados na hora. */
export function Preferencias() {
  const [prefs, salvar, persistiu] = usePreferencias();

  return (
    <main className="pagina">
      <h1>Preferências</h1>
      <div className="cartao formulario">
        <label className="campo campo--linha">
          <input type="checkbox" checked={prefs.som} onChange={(e) => salvar({ ...prefs, som: e.target.checked })} />
          <span>Som ligado</span>
        </label>

        <label className="campo">
          <span>Volume: {Math.round(prefs.volume)}%</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={prefs.volume}
            disabled={!prefs.som}
            onChange={(e) => salvar({ ...prefs, volume: Number(e.target.value) })}
            onPointerUp={() => tocar('ganharRodada')}
            onKeyUp={() => tocar('ganharRodada')}
          />
        </label>

        <fieldset className="escolha">
          <legend>Velocidade das jogadas</legend>
          <div className="escolha__opcoes">
            {(['lenta', 'normal', 'rapida'] as Velocidade[]).map((v) => (
              <label key={v} className={`escolha__opcao ${prefs.velocidade === v ? 'escolha__opcao--ativa' : ''}`}>
                <input type="radio" name="velocidade" checked={prefs.velocidade === v} onChange={() => salvar({ ...prefs, velocidade: v })} />
                <span className="escolha__nome">{{ lenta: 'Lenta', normal: 'Normal', rapida: 'Rápida' }[v]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="campo campo--linha">
          <input type="checkbox" checked={prefs.altoContraste} onChange={(e) => salvar({ ...prefs, altoContraste: e.target.checked })} />
          <span>Alto contraste</span>
        </label>

        {prefs.som && <TestarSons />}

        <div className="linha-botoes">
          <button type="button" className="botao botao--pedra" onClick={() => salvar({ ...PREFERENCIAS_PADRAO })}>
            Restaurar padrão
          </button>
          <Link to="/" className="botao botao--aceitar">
            Pronto
          </Link>
        </div>
        {!persistiu && <p className="formulario__status">As preferências valem só nesta sessão: o armazenamento do navegador está indisponível.</p>}
      </div>
    </main>
  );
}
