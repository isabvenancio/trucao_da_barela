import { Link } from 'react-router-dom';

const opcoes = [
  { para: '/bots', titulo: 'Jogar contra bots', detalhe: 'Você e um bot contra dois bots' },
  { para: '/sala', titulo: 'Jogar online', detalhe: 'Crie uma sala e chame a galera' },
  { para: '/marcador', titulo: 'Marcador de pontos', detalhe: 'Para jogar com baralho de verdade' },
  { para: '/regras', titulo: 'Regras', detalhe: 'Truco paulista do jeito que jogamos' },
];

export function Inicio() {
  return (
    <main className="pagina">
      <h1 className="logo">Trucão da Barela</h1>
      <nav className="menu" aria-label="Modos de jogo">
        {opcoes.map((o) => (
          <Link key={o.para} to={o.para} className="bloco-botao">
            <span className="bloco-botao__titulo">{o.titulo}</span>
            <span className="bloco-botao__detalhe">{o.detalhe}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
