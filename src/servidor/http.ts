import { repositorioPadrao } from './repositorio.ts';
import { Servico } from './servico.ts';
import { ErroServidor } from './tipos.ts';

/**
 * Rotas da API online com Request/Response padrão da Web.
 * Usadas pelas funções da Vercel (api/*.ts) e pelo servidor de desenvolvimento do Vite.
 */
let servicoPadrao: Servico | undefined;

function servico(): Servico {
  servicoPadrao ??= new Servico(repositorioPadrao());
  return servicoPadrao;
}

function json(dados: unknown, status = 200): Response {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function corpo(req: Request): Promise<Record<string, unknown>> {
  try {
    const dados = (await req.json()) as unknown;
    return dados && typeof dados === 'object' ? (dados as Record<string, unknown>) : {};
  } catch {
    throw new ErroServidor('DADOS_INVALIDOS', 'Corpo da requisição inválido.');
  }
}

const texto = (v: unknown) => (typeof v === 'string' ? v : '');

export type Rota = 'criar' | 'entrar' | 'assentos' | 'iniciar' | 'acao' | 'estado' | 'sair';

export async function tratar(rota: Rota, req: Request, s: Servico = servico()): Promise<Response> {
  try {
    if (rota === 'estado') {
      if (req.method !== 'GET') return json({ erro: 'Método não permitido.' }, 405);
      const url = new URL(req.url);
      const token = req.headers.get('x-credencial') ?? '';
      const r = await s.estado(url.searchParams.get('codigo') ?? '', token, Number(url.searchParams.get('desde') ?? -1));
      return json(r);
    }
    if (req.method !== 'POST') return json({ erro: 'Método não permitido.' }, 405);
    const b = await corpo(req);
    const token = req.headers.get('x-credencial') ?? b.token;
    switch (rota) {
      case 'criar':
        return json(await s.criarSala(b.perfil), 201);
      case 'entrar':
        return json(await s.entrar(texto(b.codigo), b.perfil, token));
      case 'assentos':
        await s.operar(texto(b.codigo), token, b.operacao as never);
        return json({ ok: true });
      case 'iniciar':
        await s.iniciar(texto(b.codigo), token);
        return json({ ok: true });
      case 'acao':
        await s.acao(texto(b.codigo), token, b.acao as never);
        return json({ ok: true });
      case 'sair':
        await s.sair(texto(b.codigo), token);
        return json({ ok: true });
    }
  } catch (e) {
    if (e instanceof ErroServidor) return json({ erro: e.message, codigo: e.codigo }, e.status);
    console.error(e);
    return json({ erro: 'Erro inesperado no servidor.', codigo: 'INDISPONIVEL' }, 500);
  }
  return json({ erro: 'Rota desconhecida.' }, 404);
}

/** Mapeia o caminho /api/... para a rota. */
export function rotaDoCaminho(caminho: string): Rota | undefined {
  const mapa: Record<string, Rota> = {
    '/api/salas/criar': 'criar',
    '/api/salas/entrar': 'entrar',
    '/api/salas/assentos': 'assentos',
    '/api/salas/estado': 'estado',
    '/api/salas/sair': 'sair',
    '/api/partidas/iniciar': 'iniciar',
    '/api/partidas/acao': 'acao',
  };
  return mapa[caminho.replace(/\/$/, '')];
}
