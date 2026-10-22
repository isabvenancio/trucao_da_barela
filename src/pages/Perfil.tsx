import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { usePerfil, validarApelido } from '../ui/armazenamento.ts';
import { AVATARES, Avatar } from '../ui/arte/avatares.tsx';

/** UC-001: configurar apelido e avatar. */
export function Perfil() {
  const [perfil, salvar, persistiu] = usePerfil();
  const [apelido, setApelido] = useState(perfil.apelido);
  const [avatar, setAvatar] = useState(perfil.avatar);
  const [erro, setErro] = useState<string>();
  const [salvo, setSalvo] = useState(false);

  const confirmar = (e: FormEvent) => {
    e.preventDefault();
    const problema = validarApelido(apelido);
    if (problema) {
      setErro(problema);
      return;
    }
    salvar({ apelido: apelido.trim(), avatar });
    setSalvo(true);
  };

  return (
    <main className="pagina">
      <h1>Seu perfil</h1>
      <form className="cartao formulario" onSubmit={confirmar} noValidate>
        <label className="campo">
          <span>Apelido</span>
          <input
            value={apelido}
            maxLength={24}
            onChange={(e) => {
              setApelido(e.target.value);
              setErro(undefined);
              setSalvo(false);
            }}
            aria-invalid={!!erro}
            aria-describedby={erro ? 'erro-apelido' : undefined}
          />
          {erro && (
            <span id="erro-apelido" className="campo__erro">
              {erro}
            </span>
          )}
        </label>

        <fieldset className="avatares">
          <legend>Avatar</legend>
          {AVATARES.map((a) => (
            <label key={a.id} className={`avatares__opcao ${avatar === a.id ? 'avatares__opcao--ativa' : ''}`}>
              <input
                type="radio"
                name="avatar"
                value={a.id}
                checked={avatar === a.id}
                onChange={() => {
                  setAvatar(a.id);
                  setSalvo(false);
                }}
              />
              <Avatar id={a.id} tamanho={64} />
              <span>{a.nome}</span>
            </label>
          ))}
        </fieldset>

        <div className="linha-botoes">
          <button type="submit" className="botao botao--aceitar">
            Salvar
          </button>
          <Link to="/" className="botao botao--pedra">
            Voltar
          </Link>
        </div>
        <p className="formulario__status" aria-live="polite">
          {salvo && (persistiu ? 'Perfil salvo.' : 'Perfil salvo só nesta sessão: o armazenamento do navegador está indisponível.')}
        </p>
      </form>
    </main>
  );
}
