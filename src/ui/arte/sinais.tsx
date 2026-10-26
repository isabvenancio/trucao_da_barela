import type { Sinal } from '../../engine/index.ts';
import { PixelArt } from './PixelArt.tsx';

/** RN-027: gesto e significado de cada sinal, com um rostinho em pixel art (arte autoral). */
export interface DesenhoSinal {
  nome: string;
  gesto: string;
  significado: string;
  /** Linhas do rosto que mudam em relação ao rosto base (índice → linha). */
  troca: Record<number, string>;
}

const BASE = [
  '.kkkkkkkk.',
  'kssssssssk',
  'ksbbssbbsk',
  'kseesseesk',
  'kseesseesk',
  'kssssssssk',
  'kssmmmmssk',
  'kssssssssk',
  'kssssssssk',
  '.kkkkkkkk.',
];

const PALETA = { k: '#3b2414', s: '#f1c7a3', b: '#5c3a1e', e: '#1e1b18', m: '#a8483a', t: '#e86a8a', c: '#f08a8a', w: '#ffffff' };

export const SINAIS_INFO: Record<Sinal, DesenhoSinal> = {
  zap: { nome: 'Zap', gesto: 'Pisca o olho', significado: 'Tenho o zap', troca: { 3: 'kssssseesk' } },
  copas: { nome: 'Copas', gesto: 'Levanta as sobrancelhas', significado: 'Tenho a de copas', troca: { 1: 'ksbbssbbsk', 2: 'kssssssssk' } },
  espadilha: { nome: 'Espadilha', gesto: 'Mostra a língua', significado: 'Tenho a espadilha', troca: { 7: 'ksssttsssk' } },
  picafumo: { nome: 'Picafumo', gesto: 'Enche as bochechas', significado: 'Tenho o picafumo', troca: { 5: 'kcssssssck', 6: 'kcssmmssck' } },
  tres: { nome: 'Três', gesto: 'Morde o lábio', significado: 'Tenho um 3', troca: { 6: 'ksswwwwssk', 7: 'kssmmmmssk' } },
  dois: { nome: 'Dois', gesto: 'Faz biquinho', significado: 'Tenho um 2', troca: { 6: 'ksssmmsssk', 7: 'ksssmmsssk' } },
  as: { nome: 'Ás', gesto: 'Abre a boca', significado: 'Tenho um ás', troca: { 6: 'kssmmmmssk', 7: 'kssmkkmssk', 8: 'kssmmmmssk' } },
  nada: { nome: 'Nada', gesto: 'Fecha os olhos', significado: 'Não tenho nada', troca: { 3: 'kssssssssk', 4: 'kskksskksk', 6: 'ksskkkkssk' } },
  truca: { nome: 'Pede truco', gesto: 'Sorri', significado: 'Pode trucar', troca: { 6: 'kswwwwwwsk', 7: 'kssmmmmssk' } },
};

export function mapaDoSinal(sinal: Sinal): string[] {
  const troca = SINAIS_INFO[sinal].troca;
  return BASE.map((linha, i) => troca[i] ?? linha);
}

export function RostoSinal({ sinal, tamanho = 32, rotulo }: { sinal: Sinal; tamanho?: number; rotulo?: boolean }) {
  const info = SINAIS_INFO[sinal];
  return (
    <span className="rosto-sinal" style={{ width: tamanho, height: tamanho }}>
      <PixelArt mapa={mapaDoSinal(sinal)} paleta={PALETA} titulo={rotulo ? `${info.nome}: ${info.gesto.toLowerCase()}` : undefined} />
    </span>
  );
}
