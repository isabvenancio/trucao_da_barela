/// <reference types="vitest/config" />
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig } from 'vite';
import type { Plugin, ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Em `npm run dev`, atende /api/* com o mesmo código das funções da Vercel (src/servidor/http.ts).
 * Sem Supabase configurado, as salas ficam em memória: dá para jogar online em várias abas localmente.
 */
function apiLocal(): Plugin {
  return {
    name: 'trucao-api-local',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url?.startsWith('/api/')) return next();
        const { tratar, rotaDoCaminho } = (await server.ssrLoadModule('/src/servidor/http.ts')) as {
          tratar: (rota: string, req: Request) => Promise<Response>;
          rotaDoCaminho: (caminho: string) => string | undefined;
        };
        const url = new URL(req.url, 'http://localhost');
        const rota = rotaDoCaminho(url.pathname);
        if (!rota) return next();
        const partes: Buffer[] = [];
        for await (const p of req) partes.push(p as Buffer);
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
        const request = new Request(url, {
          method: req.method,
          headers,
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(partes),
        });
        const resposta = await tratar(rota, request);
        res.statusCode = resposta.status;
        resposta.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(Buffer.from(await resposta.arrayBuffer()));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiLocal()],
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.ts', 'src/bots/**/*.ts', 'src/marcador/marcador.ts', 'src/servidor/**/*.ts'],
      exclude: ['**/__tests__/**', '**/index.ts', 'src/servidor/http.ts', 'src/servidor/tipos.ts'],
      thresholds: { lines: 90 },
    },
  },
});
