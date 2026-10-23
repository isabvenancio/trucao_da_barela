// Função da Vercel: rota criar. A lógica está em src/servidor (bundle gerado por `npm run build:api`).
import { tratar } from '../_lib/servidor.mjs';

export function POST(request) {
  return tratar('criar', request);
}
