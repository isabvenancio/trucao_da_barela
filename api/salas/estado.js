// Função da Vercel: rota estado. A lógica está em src/servidor (bundle gerado por `npm run build:api`).
import { tratar } from '../_lib/servidor.mjs';

export function GET(request) {
  return tratar('estado', request);
}
