import { Route, Routes } from 'react-router-dom';
import { Inicio } from './pages/Inicio.tsx';
import { EmBreve } from './pages/EmBreve.tsx';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/bots" element={<EmBreve titulo="Partida contra bots" fase={4} />} />
      <Route path="/sala/:codigo?" element={<EmBreve titulo="Sala online" fase={6} />} />
      <Route path="/marcador" element={<EmBreve titulo="Marcador de pontos" fase={5} />} />
      <Route path="/regras" element={<EmBreve titulo="Regras e tutorial" fase={7} />} />
      <Route path="*" element={<EmBreve titulo="Página não encontrada" />} />
    </Routes>
  );
}
