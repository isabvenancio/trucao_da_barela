import { describe, expect, it } from 'vitest';
import { nomeCarta } from '../../engine/index.ts';
import type { Acao } from '../../engine/index.ts';
import { ALFABETO_CODIGO } from '../cripto.ts';
import { tratar } from '../http.ts';
import { RepositorioMemoria, RepositorioSupabase } from '../repositorio.ts';
import { Servico } from '../servico.ts';
import type { Credencial } from '../servico.ts';
import type { Sala } from '../tipos.ts';

const ANA = { apelido: 'Ana', avatar: 'pescadora' };
const BARELA = { apelido: 'Barela', avatar: 'mineradora' };
const CAROL = { apelido: 'Carol', avatar: 'ferreira' };

/** Serviço com relógio manual e sorteios fixos. */
function montar() {
  let agora = new Date('2026-10-22T20:00:00Z');
  const repo = new RepositorioMemoria();
  const s = new Servico(repo, () => agora, () => 4242, () => 0.3);
  return {
    s,
    repo,
    avancar: (ms: number) => (agora = new Date(agora.getTime() + ms)),
    sala: (codigo: string) => repo.buscar(codigo) as Promise<Sala>,
  };
}

async function erroDe(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return 'sem erro';
  } catch (e) {
    return (e as { codigo: string }).codigo;
  }
}

/** Sala com dois humanos (assentos 0 e 1) e dois bots, partida iniciada. */
async function partidaComDoisHumanos() {
  const m = montar();
  const barela = await m.s.criarSala(BARELA);
  const carol = await m.s.entrar(barela.codigo, CAROL);
  await m.s.operar(barela.codigo, barela.token, { tipo: 'adicionarBot', assento: 2, dificuldade: 'medio' });
  await m.s.operar(barela.codigo, barela.token, { tipo: 'adicionarBot', assento: 3, dificuldade: 'dificil' });
  await m.s.iniciar(barela.codigo, barela.token);
  return { ...m, barela, carol };
}

/** Joga até o fim: humanos fazem a primeira ação válida; o relógio anda para os bots. */
async function jogarAteOFim(m: Awaited<ReturnType<typeof partidaComDoisHumanos>>, humanos: Credencial[]) {
  for (let passo = 0; passo < 3000; passo++) {
    const sala = await m.sala(m.barela.codigo);
    if (sala.partida?.fase === 'encerrada' || sala.situacao === 'encerrada') return sala;
    let agiu = false;
    for (const h of humanos) {
      const r = await m.s.estado(h.codigo, h.token, -1);
      const acao = r.visao?.acoes.find((a) => a.tipo === 'JOGAR_CARTA' || a.tipo === 'RESPONDER_TRUCO' || a.tipo === 'DECIDIR_MAO_DE_ONZE');
      if (acao && !r.destaque) {
        await m.s.acao(h.codigo, h.token, acao);
        agiu = true;
      }
    }
    if (!agiu) m.avancar(1000);
  }
  throw new Error('partida não terminou');
}

describe('UC-005 - Criar sala (CT-005.1, CT-005.2)', () => {
  it('código de 6 caracteres sem ambíguos; criador no assento 0 como anfitrião', async () => {
    const m = montar();
    const c = await m.s.criarSala(BARELA);
    expect(c.codigo).toHaveLength(6);
    expect([...c.codigo].every((ch) => ALFABETO_CODIGO.includes(ch))).toBe(true);
    expect(/[O0I1L]/.test(c.codigo)).toBe(false);
    const sala = await m.sala(c.codigo);
    expect(sala.anfitriao).toBe(0);
    expect(sala.assentos[0]).toMatchObject({ tipo: 'humano', nome: 'Barela' });
    expect(sala.assentos[0]!.tokenHash).not.toBe(c.token); // só o hash é guardado (RNF-002)
  });

  it('apelido inválido não cria sala', async () => {
    expect(await erroDe(montar().s.criarSala({ apelido: 'B', avatar: 'x' }))).toBe('DADOS_INVALIDOS');
  });

  it('falha do banco não gera sala nem código', async () => {
    const quebrado = new RepositorioSupabase('https://exemplo.supabase.co', 'chave', async () => new Response('erro', { status: 500 }));
    const s = new Servico(quebrado);
    expect(await erroDe(s.criarSala(BARELA))).toBe('INDISPONIVEL');
  });
});

describe('UC-006 - Entrar em sala (CT-006.1 a CT-006.3)', () => {
  it('ocupa o primeiro assento livre', async () => {
    const m = montar();
    const c = await m.s.criarSala(BARELA);
    const e = await m.s.entrar(c.codigo.toLowerCase(), CAROL);
    expect(e.assento).toBe(1);
    const r = await m.s.estado(c.codigo, c.token, -1);
    expect(r.assentos[1]).toMatchObject({ ocupado: true, nome: 'Carol', souEu: false });
  });

  it('código inexistente, sala cheia, em jogo ou expirada são recusados', async () => {
    const m = montar();
    expect(await erroDe(m.s.entrar('ZZZZZZ', CAROL))).toBe('SALA_INEXISTENTE');
    const c = await m.s.criarSala(BARELA);
    for (const p of [CAROL, ANA, { apelido: 'Matheus', avatar: 'golem' }]) await m.s.entrar(c.codigo, p);
    expect(await erroDe(m.s.entrar(c.codigo, { apelido: 'Quinto', avatar: 'golem' }))).toBe('SALA_CHEIA');
    await m.s.iniciar(c.codigo, c.token);
    expect(await erroDe(m.s.entrar(c.codigo, { apelido: 'Atrasado', avatar: 'golem' }))).toBe('SALA_EM_JOGO');
    const outra = await m.s.criarSala(BARELA);
    m.avancar(31 * 60_000);
    expect(await erroDe(m.s.entrar(outra.codigo, CAROL))).toBe('SALA_EXPIRADA');
  });

  it('apelido repetido ganha sufixo', async () => {
    const m = montar();
    const c = await m.s.criarSala(ANA);
    await m.s.entrar(c.codigo, ANA);
    expect((await m.sala(c.codigo)).assentos[1]!.nome).toBe('Ana 2');
  });

  it('com assentos só ocupados por bots, o humano substitui um bot (A3)', async () => {
    const m = montar();
    const c = await m.s.criarSala(BARELA);
    for (const a of [1, 2, 3] as const) await m.s.operar(c.codigo, c.token, { tipo: 'adicionarBot', assento: a, dificuldade: 'facil' });
    const e = await m.s.entrar(c.codigo, CAROL);
    expect(e.assento).toBe(1);
    expect((await m.sala(c.codigo)).assentos[1]!.tipo).toBe('humano');
  });
});

describe('UC-007 - Organizar duplas (CT-007.1 a CT-007.3)', () => {
  it('anfitrião adiciona e remove bot; troca assentos; sorteia', async () => {
    const m = montar();
    const c = await m.s.criarSala(BARELA);
    const carol = await m.s.entrar(c.codigo, CAROL);
    await m.s.operar(c.codigo, c.token, { tipo: 'adicionarBot', assento: 3, dificuldade: 'dificil' });
    expect((await m.sala(c.codigo)).assentos[3]).toMatchObject({ tipo: 'bot', dificuldade: 'dificil' });
    await m.s.operar(c.codigo, c.token, { tipo: 'removerBot', assento: 3 });
    expect((await m.sala(c.codigo)).assentos[3]).toBe(null);
    await m.s.operar(c.codigo, c.token, { tipo: 'trocar', a: 0, b: 2 });
    const depois = await m.sala(c.codigo);
    expect(depois.assentos[2]!.nome).toBe('Barela');
    expect(depois.anfitriao).toBe(2);
    const r = await m.s.estado(carol.codigo, carol.token, -1);
    expect(r.assentos.find((a) => a.anfitriao)!.nome).toBe('Barela');
    await m.s.operar(c.codigo, c.token, { tipo: 'sortear' });
    const sorteada = await m.sala(c.codigo);
    expect(sorteada.assentos[sorteada.anfitriao]!.nome).toBe('Barela');
  });

  it('quem não é anfitrião só move o próprio assento', async () => {
    const m = montar();
    const c = await m.s.criarSala(BARELA);
    const carol = await m.s.entrar(c.codigo, CAROL);
    expect(await erroDe(m.s.operar(c.codigo, carol.token, { tipo: 'adicionarBot', assento: 2, dificuldade: 'medio' }))).toBe('SEM_PERMISSAO');
    expect(await erroDe(m.s.operar(c.codigo, carol.token, { tipo: 'trocar', a: 0, b: 1 }))).toBe('SEM_PERMISSAO');
    expect(await erroDe(m.s.operar(c.codigo, carol.token, { tipo: 'mover', para: 0 }))).toBe('ASSENTO_OCUPADO');
    await m.s.operar(c.codigo, carol.token, { tipo: 'mover', para: 2 });
    expect((await m.sala(c.codigo)).assentos[2]!.nome).toBe('Carol');
    expect(await erroDe(m.s.operar(c.codigo, 'x'.repeat(32), { tipo: 'mover', para: 3 }))).toBe('CREDENCIAL_INVALIDA');
  });
});

describe('UC-008 - Iniciar partida (CT-008.1, CT-008.2)', () => {
  it('com 3 assentos ocupados, recusa informando quantos faltam', async () => {
    const m = montar();
    const c = await m.s.criarSala(BARELA);
    await m.s.entrar(c.codigo, CAROL);
    await m.s.operar(c.codigo, c.token, { tipo: 'adicionarBot', assento: 2, dificuldade: 'medio' });
    expect(await erroDe(m.s.iniciar(c.codigo, c.token))).toBe('ASSENTOS_VAZIOS');
  });

  it('só o anfitrião inicia; cada humano recebe 3 cartas próprias e a vira', async () => {
    const m = await partidaComDoisHumanos();
    const r0 = await m.s.estado(m.barela.codigo, m.barela.token, -1);
    const r1 = await m.s.estado(m.carol.codigo, m.carol.token, -1);
    expect(r0.situacao).toBe('em_jogo');
    expect(r0.visao!.minhasCartas).toHaveLength(3);
    expect(r1.visao!.minhasCartas).toHaveLength(3);
    expect(r0.visao!.vira).toEqual(r1.visao!.vira);
    expect(r0.visao!.placar).toEqual([0, 0]);
  });

  it('participante que não é anfitrião não inicia', async () => {
    const m = montar();
    const c = await m.s.criarSala(BARELA);
    const carol = await m.s.entrar(c.codigo, CAROL);
    expect(await erroDe(m.s.iniciar(c.codigo, carol.token))).toBe('SEM_PERMISSAO');
  });
});

describe('RN-018 / RNF-002 - Sigilo no servidor', () => {
  it('a resposta de um assento não contém cartas de outros nem o estado completo', async () => {
    const m = await partidaComDoisHumanos();
    const sala = await m.sala(m.barela.codigo);
    const r = await m.s.estado(m.carol.codigo, m.carol.token, -1);
    const texto = JSON.stringify(r);
    for (const a of [0, 2, 3] as const) {
      for (const carta of sala.partida!.mao.cartas[a]) {
        const repetida = sala.partida!.mao.cartas[1].some((x) => nomeCarta(x) === nomeCarta(carta));
        if (!repetida) expect(texto.includes(JSON.stringify(carta))).toBe(false);
      }
    }
    expect('partida' in r).toBe(false);
    expect(texto.includes('tokenHash')).toBe(false);
    expect(texto.includes('"rng"')).toBe(false);
  });
});

describe('UC-010 a UC-012 - Ações no servidor (RNF-001)', () => {
  it('ação fora da vez é recusada pelo motor; ação válida é aplicada', async () => {
    const m = await partidaComDoisHumanos();
    const sala = await m.sala(m.barela.codigo);
    const vez = sala.partida!.mao.vez;
    const quemNaoE = vez === 0 ? m.carol : m.barela;
    expect(await erroDe(m.s.acao(m.barela.codigo, quemNaoE.token, { tipo: 'JOGAR_CARTA', assento: 0, indice: 0 }))).toBe('REGRA');
  });

  it('o assento da ação é sempre o da credencial (não dá para jogar pelos outros)', async () => {
    const m = await partidaComDoisHumanos();
    // Avança até ser a vez do assento 0 (Barela).
    for (let i = 0; i < 20; i++) {
      const r = await m.s.estado(m.barela.codigo, m.barela.token, -1);
      if (r.visao!.aguardando === 0) break;
      const rc = await m.s.estado(m.carol.codigo, m.carol.token, -1);
      const a = rc.visao!.acoes.find((x) => x.tipo === 'JOGAR_CARTA');
      if (a) await m.s.acao(m.carol.codigo, m.carol.token, a);
      m.avancar(3000);
    }
    const falsa: Acao = { tipo: 'JOGAR_CARTA', assento: 0, indice: 0 };
    // Carol tenta jogar como assento 0: o servidor usa o assento dela (1), que não está na vez.
    expect(await erroDe(m.s.acao(m.carol.codigo, m.carol.token, falsa))).toBe('REGRA');
  });

  it('partida com 2 humanos e 2 bots vai até o fim, com placar ≥ 12', async () => {
    const m = await partidaComDoisHumanos();
    const fim = await jogarAteOFim(m, [m.barela, m.carol]);
    expect(Math.max(...fim.partida!.placar)).toBeGreaterThanOrEqual(12);
    expect(fim.lotes.length).toBeGreaterThan(0);
  });
});

describe('RN-021 - Prazo de decisão (CT-021.3)', () => {
  it('humano que não joga no prazo tem a jogada feita pelo bot médio e continua no controle', async () => {
    const m = await partidaComDoisHumanos();
    let sala = await m.sala(m.barela.codigo);
    // Deixa os bots jogarem até ser a vez de um humano presente.
    for (let i = 0; i < 30 && ![0, 1].includes(sala.partida!.mao.vez); i++) {
      m.avancar(1000);
      await m.s.estado(m.barela.codigo, m.barela.token, -1);
      await m.s.estado(m.carol.codigo, m.carol.token, -1);
      sala = await m.sala(m.barela.codigo);
    }
    const vez = sala.partida!.mao.vez;
    const humano = vez === 0 ? m.barela : m.carol;
    const r = await m.s.estado(humano.codigo, humano.token, -1);
    expect(r.prazo).toBeDefined();
    const versao = sala.versao;
    // Mantém os dois presentes, mas o da vez não age até o prazo vencer.
    for (let t = 0; t < 36; t++) {
      m.avancar(1000);
      await m.s.estado(m.barela.codigo, m.barela.token, -1);
      await m.s.estado(m.carol.codigo, m.carol.token, -1);
      const atual = await m.sala(m.barela.codigo);
      if (atual.partida!.mao.cartas[vez].length < sala.partida!.mao.cartas[vez].length || atual.partida!.mao.numero !== sala.partida!.mao.numero) break;
    }
    const depois = await m.sala(m.barela.codigo);
    expect(depois.versao).toBeGreaterThan(versao);
    expect(depois.assentos[vez]!.tipo).toBe('humano');
    expect(depois.assentos[vez]!.saiu).toBeUndefined();
  });
});

describe('UC-014 e UC-015 - Sair e reconectar', () => {
  it('quem sai tem o assento jogado por bot; a partida continua; a credencial devolve o assento', async () => {
    const m = await partidaComDoisHumanos();
    await m.s.sair(m.carol.codigo, m.carol.token);
    let r = await m.s.estado(m.barela.codigo, m.barela.token, -1);
    expect(r.assentos[1]!.botNoLugar).toBe(true);
    expect(r.situacao).toBe('em_jogo');
    const volta = await m.s.entrar(m.carol.codigo, CAROL, m.carol.token);
    expect(volta).toMatchObject({ assento: 1, reconectou: true });
    r = await m.s.estado(m.barela.codigo, m.barela.token, -1);
    expect(r.assentos[1]!.botNoLugar).toBe(false);
  });

  it('sem sinal por mais de 60 s, o bot assume (RN-022)', async () => {
    const m = await partidaComDoisHumanos();
    m.avancar(61_000);
    const r = await m.s.estado(m.barela.codigo, m.barela.token, -1);
    expect(r.assentos[1]!.botNoLugar).toBe(true);
    expect(r.assentos[0]!.botNoLugar).toBe(false);
  });

  it('credencial inválida não recupera assento em partida em andamento', async () => {
    const m = await partidaComDoisHumanos();
    expect(await erroDe(m.s.entrar(m.barela.codigo, CAROL, 'f'.repeat(32)))).toBe('CREDENCIAL_INVALIDA');
  });

  it('anfitrião sai da sala em espera: a função passa ao próximo humano; sem humanos, a sala encerra', async () => {
    const m = montar();
    const c = await m.s.criarSala(BARELA);
    const carol = await m.s.entrar(c.codigo, CAROL);
    await m.s.sair(c.codigo, c.token);
    let sala = await m.sala(c.codigo);
    expect(sala.anfitriao).toBe(1);
    expect(sala.assentos[0]).toBe(null);
    await m.s.sair(c.codigo, carol.token);
    sala = await m.sala(c.codigo);
    expect(sala.situacao).toBe('encerrada');
  });

  it('todos os humanos saem da partida: ela é encerrada', async () => {
    const m = await partidaComDoisHumanos();
    await m.s.sair(m.barela.codigo, m.barela.token);
    await m.s.sair(m.carol.codigo, m.carol.token);
    expect((await m.sala(m.barela.codigo)).situacao).toBe('encerrada');
  });
});

describe('UC-016 - Revanche', () => {
  it('só o anfitrião inicia; mesmas duplas, placar zerado; quem saiu vira bot', async () => {
    const m = await partidaComDoisHumanos();
    await jogarAteOFim(m, [m.barela, m.carol]);
    await m.s.sair(m.carol.codigo, m.carol.token);
    expect(await erroDe(m.s.iniciar(m.carol.codigo, m.carol.token))).toBe('SEM_PERMISSAO');
    await m.s.iniciar(m.barela.codigo, m.barela.token);
    const sala = await m.sala(m.barela.codigo);
    expect(sala.partida!.placar).toEqual([0, 0]);
    expect(sala.assentos[0]!.nome).toBe('Barela');
    expect(sala.assentos[1]!.tipo).toBe('bot');
  });
});

describe('RN-027 - Sinais no online (CT-024.1)', () => {
  it('o parceiro recebe o sinal; os adversários não recebem sinal nem evento; o prazo não muda', async () => {
    const m = montar();
    const barela = await m.s.criarSala(BARELA);
    const carol = await m.s.entrar(barela.codigo, CAROL);
    // Carol vira parceira (assento 2); bots nos assentos 1 e 3.
    await m.s.operar(barela.codigo, carol.token, { tipo: 'mover', para: 2 });
    await m.s.operar(barela.codigo, barela.token, { tipo: 'adicionarBot', assento: 1, dificuldade: 'medio' });
    await m.s.operar(barela.codigo, barela.token, { tipo: 'adicionarBot', assento: 3, dificuldade: 'medio' });
    await m.s.iniciar(barela.codigo, barela.token);
    const antes = await m.sala(barela.codigo);
    // Os bots (1 e 3) já sinalizaram um para o outro no início da mão.
    expect(antes.partida!.mao.sinais!.some((x) => x.assento === 1)).toBe(true);
    const desde = antes.versao;
    await m.s.acao(barela.codigo, barela.token, { tipo: 'SINALIZAR', assento: 0, sinal: 'nada' });
    const depois = await m.sala(barela.codigo);
    expect(depois.prazo).toBe(antes.prazo);
    expect(depois.proximoBotEm).toBe(antes.proximoBotEm);
    const rCarol = await m.s.estado(carol.codigo, carol.token, desde);
    expect(rCarol.visao!.sinaisDoParceiro.map((x) => x.sinal)).toEqual(['nada']);
    expect(rCarol.lotes.flatMap((l) => l.eventos).some((e) => e.tipo === 'SINAL_ENVIADO' && e.assento === 0)).toBe(true);
    // Carol (dupla 0) não vê os sinais dos bots da dupla 1.
    const rInicio = await m.s.estado(carol.codigo, carol.token, -1);
    expect(rInicio.lotes.flatMap((l) => l.eventos).some((e) => e.tipo === 'SINAL_ENVIADO' && e.assento % 2 === 1)).toBe(false);
    expect(JSON.stringify(rInicio.visao!.sinaisDoParceiro).includes('"assento":1')).toBe(false);
  });

  it('sinal inválido é recusado pelo servidor', async () => {
    const m = await partidaComDoisHumanos();
    await m.s.acao(m.barela.codigo, m.barela.token, { tipo: 'SINALIZAR', assento: 0, sinal: 'zap' });
    expect(await erroDe(m.s.acao(m.barela.codigo, m.barela.token, { tipo: 'SINALIZAR', assento: 0, sinal: 'zap' }))).toBe('REGRA');
  });
});

describe('Concorrência (RNF-001)', () => {
  it('consultas e ações simultâneas não perdem gravações', async () => {
    const m = await partidaComDoisHumanos();
    m.avancar(5000);
    await Promise.all([
      m.s.estado(m.barela.codigo, m.barela.token, -1),
      m.s.estado(m.carol.codigo, m.carol.token, -1),
      m.s.estado(m.barela.codigo, m.barela.token, -1),
    ]);
    const sala = await m.sala(m.barela.codigo);
    const jogadas = sala.partida!.mao.rodadas.flatMap((r) => r.jogadas).length;
    const cartas = sala.partida!.mao.cartas.reduce((s, c) => s + c.length, 0);
    expect(jogadas + cartas).toBe(12);
  });
});

describe('HTTP', () => {
  it('rotas respondem JSON com status adequados', async () => {
    const m = montar();
    const criar = await tratar('criar', new Request('http://x/api/salas/criar', { method: 'POST', body: JSON.stringify({ perfil: BARELA }) }), m.s);
    expect(criar.status).toBe(201);
    const { codigo, token } = (await criar.json()) as Credencial;
    const estado = await tratar('estado', new Request(`http://x/api/salas/estado?codigo=${codigo}&desde=-1`, { headers: { 'x-credencial': token } }), m.s);
    expect(estado.status).toBe(200);
    const semCredencial = await tratar('estado', new Request(`http://x/api/salas/estado?codigo=${codigo}`), m.s);
    expect(semCredencial.status).toBe(401);
    const inexistente = await tratar('entrar', new Request('http://x', { method: 'POST', body: JSON.stringify({ codigo: 'AAAAAA', perfil: CAROL }) }), m.s);
    expect(inexistente.status).toBe(404);
    const corpoRuim = await tratar('entrar', new Request('http://x', { method: 'POST', body: '{' }), m.s);
    expect(corpoRuim.status).toBe(400);
    expect((await tratar('estado', new Request('http://x', { method: 'POST' }), m.s)).status).toBe(405);
  });
});
