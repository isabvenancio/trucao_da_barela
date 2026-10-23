import type { Acao } from '../engine/index.ts';
import type { Credencial } from '../servidor/servico.ts';
import type { OperacaoAssento, Perfil, RespostaEstado } from '../servidor/tipos.ts';
import { apagar, gravar, lerBruto } from '../ui/armazenamento.ts';

/** Erro vindo da API, com o código do servidor (ex.: SALA_CHEIA). */
export class ErroApi extends Error {
  codigo: string;
  status: number;

  constructor(codigo: string, mensagem: string, status: number) {
    super(mensagem);
    this.codigo = codigo;
    this.status = status;
  }
}

async function chamar<T>(caminho: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(caminho, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.token ? { 'x-credencial': init.token } : {}),
      },
    });
  } catch {
    throw new ErroApi('SEM_CONEXAO', 'Sem conexão com o servidor.', 0);
  }
  const dados = (await resposta.json().catch(() => ({}))) as { erro?: string; codigo?: string };
  if (!resposta.ok) throw new ErroApi(dados.codigo ?? 'ERRO', dados.erro ?? 'Algo deu errado.', resposta.status);
  return dados as T;
}

const post = <T>(caminho: string, corpo: unknown, token?: string) =>
  chamar<T>(caminho, { method: 'POST', body: JSON.stringify(corpo), token });

export const api = {
  criar: (perfil: Perfil) => post<Credencial>('/api/salas/criar', { perfil }),
  entrar: (codigo: string, perfil: Perfil, token?: string) =>
    post<Credencial & { reconectou: boolean }>('/api/salas/entrar', { codigo, perfil }, token),
  estado: (codigo: string, token: string, desde: number) =>
    chamar<RespostaEstado>(`/api/salas/estado?codigo=${encodeURIComponent(codigo)}&desde=${desde}`, { token }),
  operar: (codigo: string, token: string, operacao: OperacaoAssento) => post('/api/salas/assentos', { codigo, operacao }, token),
  iniciar: (codigo: string, token: string) => post('/api/partidas/iniciar', { codigo }, token),
  acao: (codigo: string, token: string, acao: Acao) => post('/api/partidas/acao', { codigo, acao }, token),
  sair: (codigo: string, token: string) => post('/api/salas/sair', { codigo }, token),
};

/* -------- Credenciais de assento guardadas no dispositivo (UC-015) -------- */

const CHAVE = 'trucao.salas.v1';
type Mapa = Record<string, { token: string; assento: number; em: string }>;

export const credenciais = {
  ler(codigo: string): string | undefined {
    return lerBruto<Mapa>(CHAVE)?.[codigo]?.token;
  },
  gravar(c: Credencial) {
    const mapa = lerBruto<Mapa>(CHAVE) ?? {};
    mapa[c.codigo] = { token: c.token, assento: c.assento, em: new Date().toISOString() };
    // Guarda só as 10 salas mais recentes.
    const recentes = Object.entries(mapa).sort((a, b) => b[1].em.localeCompare(a[1].em)).slice(0, 10);
    gravar(CHAVE, Object.fromEntries(recentes));
  },
  apagar(codigo: string) {
    const mapa = lerBruto<Mapa>(CHAVE) ?? {};
    delete mapa[codigo];
    if (Object.keys(mapa).length) gravar(CHAVE, mapa);
    else apagar(CHAVE);
  },
};
