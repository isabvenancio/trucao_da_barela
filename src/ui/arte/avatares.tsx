import { PixelArt } from './PixelArt.tsx';

/** Catálogo de avatares: personagens originais em blocos criados para o Trucão da Barela (RNF-010). */
export interface DesenhoAvatar {
  id: string;
  nome: string;
  mapa: string[];
  paleta: Record<string, string>;
  fundo: string;
}

const PELE_CLARA = '#f1c7a3';
const PELE_MEDIA = '#c68c5c';
const PELE_ESCURA = '#8a5a3b';
const OLHO = '#1e1b18';
const BOCA = '#7a3b2e';

export const AVATARES: DesenhoAvatar[] = [
  {
    id: 'mineradora',
    nome: 'Mineradora',
    fundo: '#4a4a4a',
    paleta: { Y: '#f2c94c', L: '#fffbe6', h: '#5c3a1e', s: PELE_MEDIA, k: OLHO, n: '#a8704a', m: BOCA, o: '#d9762b' },
    mapa: ['..YYYYYY..', '.YYYLLYYY.', 'YYYYYYYYYY', 'hssssssssh', 'hskksskksh', 'hssssssssh', 'hsssnnsssh', 'hssmmmmssh', '.ssssssss.', '..oooooo..'],
  },
  {
    id: 'lenhador',
    nome: 'Lenhador',
    fundo: '#2f5a2a',
    paleta: { R: '#c0392b', r: '#7b1f17', s: PELE_CLARA, k: OLHO, n: '#d9a27c', b: '#d2691e', m: BOCA },
    mapa: ['..RrRrRr..', '.rRrRrRrR.', 'RrRrRrRrRr', 'ssssssssss', 'skksssskks', 'ssssnnssss', 'bsbbbbbbsb', 'bbbmmmmbbb', '.bbbbbbbb.', '..bbbbbb..'],
  },
  {
    id: 'ferreira',
    nome: 'Ferreira',
    fundo: '#6b2f1a',
    paleta: { P: '#1c1c1c', s: PELE_ESCURA, G: '#7d7d7d', c: '#6fc3df', n: '#6e4429', m: '#4a2218', a: '#8b5a2b' },
    mapa: ['...PPPP...', '.PPPPPPPP.', 'PPPPPPPPPP', 'PssssssssP', 'GGccGGccGG', 'PssssssssP', 'PsssnnsssP', '.ssmmmmss.', '.ssssssss.', '..aaaaaa..'],
  },
  {
    id: 'explorador',
    nome: 'Explorador',
    fundo: '#a8794d',
    paleta: { H: '#6b4423', h: '#2c1a0e', s: PELE_MEDIA, k: OLHO, n: '#a8704a', B: '#3b2414', m: BOCA, v: '#4f7a28' },
    mapa: ['...HHHH...', '..HHHHHH..', '.hhhhhhhh.', 'HHHHHHHHHH', 'ssssssssss', 'skksssskks', 'ssssnnssss', 'sBBBBBBBBs', '.ssmmmmss.', '..vvvvvv..'],
  },
  {
    id: 'feiticeira',
    nome: 'Feiticeira',
    fundo: '#1f1a3a',
    paleta: { U: '#6a3fa0', u: '#3e2366', s: '#e8d9c5', C: '#5ff2e8', m: '#9b4f6a' },
    mapa: ['....UU....', '...UUUU...', '..UUUUUU..', '.UUuuuuUU.', 'UUussssuUU', 'UUsCssCsUU', 'UUssssssUU', 'UUssmmssUU', 'UUUssssUUU', 'UUUUUUUUUU'],
  },
  {
    id: 'cozinheiro',
    nome: 'Cozinheiro',
    fundo: '#b0413e',
    paleta: { W: '#f5f5f5', w: '#c9c9c9', s: PELE_CLARA, k: OLHO, p: '#f08a8a', n: '#d9a27c', m: BOCA },
    mapa: ['..WWWWWW..', '.WWWWWWWW.', '.WwWWWWwW.', '..WWWWWW..', '.ssssssss.', 'ssksssskss', 'sppssssspp', 'ssssnnssss', '.ssmmmmss.', '..WWWWWW..'],
  },
  {
    id: 'pescadora',
    nome: 'Pescadora',
    fundo: '#1f5f8b',
    paleta: { A: '#2e86c1', h: '#c0562b', s: PELE_CLARA, k: OLHO, f: '#c98a5e', n: '#d9a27c', m: BOCA },
    mapa: ['..AAAAAA..', '.AAAAAAAA.', 'AAAAAAAAAA', 'hssssssssh', 'hskksskksh', 'hsfssssfsh', 'hsssnnsssh', 'hhssmmsshh', 'hhsssssshh', '.hhAAAAhh.'],
  },
  {
    id: 'golem',
    nome: 'Golem de pedra',
    fundo: '#2b3a2b',
    paleta: { G: '#8a8a8a', g: '#6a6a6a', M: '#4f8a3a', E: '#7dff6a', k: '#2a2a2a' },
    mapa: ['MMgGGGgMMM', 'GGgGGGGgGG', 'GGGGgGGGGG', 'GEEGGGGEEG', 'GEEGGGGEEG', 'GGGGggGGGG', 'gGGGGGGGGg', 'GGkkkkkkGG', 'GGGGGGGGgG', 'gGGGGGGGGG'],
  },
];

export const AVATAR_PADRAO = 'mineradora';

export function avatarPorId(id: string): DesenhoAvatar {
  return AVATARES.find((a) => a.id === id) ?? AVATARES[0]!;
}

export function Avatar({ id, tamanho = 48, rotulo }: { id: string; tamanho?: number; rotulo?: string }) {
  const a = avatarPorId(id);
  return (
    <span className="avatar" style={{ width: tamanho, height: tamanho, background: a.fundo }}>
      <PixelArt mapa={a.mapa} paleta={a.paleta} titulo={rotulo ?? a.nome} />
    </span>
  );
}
