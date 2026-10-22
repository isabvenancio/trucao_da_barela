import type { ReactElement } from 'react';

/**
 * Desenha pixel art a partir de um mapa de caracteres. Cada caractere é uma cor da paleta;
 * '.' é transparente. Toda a arte do jogo é autoral e gerada assim (RNF-010).
 */
export interface PropsPixelArt {
  mapa: readonly string[];
  paleta: Readonly<Record<string, string>>;
  tamanho?: number | string;
  titulo?: string;
  className?: string;
}

export function PixelArt({ mapa, paleta, tamanho = '100%', titulo, className }: PropsPixelArt) {
  const largura = Math.max(...mapa.map((l) => l.length));
  const altura = mapa.length;
  const pixels: ReactElement[] = [];
  mapa.forEach((linha, y) => {
    let x = 0;
    while (x < linha.length) {
      const ch = linha[x]!;
      let fim = x + 1;
      while (fim < linha.length && linha[fim] === ch) fim++;
      const cor = paleta[ch];
      if (ch !== '.' && cor) pixels.push(<rect key={`${x}-${y}`} x={x} y={y} width={fim - x} height={1} fill={cor} />);
      x = fim;
    }
  });
  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      width={tamanho}
      height={tamanho}
      shapeRendering="crispEdges"
      className={className}
      role={titulo ? 'img' : undefined}
      aria-hidden={titulo ? undefined : true}
    >
      {titulo && <title>{titulo}</title>}
      {pixels}
    </svg>
  );
}
