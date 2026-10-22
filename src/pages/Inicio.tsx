import { Link } from 'react-router-dom';
import { usePerfil } from '../ui/armazenamento.ts';
import { Avatar } from '../ui/arte/avatares.tsx';
import { Carta } from '../ui/arte/Carta.tsx';

const opcoes = [
  { para: '/bots', titulo: 'Jogar contra bots', detalhe: 'Você e um bot contra dois bots' },
  { para: '/sala', titulo: 'Jogar online', detalhe: 'Crie uma sala e chame a galera' },
  { para: '/marcador', titulo: 'Marcador de pontos', detalhe: 'Para jogar com baralho de verdade' },
  { para: '/regras', titulo: 'Regras', detalhe: 'Truco paulista do jeito que jogamos' },
];

export function Inicio() {
  const [perfil] = usePerfil();
  return (
    <main className="pagina">
      <div className="logo-bloco" aria-hidden="true">
        <Carta carta={{ valor: '4', naipe: 'paus' }} manilha="4" tamanho="m" />
        <Carta carta={{ valor: '3', naipe: 'copas' }} tamanho="m" />
      </div>
      <h1 className="logo">Trucão da Barela</h1>

      <Link to="/perfil" className="perfil-resumo" aria-label={`Editar perfil de ${perfil.apelido}`}>
        <Avatar id={perfil.avatar} tamanho={48} />
        <span>
          <strong>{perfil.apelido}</strong>
          <small>Editar perfil</small>
        </span>
      </Link>

      <nav className="menu" aria-label="Modos de jogo">
        {opcoes.map((o) => (
          <Link key={o.para} to={o.para} className="bloco-botao">
            <span className="bloco-botao__titulo">{o.titulo}</span>
            <span className="bloco-botao__detalhe">{o.detalhe}</span>
          </Link>
        ))}
      </nav>

      <Link to="/preferencias" className="link-discreto">
        Preferências
      </Link>
    </main>
  );
}
