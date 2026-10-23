import { describe, expect, it } from 'vitest';
import { RepositorioMemoria, RepositorioSupabase, repositorioPadrao } from '../repositorio.ts';
import { Servico } from '../servico.ts';
import type { Sala } from '../tipos.ts';

interface Linha {
  codigo: string;
  versao: number;
  dados: Sala;
  expira_em: string;
}

/** PostgREST mínimo em memória, conferindo URL, cabeçalhos e o filtro de versão. */
function postgrestFalso(chave: string) {
  const tabela = new Map<string, Linha>();
  const chamadas: string[] = [];
  const buscar: typeof fetch = async (entrada, init) => {
    const url = new URL(String(entrada));
    const h = new Headers(init?.headers);
    chamadas.push(`${init?.method ?? 'GET'} ${url.pathname}${url.search}`);
    const jwt = chave.startsWith('eyJ');
    if (h.get('apikey') !== chave || (jwt ? h.get('Authorization') !== `Bearer ${chave}` : h.has('Authorization'))) {
      return new Response('{}', { status: 401 });
    }
    if (url.pathname !== '/rest/v1/salas') return new Response('{}', { status: 404 });
    const filtro = (nome: string) => url.searchParams.get(nome)?.replace(/^(eq|lt)\./, '');
    const metodo = init?.method ?? 'GET';
    if (metodo === 'POST') {
      const linha = JSON.parse(String(init!.body)) as Linha;
      if (tabela.has(linha.codigo)) return new Response('{}', { status: 409 });
      tabela.set(linha.codigo, linha);
      return new Response(null, { status: 201 });
    }
    if (metodo === 'GET') {
      const l = tabela.get(filtro('codigo')!);
      return Response.json(l ? [{ dados: l.dados }] : []);
    }
    if (metodo === 'PATCH') {
      const l = tabela.get(filtro('codigo')!);
      if (!l || String(l.versao) !== filtro('versao')) return Response.json([]);
      const nova = JSON.parse(String(init!.body)) as Linha;
      tabela.set(nova.codigo, nova);
      return Response.json([nova]);
    }
    if (metodo === 'DELETE') {
      const limite = new Date(filtro('expira_em')!);
      for (const [k, l] of tabela) if (new Date(l.expira_em) < limite) tabela.delete(k);
      return new Response(null, { status: 204 });
    }
    return new Response('{}', { status: 405 });
  };
  return { buscar, tabela, chamadas };
}

describe('RepositorioSupabase (PostgREST)', () => {
  it('cria, lê, grava com controle de versão e recusa versão desatualizada', async () => {
    const pg = postgrestFalso('segredo');
    const repo = new RepositorioSupabase('https://abc.supabase.co', 'segredo', pg.buscar);
    const s = new Servico(repo);
    const c = await s.criarSala({ apelido: 'Barela', avatar: 'mineradora' });
    await s.entrar(c.codigo, { apelido: 'Carol', avatar: 'ferreira' });
    const sala = (await repo.buscar(c.codigo))!;
    expect(sala.assentos[1]!.nome).toBe('Carol');
    expect(sala.versao).toBe(1);
    expect(await repo.salvar({ ...sala, versao: 2 }, 0)).toBe(false);
    expect(await repo.salvar({ ...sala, versao: 2 }, 1)).toBe(true);
    expect(await repo.criar(sala)).toBe(false);
    expect(await repo.buscar('NAOEXI')).toBeUndefined();
    expect(pg.chamadas.some((ch) => ch.startsWith('PATCH /rest/v1/salas?codigo=eq.') && ch.includes('versao=eq.0'))).toBe(true);
  });

  it('chave nova (sb_secret_...) vai só no cabeçalho apikey', async () => {
    const pg = postgrestFalso('sb_secret_abc');
    const repo = new RepositorioSupabase('https://abc.supabase.co', 'sb_secret_abc', pg.buscar);
    const c = await new Servico(repo).criarSala({ apelido: 'Barela', avatar: 'mineradora' });
    expect((await repo.buscar(c.codigo))!.codigo).toBe(c.codigo);
  });

  it('chave antiga (JWT service_role) vai também como Bearer', async () => {
    const pg = postgrestFalso('eyJhbGciOi.x.y');
    const repo = new RepositorioSupabase('https://abc.supabase.co', 'eyJhbGciOi.x.y', pg.buscar);
    const c = await new Servico(repo).criarSala({ apelido: 'Barela', avatar: 'mineradora' });
    expect((await repo.buscar(c.codigo))!.codigo).toBe(c.codigo);
  });

  it('limpa salas expiradas', async () => {
    const pg = postgrestFalso('k');
    const repo = new RepositorioSupabase('https://abc.supabase.co', 'k', pg.buscar);
    const s = new Servico(repo, () => new Date('2026-01-01T00:00:00Z'));
    const c = await s.criarSala({ apelido: 'Barela', avatar: 'mineradora' });
    await repo.limparExpiradas(new Date('2026-01-03T00:00:00Z'));
    expect(pg.tabela.has(c.codigo)).toBe(false);
  });

  it('chave errada ou banco fora do ar viram erro INDISPONIVEL', async () => {
    const pg = postgrestFalso('certa');
    const repo = new RepositorioSupabase('https://abc.supabase.co', 'errada', pg.buscar);
    for (const p of [repo.buscar('AAAAAA'), repo.salvar({ codigo: 'AAAAAA' } as Sala, 0)]) {
      const codigo = await p.then(() => 'ok', (e: { codigo: string }) => e.codigo);
      expect(codigo).toBe('INDISPONIVEL');
    }
  });
});

describe('Escolha do repositório', () => {
  it('sem Supabase em produção, recusa (memória não é compartilhada entre funções)', () => {
    const r = (() => {
      try {
        repositorioPadrao({ VERCEL_ENV: 'production' });
        return 'ok';
      } catch (e) {
        return (e as { codigo: string }).codigo;
      }
    })();
    expect(r).toBe('INDISPONIVEL');
  });

  it('em desenvolvimento usa memória', () => {
    expect(repositorioPadrao({})).toBeDefined();
  });

  it('memória: limpa expiradas e respeita versão', async () => {
    const repo = new RepositorioMemoria();
    const s = new Servico(repo, () => new Date('2026-01-01T00:00:00Z'));
    const c = await s.criarSala({ apelido: 'Barela', avatar: 'mineradora' });
    const sala = (await repo.buscar(c.codigo))!;
    expect(await repo.salvar(sala, 7)).toBe(false);
    await repo.limparExpiradas(new Date('2026-01-02T00:00:00Z'));
    expect(await repo.buscar(c.codigo)).toBeUndefined();
  });
});
