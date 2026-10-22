import type { Carta as TCarta, Valor } from '../../engine/index.ts';
import { nomeCarta } from '../../engine/index.ts';
import { NAIPES } from './naipes.ts';
import { PixelArt } from './PixelArt.tsx';

const NOMES_VALOR: Partial<Record<Valor, string>> = { Q: 'dama', J: 'valete', K: 'rei', A: 'ás' };

export function descreverCarta(carta: TCarta, manilha?: Valor): string {
  const base = nomeCarta(carta).replace(/^(Q|J|K|A) /, (v) => `${NOMES_VALOR[v.trim() as Valor]} `);
  return manilha && carta.valor === manilha ? `${base}, manilha` : base;
}

export interface PropsCarta {
  carta: TCarta | null;
  /** Mostrar o verso (carta alheia, encoberta ou mão de ferro). */
  verso?: boolean;
  manilha?: Valor;
  tamanho?: 'p' | 'm' | 'g';
  destaque?: boolean;
  esmaecida?: boolean;
}

/** Carta em pixel art: frente com valor e naipe, ou verso de tábuas de madeira com a placa do T. */
export function Carta({ carta, verso, manilha, tamanho = 'm', destaque, esmaecida }: PropsCarta) {
  const classes = ['carta', `carta--${tamanho}`];
  if (destaque) classes.push('carta--destaque');
  if (esmaecida) classes.push('carta--esmaecida');

  if (verso || !carta) {
    return (
      <div className={`${classes.join(' ')} carta--verso`} role="img" aria-label="Carta virada">
        <VersoCarta />
      </div>
    );
  }

  const naipe = NAIPES[carta.naipe];
  const ehManilha = manilha !== undefined && carta.valor === manilha;
  if (ehManilha) classes.push('carta--manilha');

  return (
    <div className={classes.join(' ')} role="img" aria-label={descreverCarta(carta, manilha)} style={{ color: naipe.cor }}>
      <span className="carta__valor carta__valor--topo" aria-hidden="true">{carta.valor}</span>
      <div className="carta__naipe">
        <PixelArt mapa={naipe.mapa} paleta={naipe.paleta} />
      </div>
      <span className="carta__valor carta__valor--base" aria-hidden="true">{carta.valor}</span>
      {ehManilha && <span className="carta__selo" aria-hidden="true">M</span>}
    </div>
  );
}

const MAPA_VERSO = [
  'BBBBBBBBBBBB',
  'BwwwwwwwwwwB',
  'BWWWWdWWWWWB',
  'BddddddddddB',
  'BwwwwwwwdwwB',
  'BwwGGGGGGwwB',
  'BWWGTTTTGWWB',
  'BddGGTTGGddB',
  'BwwGGTTGGwwB',
  'BWWGGTTGGWWB',
  'BddGGGGGGddB',
  'BwwwwdwwwwwB',
  'BWWWWWWWWWWB',
  'BddddddddddB',
  'BwwwwwwwdwwB',
  'BBBBBBBBBBBB',
];

/** Verso: tábuas de madeira com uma placa de ouro com o T de Trucão. */
export function VersoCarta() {
  return (
    <PixelArt
      mapa={MAPA_VERSO}
      paleta={{ B: '#3b2414', w: '#a8794d', W: '#94673f', d: '#5c3f2b', G: '#e8a317', T: '#fff1b8' }}
    />
  );
}
