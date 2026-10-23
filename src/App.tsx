import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ContraBots } from './pages/ContraBots.tsx';
import { EmBreve } from './pages/EmBreve.tsx';
import { HistoricoMarcador } from './pages/HistoricoMarcador.tsx';
import { Inicio } from './pages/Inicio.tsx';
import { Marcador } from './pages/Marcador.tsx';
import { Perfil } from './pages/Perfil.tsx';
import { Preferencias } from './pages/Preferencias.tsx';
import { Regras } from './pages/Regras.tsx';
import { SalaOnline } from './pages/SalaOnline.tsx';
import { usePreferencias } from './ui/armazenamento.ts';
import { carregarSons, configurarSom } from './ui/sons.ts';

export function App() {
  const [prefs] = usePreferencias();

  useEffect(() => {
    void carregarSons();
  }, []);

  useEffect(() => {
    configurarSom({ ligado: prefs.som, volume: prefs.volume });
    document.documentElement.toggleAttribute('data-alto-contraste', prefs.altoContraste);
  }, [prefs]);

  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/bots" element={<ContraBots />} />
      <Route path="/perfil" element={<Perfil />} />
      <Route path="/preferencias" element={<Preferencias />} />
      <Route path="/regras" element={<Regras />} />
      <Route path="/sala/:codigo?" element={<SalaOnline />} />
      <Route path="/marcador/historico" element={<HistoricoMarcador />} />
      <Route path="/marcador" element={<Marcador />} />
      <Route path="*" element={<EmBreve titulo="Página não encontrada" />} />
    </Routes>
  );
}
