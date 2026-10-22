import { useCallback, useRef, useState } from 'react';
import { gravar, lerBruto } from '../ui/armazenamento.ts';
import { tocar } from '../ui/sons.ts';
import * as M from './marcador.ts';
import type { DuplaMarcador, EstadoMarcador, Registro } from './marcador.ts';

export const CHAVE_MARCADOR = 'trucao.marcador.v1';

/** Liga a lógica pura do marcador ao armazenamento do dispositivo e aos sons (RN-025, RNF-006). */
export function useMarcador() {
  const [inicial] = useState(() => M.carregarEstado(lerBruto<unknown>(CHAVE_MARCADOR)));
  const [estado, setEstado] = useState<EstadoMarcador>(inicial.estado);
  const [persistiu, setPersistiu] = useState(true);
  const ref = useRef(estado);

  const salvar = useCallback((novo: EstadoMarcador) => {
    ref.current = novo;
    setEstado(novo);
    setPersistiu(gravar(CHAVE_MARCADOR, novo));
  }, []);

  const iniciar = useCallback((nomes: [string, string]) => salvar(M.iniciar(ref.current, nomes, new Date())), [salvar]);

  const registrar = useCallback(
    (dupla: DuplaMarcador, valor: M.ValorRegistro): M.Aviso | undefined => {
      const r = M.registrar(ref.current, dupla, valor, new Date());
      if (!r.ok) return undefined;
      salvar(r.estado);
      tocar(r.aviso === 'vitoria' ? 'vitoria' : r.aviso === 'ferro' ? 'maoDeFerro' : r.aviso === 'onze' ? 'maoDeOnze' : 'ganharMao');
      return r.aviso;
    },
    [salvar],
  );

  const desfazer = useCallback((): Registro | undefined => {
    const r = M.desfazer(ref.current);
    if (!r.desfeito) return undefined;
    salvar(r.estado);
    tocar('jogar');
    return r.desfeito;
  }, [salvar]);

  const apagarHistorico = useCallback(() => salvar(M.apagarHistorico(ref.current)), [salvar]);

  return { estado, ignorados: inicial.ignorados, persistiu, iniciar, registrar, desfazer, apagarHistorico };
}
