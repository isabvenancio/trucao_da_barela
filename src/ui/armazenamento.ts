import { useCallback, useEffect, useState } from 'react';
import { AVATAR_PADRAO, AVATARES } from './arte/avatares.tsx';

/**
 * Leitura e escrita no dispositivo (RNF-006, RNF-007). Tudo envolto em try/catch:
 * com armazenamento indisponível, os dados valem só nesta sessão (UC-001 E1, UC-002 E1).
 */
export function ler<T>(chave: string, padrao: T): T {
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto ? { ...padrao, ...(JSON.parse(bruto) as T) } : padrao;
  } catch {
    return padrao;
  }
}

export function lerBruto<T>(chave: string): T | undefined {
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : undefined;
  } catch {
    return undefined;
  }
}

/** Retorna `false` se não foi possível gravar. */
export function gravar(chave: string, valor: unknown): boolean {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

export function apagar(chave: string): void {
  try {
    window.localStorage.removeItem(chave);
  } catch {
    /* sem armazenamento: nada a apagar */
  }
}

/* ---------------- Perfil (UC-001, RN-023) ---------------- */

export interface Perfil {
  apelido: string;
  avatar: string;
}

export const CHAVE_PERFIL = 'trucao.perfil.v1';
const SUGESTOES = ['Zé do Zap', 'Rainha do Truco', 'Mão de Onze', 'Picafumo', 'Espadilha', 'Seis Pedido'];

export function perfilPadrao(): Perfil {
  return { apelido: SUGESTOES[Math.floor(Math.random() * SUGESTOES.length)]!, avatar: AVATAR_PADRAO };
}

/** RN-023: 2 a 16 caracteres, não apenas espaços. */
export function validarApelido(apelido: string): string | undefined {
  const limpo = apelido.trim();
  if (limpo.length < 2) return 'O apelido precisa ter pelo menos 2 caracteres.';
  if (limpo.length > 16) return 'O apelido pode ter no máximo 16 caracteres.';
  return undefined;
}

export function validarAvatar(id: string): boolean {
  return AVATARES.some((a) => a.id === id);
}

/* ---------------- Preferências (UC-002) ---------------- */

export type Velocidade = 'lenta' | 'normal' | 'rapida';

export interface Preferencias {
  som: boolean;
  volume: number;
  velocidade: Velocidade;
  altoContraste: boolean;
}

export const CHAVE_PREFERENCIAS = 'trucao.preferencias.v1';
export const PREFERENCIAS_PADRAO: Preferencias = { som: true, volume: 70, velocidade: 'normal', altoContraste: false };

export const FATOR_VELOCIDADE: Record<Velocidade, number> = { lenta: 1.6, normal: 1, rapida: 0.5 };

/* ---------------- Hook genérico com sincronização entre telas ---------------- */

const EVENTO = 'trucao:armazenamento';

export function useArmazenado<T extends object>(chave: string, padrao: () => T) {
  const [valor, setValor] = useState<T>(() => {
    const salvo = lerBruto<T>(chave);
    if (salvo) return { ...padrao(), ...salvo };
    // Primeira vez: grava o padrão para ele ficar estável entre telas e visitas.
    const inicial = padrao();
    gravar(chave, inicial);
    return inicial;
  });
  const [persistiu, setPersistiu] = useState(true);

  useEffect(() => {
    const ouvir = (e: Event) => {
      const detalhe = (e as CustomEvent<{ chave: string; valor: T }>).detail;
      if (detalhe.chave === chave) setValor(detalhe.valor);
    };
    window.addEventListener(EVENTO, ouvir);
    return () => window.removeEventListener(EVENTO, ouvir);
  }, [chave]);

  const salvar = useCallback(
    (novo: T) => {
      setValor(novo);
      setPersistiu(gravar(chave, novo));
      window.dispatchEvent(new CustomEvent(EVENTO, { detail: { chave, valor: novo } }));
    },
    [chave],
  );

  return [valor, salvar, persistiu] as const;
}

export function usePerfil() {
  return useArmazenado<Perfil>(CHAVE_PERFIL, perfilPadrao);
}

export function usePreferencias() {
  return useArmazenado<Preferencias>(CHAVE_PREFERENCIAS, () => ({ ...PREFERENCIAS_PADRAO }));
}
