import { Link } from 'react-router-dom';

export function EmBreve({ titulo, fase }: { titulo: string; fase?: number }) {
  return (
    <main className="pagina">
      <h1>{titulo}</h1>
      {fase && <p>Chega na fase {fase} do plano de implementação.</p>}
      <Link to="/" className="bloco-botao">
        Voltar ao início
      </Link>
    </main>
  );
}
