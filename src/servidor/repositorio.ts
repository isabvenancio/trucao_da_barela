import type { Sala } from './tipos.ts';
import { ErroServidor } from './tipos.ts';

/**
 * Onde as salas ficam guardadas. `salvar` é uma escrita condicional (compare-and-set):
 * só grava se a versão no banco ainda for `versaoAnterior` (RNF-001).
 */
export interface Repositorio {
  /** Retorna `false` se o código já existe. */
  criar(sala: Sala): Promise<boolean>;
  buscar(codigo: string): Promise<Sala | undefined>;
  salvar(sala: Sala, versaoAnterior: number): Promise<boolean>;
  /** RNF-007: apaga salas cuja expiração já passou. */
  limparExpiradas(agora: Date): Promise<void>;
}

/** Em memória: para `npm run dev`, testes e demonstração sem banco. */
export class RepositorioMemoria implements Repositorio {
  private salas = new Map<string, string>();

  async criar(sala: Sala) {
    if (this.salas.has(sala.codigo)) return false;
    this.salas.set(sala.codigo, JSON.stringify(sala));
    return true;
  }

  async buscar(codigo: string) {
    const bruto = this.salas.get(codigo);
    return bruto ? (JSON.parse(bruto) as Sala) : undefined;
  }

  async salvar(sala: Sala, versaoAnterior: number) {
    const atual = await this.buscar(sala.codigo);
    if (!atual || atual.versao !== versaoAnterior) return false;
    this.salas.set(sala.codigo, JSON.stringify(sala));
    return true;
  }

  async limparExpiradas(agora: Date) {
    for (const [codigo, bruto] of this.salas) {
      if (new Date((JSON.parse(bruto) as Sala).expiraEm) < agora) this.salas.delete(codigo);
    }
  }
}

/**
 * Supabase pela API REST (PostgREST), só com `fetch` — sem SDK.
 * Tabela `salas(codigo, versao, dados, atualizada_em, expira_em)`; ver supabase/migrations.
 * Usa a chave secreta (sb_secret_...) ou a antiga service_role, que fica só nas variáveis de ambiente da Vercel (RNF-002, RNF-009).
 */
export class RepositorioSupabase implements Repositorio {
  private url: string;
  private chave: string;
  private buscarHttp: typeof fetch;

  constructor(url: string, chave: string, buscarHttp: typeof fetch = fetch) {
    this.url = url;
    this.chave = chave;
    this.buscarHttp = buscarHttp;
  }

  private async req(caminho: string, init: RequestInit & { prefer?: string } = {}) {
    const resposta = await this.buscarHttp(`${this.url}/rest/v1/${caminho}`, {
      ...init,
      headers: {
        apikey: this.chave,
        // Chave antiga (service_role) é um JWT e vai também como Bearer; a nova (sb_secret_...) vai só em apikey.
        ...(this.chave.startsWith('eyJ') ? { Authorization: `Bearer ${this.chave}` } : {}),
        'Content-Type': 'application/json',
        ...(init.prefer ? { Prefer: init.prefer } : {}),
      },
    });
    return resposta;
  }

  private linha(sala: Sala) {
    return { codigo: sala.codigo, versao: sala.versao, dados: sala, atualizada_em: sala.atualizadaEm, expira_em: sala.expiraEm };
  }

  async criar(sala: Sala) {
    const r = await this.req('salas', { method: 'POST', body: JSON.stringify(this.linha(sala)), prefer: 'return=minimal' });
    if (r.status === 409) return false;
    if (!r.ok) throw new ErroServidor('INDISPONIVEL', `Banco respondeu ${r.status}.`, 503);
    return true;
  }

  async buscar(codigo: string) {
    const r = await this.req(`salas?codigo=eq.${encodeURIComponent(codigo)}&select=dados`);
    if (!r.ok) throw new ErroServidor('INDISPONIVEL', `Banco respondeu ${r.status}.`, 503);
    const linhas = (await r.json()) as { dados: Sala }[];
    return linhas[0]?.dados;
  }

  async salvar(sala: Sala, versaoAnterior: number) {
    const r = await this.req(`salas?codigo=eq.${encodeURIComponent(sala.codigo)}&versao=eq.${versaoAnterior}`, {
      method: 'PATCH',
      body: JSON.stringify(this.linha(sala)),
      prefer: 'return=representation',
    });
    if (!r.ok) throw new ErroServidor('INDISPONIVEL', `Banco respondeu ${r.status}.`, 503);
    const linhas = (await r.json()) as unknown[];
    return linhas.length === 1;
  }

  async limparExpiradas(agora: Date) {
    await this.req(`salas?expira_em=lt.${encodeURIComponent(agora.toISOString())}`, { method: 'DELETE', prefer: 'return=minimal' });
  }
}

let padrao: Repositorio | undefined;

/**
 * Supabase quando SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY existem; senão, memória —
 * exceto em produção, onde a memória não é compartilhada entre funções e o online seria inconsistente.
 */
type Ambiente = Record<string, string | undefined>;
const ambiente = (): Ambiente => (globalThis as { process?: { env: Ambiente } }).process?.env ?? {};

export function repositorioPadrao(env: Ambiente = ambiente()): Repositorio {
  if (padrao) return padrao;
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    padrao = new RepositorioSupabase(env.SUPABASE_URL.replace(/\/$/, ''), env.SUPABASE_SERVICE_ROLE_KEY);
  } else if (env.VERCEL_ENV === 'production' || env.VERCEL_ENV === 'preview') {
    throw new ErroServidor('INDISPONIVEL', 'O jogo online precisa do Supabase configurado (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY).', 503);
  } else {
    padrao = new RepositorioMemoria();
  }
  return padrao;
}
