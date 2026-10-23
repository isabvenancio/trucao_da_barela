import { avatarPorId } from './avatares-catalogo.ts';
import { PixelArt } from './PixelArt.tsx';

export { AVATARES, AVATAR_PADRAO, avatarPorId } from './avatares-catalogo.ts';
export type { DesenhoAvatar } from './avatares-catalogo.ts';

export function Avatar({ id, tamanho = 48, rotulo }: { id: string; tamanho?: number; rotulo?: string }) {
  const a = avatarPorId(id);
  return (
    <span className="avatar" style={{ width: tamanho, height: tamanho, background: a.fundo }}>
      <PixelArt mapa={a.mapa} paleta={a.paleta} titulo={rotulo ?? a.nome} />
    </span>
  );
}
