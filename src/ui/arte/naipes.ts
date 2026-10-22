import type { Naipe } from '../../engine/index.ts';

/** Naipes redesenhados como itens de pixel art próprios do Trucão da Barela. */
export interface DesenhoNaipe {
  nome: string;
  mapa: string[];
  paleta: Record<string, string>;
  /** Cor do texto do valor na carta. */
  cor: string;
}

export const NAIPES: Record<Naipe, DesenhoNaipe> = {
  // Pepita de ouro lapidada
  ouros: {
    nome: 'ouros',
    cor: '#9a6a00',
    paleta: { O: '#e8a317', H: '#ffe27a', S: '#a86a00', B: '#5c3a00' },
    mapa: [
      '...B...',
      '..BHB..',
      '.BHOOB.',
      'BHOOOSB',
      '.BOOSB.',
      '..BSB..',
      '...B...',
    ],
  },
  // Espada curta de ferro com cabo de madeira
  espadas: {
    nome: 'espadas',
    cor: '#34495e',
    paleta: { L: '#d9e2ea', S: '#8ea2b5', B: '#2c3e50', G: '#c08a3e', M: '#6b4423' },
    mapa: [
      '...B...',
      '..BLB..',
      '..BLS..',
      '..BLS..',
      '..BLS..',
      '.GGGGG.',
      '...M...',
      '...M...',
      '..GGG..',
    ],
  },
  // Coração de pixel
  copas: {
    nome: 'copas',
    cor: '#b3261e',
    paleta: { R: '#d93a2b', H: '#ff8a7a', D: '#8c1d15' },
    mapa: [
      '.RR.RR.',
      'RHRRRRR',
      'RHRRRRR',
      'RRRRRRD',
      '.RRRRD.',
      '..RRD..',
      '...D...',
    ],
  },
  // Trevo de folhas em bloco
  paus: {
    nome: 'paus',
    cor: '#1f5130',
    paleta: { V: '#2f7a46', H: '#5fb37a', D: '#1a4a2a', M: '#6b4423' },
    mapa: [
      '..VVV..',
      '..VHV..',
      'VVVVVVV',
      'VHVVVHV',
      'DVDMDVD',
      '...M...',
      '..MMM..',
    ],
  },
};
