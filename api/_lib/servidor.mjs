// Gerado por npm run build:api a partir de src/servidor. Não edite.

// src/servidor/tipos.ts
var ErroServidor = class extends Error {
  codigo;
  status;
  constructor(codigo, mensagem, status = 400) {
    super(mensagem);
    this.codigo = codigo;
    this.status = status;
  }
};

// src/servidor/repositorio.ts
var RepositorioMemoria = class {
  salas = /* @__PURE__ */ new Map();
  async criar(sala) {
    if (this.salas.has(sala.codigo)) return false;
    this.salas.set(sala.codigo, JSON.stringify(sala));
    return true;
  }
  async buscar(codigo) {
    const bruto = this.salas.get(codigo);
    return bruto ? JSON.parse(bruto) : void 0;
  }
  async salvar(sala, versaoAnterior) {
    const atual = await this.buscar(sala.codigo);
    if (!atual || atual.versao !== versaoAnterior) return false;
    this.salas.set(sala.codigo, JSON.stringify(sala));
    return true;
  }
  async limparExpiradas(agora) {
    for (const [codigo, bruto] of this.salas) {
      if (new Date(JSON.parse(bruto).expiraEm) < agora) this.salas.delete(codigo);
    }
  }
};
var RepositorioSupabase = class {
  url;
  chave;
  buscarHttp;
  constructor(url, chave, buscarHttp = fetch) {
    this.url = url;
    this.chave = chave;
    this.buscarHttp = buscarHttp;
  }
  async req(caminho, init = {}) {
    const resposta = await this.buscarHttp(`${this.url}/rest/v1/${caminho}`, {
      ...init,
      headers: {
        apikey: this.chave,
        // Chave antiga (service_role) é um JWT e vai também como Bearer; a nova (sb_secret_...) vai só em apikey.
        ...this.chave.startsWith("eyJ") ? { Authorization: `Bearer ${this.chave}` } : {},
        "Content-Type": "application/json",
        ...init.prefer ? { Prefer: init.prefer } : {}
      }
    });
    return resposta;
  }
  linha(sala) {
    return { codigo: sala.codigo, versao: sala.versao, dados: sala, atualizada_em: sala.atualizadaEm, expira_em: sala.expiraEm };
  }
  async criar(sala) {
    const r = await this.req("salas", { method: "POST", body: JSON.stringify(this.linha(sala)), prefer: "return=minimal" });
    if (r.status === 409) return false;
    if (!r.ok) throw new ErroServidor("INDISPONIVEL", `Banco respondeu ${r.status}.`, 503);
    return true;
  }
  async buscar(codigo) {
    const r = await this.req(`salas?codigo=eq.${encodeURIComponent(codigo)}&select=dados`);
    if (!r.ok) throw new ErroServidor("INDISPONIVEL", `Banco respondeu ${r.status}.`, 503);
    const linhas = await r.json();
    return linhas[0]?.dados;
  }
  async salvar(sala, versaoAnterior) {
    const r = await this.req(`salas?codigo=eq.${encodeURIComponent(sala.codigo)}&versao=eq.${versaoAnterior}`, {
      method: "PATCH",
      body: JSON.stringify(this.linha(sala)),
      prefer: "return=representation"
    });
    if (!r.ok) throw new ErroServidor("INDISPONIVEL", `Banco respondeu ${r.status}.`, 503);
    const linhas = await r.json();
    return linhas.length === 1;
  }
  async limparExpiradas(agora) {
    await this.req(`salas?expira_em=lt.${encodeURIComponent(agora.toISOString())}`, { method: "DELETE", prefer: "return=minimal" });
  }
};
var padrao;
var ambiente = () => globalThis.process?.env ?? {};
function repositorioPadrao(env = ambiente()) {
  if (padrao) return padrao;
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    padrao = new RepositorioSupabase(env.SUPABASE_URL.replace(/\/$/, ""), env.SUPABASE_SERVICE_ROLE_KEY);
  } else if (env.VERCEL_ENV === "production" || env.VERCEL_ENV === "preview") {
    throw new ErroServidor("INDISPONIVEL", "O jogo online precisa do Supabase configurado (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY).", 503);
  } else {
    padrao = new RepositorioMemoria();
  }
  return padrao;
}

// src/servidor/cripto.ts
var ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function bytesAleatorios(n) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}
function gerarCodigo() {
  return Array.from(bytesAleatorios(6), (b) => ALFABETO_CODIGO[b % ALFABETO_CODIGO.length]).join("");
}
function normalizarCodigo(codigo) {
  return codigo.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function gerarToken() {
  return Array.from(bytesAleatorios(16), (b) => b.toString(16).padStart(2, "0")).join("");
}
async function hashToken(token) {
  const dados = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", dados);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// src/engine/baralho.ts
var ORDEM_VALORES = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
var ORDEM_NAIPES = ["ouros", "espadas", "copas", "paus"];
function criarBaralho() {
  const cartas = [];
  for (const naipe of ORDEM_NAIPES) {
    for (const valor of ORDEM_VALORES) cartas.push({ valor, naipe });
  }
  return cartas;
}
function manilhaDaVira(vira) {
  const i = ORDEM_VALORES.indexOf(vira.valor);
  return ORDEM_VALORES[(i + 1) % ORDEM_VALORES.length];
}
function ehManilha(carta, manilha) {
  return carta.valor === manilha;
}
function ehZap(carta, manilha) {
  return carta.valor === manilha && carta.naipe === "paus";
}
function forca(carta, manilha, encoberta = false) {
  if (encoberta) return -1;
  if (ehManilha(carta, manilha)) return 100 + ORDEM_NAIPES.indexOf(carta.naipe);
  return ORDEM_VALORES.indexOf(carta.valor);
}
function mesmaCarta(a, b) {
  return a.valor === b.valor && a.naipe === b.naipe;
}
var NOMES_NAIPES = { ouros: "ouros", espadas: "espadas", copas: "copas", paus: "paus" };
function nomeCarta(carta) {
  return `${carta.valor} de ${NOMES_NAIPES[carta.naipe]}`;
}

// src/engine/mesa.ts
var ASSENTOS = [0, 1, 2, 3];
function duplaDe(assento) {
  return assento % 2;
}
function parceiroDe(assento) {
  return (assento + 2) % 4;
}
function proximoAssento(assento) {
  return (assento + 1) % 4;
}
function outraDupla(dupla) {
  return 1 - dupla;
}
function ordemAPartirDe(inicio) {
  return [0, 1, 2, 3].map((i) => (inicio + i) % 4);
}

// src/engine/rodada.ts
function resultadoDaRodada(rodada, manilha) {
  const abertas = rodada.jogadas.filter((j) => !j.encoberta);
  if (abertas.length === 0) return { resultado: "empate" };
  const maior = Math.max(...abertas.map((j) => forca(j.carta, manilha)));
  const empatadas = abertas.filter((j) => forca(j.carta, manilha) === maior);
  const duplas = new Set(empatadas.map((j) => duplaDe(j.assento)));
  if (duplas.size > 1) return { resultado: "empate" };
  const primeira = empatadas[0];
  return { resultado: duplaDe(primeira.assento), vencedor: primeira.assento };
}
function inicianteDaProxima(rodada) {
  return rodada.vencedor ?? rodada.iniciante;
}
function vencedorDaMao(resultados) {
  const vitorias = (d) => resultados.filter((r) => r === d).length;
  if (vitorias(0) >= 2) return 0;
  if (vitorias(1) >= 2) return 1;
  const [r1, r2, r3] = resultados;
  if (r1 === void 0 || r2 === void 0) return void 0;
  if (r1 === "empate" && r2 !== "empate") return r2;
  if (r1 !== "empate" && r2 === "empate") return r1;
  if (r3 === void 0) return void 0;
  if (r1 === "empate" && r2 === "empate") return r3;
  return r1;
}

// src/engine/truco.ts
function proximoValorPedido(valorAtual) {
  if (valorAtual < 3) return 3;
  if (valorAtual < 6) return 6;
  if (valorAtual < 9) return 9;
  if (valorAtual < 12) return 12;
  return void 0;
}
function motivoTrucoProibido(mao, assento) {
  if (mao.resultado) return "A m\xE3o j\xE1 terminou.";
  if (mao.decisaoOnze) return "Aguardando a decis\xE3o da m\xE3o de onze.";
  if (mao.pedido) return "J\xE1 existe um pedido de truco pendente.";
  if (mao.vez !== assento) return "S\xF3 quem est\xE1 na vez pode pedir truco.";
  if (mao.tipo === "onze") return "N\xE3o h\xE1 truco na m\xE3o de onze.";
  if (mao.tipo === "ferro") return "N\xE3o h\xE1 truco na m\xE3o de ferro.";
  if (proximoValorPedido(mao.valor) === void 0) return "A m\xE3o j\xE1 vale 12.";
  if (mao.ultimaDuplaQuePediu === duplaDe(assento)) return "Sua dupla n\xE3o pode aumentar o pr\xF3prio pedido.";
  return void 0;
}
function respondenteDe(solicitante) {
  return proximoAssento(solicitante);
}

// src/engine/rng.ts
function proximo(estado) {
  const novo = estado + 1831565813 | 0;
  let t = novo;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  const valor = ((t ^ t >>> 14) >>> 0) / 4294967296;
  return { valor, estado: novo };
}
function inteiro(estado, max) {
  const r = proximo(estado);
  return { valor: Math.floor(r.valor * max), estado: r.estado };
}
function embaralhar(itens, estado) {
  const copia = [...itens];
  let s = estado;
  for (let i = copia.length - 1; i > 0; i--) {
    const r = inteiro(s, i + 1);
    s = r.estado;
    const j = r.valor;
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return { itens: copia, estado: s };
}

// src/engine/partida.ts
var PONTOS_PARA_VENCER = 12;
function criarPartida(opcoes) {
  let rng = opcoes.semente | 0;
  let carteador = opcoes.carteadorInicial;
  if (carteador === void 0) {
    const sorteio = inteiro(rng, 4);
    rng = sorteio.estado;
    carteador = sorteio.valor;
  }
  const estado = {
    participantes: opcoes.participantes,
    placar: opcoes.placarInicial ? [...opcoes.placarInicial] : [0, 0],
    fase: "jogando",
    rng,
    versao: 0
  };
  const eventos = [];
  distribuir(estado, carteador, 1, eventos);
  return { estado, eventos };
}
function decisorDaMaoDeOnze(participantes, dupla, primeiroAJogar) {
  const daDupla = ordemAPartirDe(primeiroAJogar).filter((a) => duplaDe(a) === dupla);
  return daDupla.find((a) => participantes[a]?.tipo === "humano") ?? daDupla[0];
}
function distribuir(estado, carteador, numero, eventos) {
  const embaralhado = embaralhar(criarBaralho(), estado.rng);
  estado.rng = embaralhado.estado;
  const monte = embaralhado.itens;
  const primeiro = proximoAssento(carteador);
  const cartas = [[], [], [], []];
  for (let volta = 0; volta < 3; volta++) {
    for (const assento of ordemAPartirDe(primeiro)) cartas[assento].push(monte.pop());
  }
  const vira = monte.pop();
  const manilha = manilhaDaVira(vira);
  const comOnze = [0, 1].filter((d) => estado.placar[d] === PONTOS_PARA_VENCER - 1);
  let tipo = "normal";
  if (comOnze.length === 2) tipo = "ferro";
  else if (comOnze.length === 1) tipo = "onze";
  const mao = {
    numero,
    carteador,
    tipo,
    cartas,
    vira,
    manilha,
    valor: tipo === "onze" ? 3 : 1,
    rodadas: [{ iniciante: primeiro, jogadas: [] }],
    vez: primeiro
  };
  estado.mao = mao;
  eventos.push({ tipo: "MAO_DISTRIBUIDA", numero, carteador, vira, manilha, tipoMao: tipo });
  if (tipo === "onze") {
    const dupla = comOnze[0];
    const decisor = decisorDaMaoDeOnze(estado.participantes, dupla, primeiro);
    mao.decisaoOnze = { dupla, decisor };
    eventos.push({ tipo: "DECISAO_ONZE_PENDENTE", dupla, decisor });
  }
}
function encerrarMao(estado, vencedora, pontos, motivo, eventos) {
  const mao = estado.mao;
  mao.resultado = { vencedora, pontos: vencedora === null ? 0 : pontos, motivo };
  mao.pedido = void 0;
  if (vencedora !== null) estado.placar[vencedora] += pontos;
  const placar = [estado.placar[0], estado.placar[1]];
  eventos.push({ tipo: "MAO_ENCERRADA", vencedora, pontos: mao.resultado.pontos, motivo, placar });
  if (vencedora !== null && estado.placar[vencedora] >= PONTOS_PARA_VENCER) {
    estado.fase = "encerrada";
    estado.vencedora = vencedora;
    eventos.push({ tipo: "PARTIDA_ENCERRADA", vencedora, placar });
    return;
  }
  distribuir(estado, proximoAssento(mao.carteador), mao.numero + 1, eventos);
}
function erro(codigo, mensagem) {
  return { ok: false, erro: { codigo, mensagem } };
}
function aplicarAcao(anterior, acao) {
  if (anterior.fase === "encerrada") return erro("PARTIDA_ENCERRADA", "A partida j\xE1 terminou.");
  const estado = structuredClone(anterior);
  const eventos = [];
  let falha;
  switch (acao.tipo) {
    case "JOGAR_CARTA":
      falha = jogarCarta(estado, acao.assento, acao.indice, acao.encoberta ?? false, eventos);
      break;
    case "PEDIR_TRUCO":
      falha = pedirTruco(estado, acao.assento, eventos);
      break;
    case "RESPONDER_TRUCO":
      falha = responderTruco(estado, acao.assento, acao.resposta, eventos);
      break;
    case "DECIDIR_MAO_DE_ONZE":
      falha = decidirOnze(estado, acao.assento, acao.decisao, eventos);
      break;
  }
  if (falha) return falha;
  estado.versao += 1;
  return { ok: true, estado, eventos };
}
function jogarCarta(estado, assento, indice, encoberta, eventos) {
  const mao = estado.mao;
  if (mao.pedido) return erro("DECISAO_PENDENTE", "Responda o pedido de truco antes de jogar.");
  if (mao.decisaoOnze) return erro("DECISAO_PENDENTE", "Aguardando a decis\xE3o da m\xE3o de onze.");
  if (mao.vez !== assento) return erro("FORA_DA_VEZ", "N\xE3o \xE9 a sua vez.");
  const naMao = mao.cartas[assento];
  if (!Number.isInteger(indice) || indice < 0 || indice >= naMao.length) {
    return erro("CARTA_INVALIDA", "Essa carta n\xE3o est\xE1 na sua m\xE3o.");
  }
  const numeroRodada = mao.rodadas.length;
  if (encoberta && numeroRodada === 1) return erro("ENCOBERTA_PROIBIDA", "N\xE3o pode encobrir na primeira rodada.");
  if (encoberta && mao.tipo === "ferro") return erro("ENCOBERTA_PROIBIDA", "N\xE3o pode encobrir na m\xE3o de ferro.");
  const [carta] = naMao.splice(indice, 1);
  const rodada = mao.rodadas[numeroRodada - 1];
  rodada.jogadas.push({ assento, carta, encoberta });
  eventos.push({
    tipo: "CARTA_JOGADA",
    assento,
    carta,
    encoberta,
    manilha: !encoberta && ehManilha(carta, mao.manilha),
    zap: !encoberta && ehZap(carta, mao.manilha)
  });
  if (rodada.jogadas.length < 4) {
    mao.vez = proximoAssento(assento);
    return void 0;
  }
  const { resultado, vencedor } = resultadoDaRodada(rodada, mao.manilha);
  rodada.resultado = resultado;
  if (vencedor !== void 0) rodada.vencedor = vencedor;
  eventos.push({ tipo: "RODADA_ENCERRADA", numero: numeroRodada, resultado, vencedor });
  const decisao = vencedorDaMao(mao.rodadas.map((r) => r.resultado));
  if (decisao === void 0) {
    const iniciante = inicianteDaProxima(rodada);
    mao.rodadas.push({ iniciante, jogadas: [] });
    mao.vez = iniciante;
  } else if (decisao === "empate") {
    encerrarMao(estado, null, 0, "empate-total", eventos);
  } else {
    encerrarMao(estado, decisao, mao.valor, "rodadas", eventos);
  }
  return void 0;
}
function pedirTruco(estado, assento, eventos) {
  const mao = estado.mao;
  const motivo = motivoTrucoProibido(mao, assento);
  if (motivo) return erro("TRUCO_PROIBIDO", motivo);
  const valor = proximoValorPedido(mao.valor);
  const dupla = duplaDe(assento);
  const respondente = respondenteDe(assento);
  mao.pedido = { solicitante: assento, dupla, valor, respondente };
  eventos.push({ tipo: "TRUCO_PEDIDO", assento, dupla, valor, respondente });
  return void 0;
}
function responderTruco(estado, assento, resposta, eventos) {
  const mao = estado.mao;
  const pedido = mao.pedido;
  if (!pedido) return erro("SEM_PEDIDO", "N\xE3o h\xE1 pedido de truco para responder.");
  if (pedido.respondente !== assento) return erro("NAO_E_RESPONDENTE", "Este pedido \xE9 para outro jogador responder.");
  if (resposta === "correr") {
    eventos.push({ tipo: "TRUCO_RESPONDIDO", assento, resposta, valor: mao.valor });
    encerrarMao(estado, pedido.dupla, mao.valor, "correu-truco", eventos);
    return void 0;
  }
  if (resposta === "aumentar") {
    const proximo2 = proximoValorPedido(pedido.valor);
    if (proximo2 === void 0) return erro("AUMENTO_PROIBIDO", "A m\xE3o j\xE1 vale 12.");
    mao.valor = pedido.valor;
    mao.ultimaDuplaQuePediu = pedido.dupla;
    const dupla = duplaDe(assento);
    const respondente = respondenteDe(assento);
    mao.pedido = { solicitante: assento, dupla, valor: proximo2, respondente };
    eventos.push({ tipo: "TRUCO_RESPONDIDO", assento, resposta, valor: mao.valor });
    eventos.push({ tipo: "TRUCO_PEDIDO", assento, dupla, valor: proximo2, respondente });
    return void 0;
  }
  mao.valor = pedido.valor;
  mao.ultimaDuplaQuePediu = pedido.dupla;
  mao.pedido = void 0;
  eventos.push({ tipo: "TRUCO_RESPONDIDO", assento, resposta, valor: mao.valor });
  return void 0;
}
function decidirOnze(estado, assento, decisao, eventos) {
  const mao = estado.mao;
  const pendente = mao.decisaoOnze;
  if (!pendente) return erro("SEM_DECISAO_ONZE", "N\xE3o h\xE1 decis\xE3o de m\xE3o de onze pendente.");
  if (pendente.decisor !== assento) return erro("NAO_E_DECISOR", "Quem decide a m\xE3o de onze \xE9 outro jogador.");
  mao.decisaoOnze = void 0;
  eventos.push({ tipo: "ONZE_DECIDIDA", dupla: pendente.dupla, decisao });
  if (decisao === "correr") encerrarMao(estado, outraDupla(pendente.dupla), 1, "correu-onze", eventos);
  return void 0;
}
function acoesValidas(estado, assento) {
  if (estado.fase === "encerrada") return [];
  const mao = estado.mao;
  if (mao.decisaoOnze) {
    if (mao.decisaoOnze.decisor !== assento) return [];
    return [
      { tipo: "DECIDIR_MAO_DE_ONZE", assento, decisao: "jogar" },
      { tipo: "DECIDIR_MAO_DE_ONZE", assento, decisao: "correr" }
    ];
  }
  if (mao.pedido) {
    if (mao.pedido.respondente !== assento) return [];
    const acoes2 = [
      { tipo: "RESPONDER_TRUCO", assento, resposta: "aceitar" },
      { tipo: "RESPONDER_TRUCO", assento, resposta: "correr" }
    ];
    if (proximoValorPedido(mao.pedido.valor) !== void 0) {
      acoes2.push({ tipo: "RESPONDER_TRUCO", assento, resposta: "aumentar" });
    }
    return acoes2;
  }
  if (mao.vez !== assento) return [];
  const acoes = [];
  const podeEncobrir = mao.rodadas.length > 1 && mao.tipo !== "ferro";
  mao.cartas[assento].forEach((_, indice) => {
    acoes.push({ tipo: "JOGAR_CARTA", assento, indice });
    if (podeEncobrir) acoes.push({ tipo: "JOGAR_CARTA", assento, indice, encoberta: true });
  });
  if (!motivoTrucoProibido(mao, assento)) acoes.push({ tipo: "PEDIR_TRUCO", assento });
  return acoes;
}
function assentoDaVez(estado) {
  if (estado.fase === "encerrada") return void 0;
  const mao = estado.mao;
  if (mao.decisaoOnze) return mao.decisaoOnze.decisor;
  if (mao.pedido) return mao.pedido.respondente;
  return mao.vez;
}

// src/engine/visao.ts
function visaoDoAssento(estado, assento) {
  const mao = estado.mao;
  const ferro = mao.tipo === "ferro";
  const onzePendenteMinhaDupla = mao.decisaoOnze !== void 0 && mao.decisaoOnze.dupla === duplaDe(assento);
  const visao = {
    assento,
    dupla: duplaDe(assento),
    participantes: structuredClone(estado.participantes),
    placar: [estado.placar[0], estado.placar[1]],
    fase: estado.fase,
    numeroMao: mao.numero,
    carteador: mao.carteador,
    tipoMao: mao.tipo,
    vira: { ...mao.vira },
    manilha: mao.manilha,
    valorMao: mao.valor,
    minhasCartas: mao.cartas[assento].map((c) => ferro ? null : { ...c }),
    quantidadeCartas: [mao.cartas[0].length, mao.cartas[1].length, mao.cartas[2].length, mao.cartas[3].length],
    rodadas: mao.rodadas.map((r) => ({
      iniciante: r.iniciante,
      resultado: r.resultado,
      vencedor: r.vencedor,
      jogadas: r.jogadas.map((j) => ({
        assento: j.assento,
        encoberta: j.encoberta,
        carta: j.encoberta && j.assento !== assento ? null : { ...j.carta }
      }))
    })),
    vez: mao.vez,
    aguardando: assentoDaVez(estado),
    acoes: acoesValidas(estado, assento),
    versao: estado.versao
  };
  if (estado.vencedora !== void 0) visao.vencedora = estado.vencedora;
  if (mao.pedido) visao.pedido = { ...mao.pedido };
  if (mao.decisaoOnze) visao.decisaoOnze = { ...mao.decisaoOnze };
  if (onzePendenteMinhaDupla) visao.cartasParceiro = mao.cartas[parceiroDe(assento)].map((c) => ({ ...c }));
  return visao;
}
function eventosParaAssento(eventos, assento) {
  return eventos.map((e) => {
    if (e.tipo === "CARTA_JOGADA" && e.encoberta && e.assento !== assento) {
      return { ...e, carta: null, manilha: false, zap: false };
    }
    return e;
  });
}

// src/bots/avaliacao.ts
function minhasCartas(visao) {
  const lista = [];
  visao.minhasCartas.forEach((carta, indice) => {
    if (carta) lista.push({ indice, carta, forca: forca(carta, visao.manilha) });
  });
  return lista.sort((a, b) => a.forca - b.forca);
}
function forcaNormalizada(f) {
  if (f >= 100) return 0.85 + (f - 100) * 0.05;
  return f / 9 * 0.8;
}
function situacaoDaRodada(visao) {
  const rodada = visao.rodadas[visao.rodadas.length - 1];
  const abertas = rodada.jogadas.filter((j) => j.carta && !j.encoberta);
  let maior = -1;
  let assentoMaior;
  const duplasNoMaior = /* @__PURE__ */ new Set();
  for (const j of abertas) {
    const f = forca(j.carta, visao.manilha);
    if (f > maior) {
      maior = f;
      assentoMaior = j.assento;
      duplasNoMaior.clear();
    }
    if (f === maior) duplasNoMaior.add(duplaDe(j.assento));
  }
  const empatada = duplasNoMaior.size > 1;
  const ganhando = !empatada && assentoMaior !== void 0 ? duplaDe(assentoMaior) : void 0;
  const resultadosAnteriores = visao.rodadas.slice(0, -1).map((r) => r.resultado);
  return {
    numero: visao.rodadas.length,
    jogadas: rodada.jogadas.length,
    maior,
    assentoMaior,
    empatada,
    parceiroGanhando: ganhando === visao.dupla,
    adversarioGanhando: ganhando === outraDupla(visao.dupla),
    souUltimo: rodada.jogadas.length === 3,
    resultadosAnteriores,
    vitorias: resultadosAnteriores.filter((r) => r === visao.dupla).length,
    derrotas: resultadosAnteriores.filter((r) => r === outraDupla(visao.dupla)).length
  };
}
function cartasNaoVistas(visao) {
  const vistas = [visao.vira];
  for (const c of visao.minhasCartas) if (c) vistas.push(c);
  for (const r of visao.rodadas) for (const j of r.jogadas) if (j.carta) vistas.push(j.carta);
  const chaves = new Set(vistas.map(nomeCarta));
  return criarBaralho().filter((c) => !chaves.has(nomeCarta(c)));
}
function cartasDosAdversarios(visao) {
  return visao.quantidadeCartas.filter((_, a) => duplaDe(a) !== visao.dupla).reduce((s, n) => s + n, 0);
}
function probabilidadeImbativel(carta, visao) {
  const naoVistas = cartasNaoVistas(visao).filter((c) => !mesmaCarta(c, carta));
  const minha = forca(carta, visao.manilha);
  const k = naoVistas.filter((c) => forca(c, visao.manilha) > minha).length;
  const U = naoVistas.length;
  const h = Math.min(cartasDosAdversarios(visao), U);
  let p = 1;
  for (let i = 0; i < h; i++) p *= Math.max(0, U - k - i) / (U - i);
  return p;
}
function adversarioVenceSeCorrermos(visao) {
  return visao.placar[outraDupla(visao.dupla)] + visao.valorMao >= 12;
}

// src/bots/estrategias.ts
function sortear(itens, aleatorio) {
  return itens[Math.floor(aleatorio() * itens.length)];
}
function jogar(visao, carta) {
  return { tipo: "JOGAR_CARTA", assento: visao.assento, indice: carta?.indice ?? 0 };
}
function escolherCarta(visao, aleatorio) {
  const cartas = minhasCartas(visao);
  if (cartas.length === 0) return { tipo: "JOGAR_CARTA", assento: visao.assento, indice: sortear(visao.minhasCartas.map((_, i) => i), aleatorio) };
  const s = situacaoDaRodada(visao);
  const fraca = cartas[0];
  const forte = cartas[cartas.length - 1];
  const descartar = () => jogar(visao, fraca);
  if (s.jogadas === 0) {
    if (s.numero === 1 && cartas.length === 3) {
      return jogar(visao, cartas[1]);
    }
    return jogar(visao, forte);
  }
  if (s.parceiroGanhando) {
    if (s.souUltimo || s.maior >= 7) return descartar();
    const cobre = cartas.find((c) => c.forca > s.maior);
    return cobre && cobre.forca < 100 ? jogar(visao, cobre) : descartar();
  }
  const vence = cartas.find((c) => c.forca > s.maior);
  if (vence) return jogar(visao, vence);
  const empata = cartas.find((c) => c.forca === s.maior && c.forca < 100);
  if (empata && (s.vitorias > 0 || s.numero === 1)) return jogar(visao, empata);
  return descartar();
}
function equidadeMedio(visao) {
  const cartas = minhasCartas(visao).map((c) => forcaNormalizada(c.forca)).sort((a, b) => b - a);
  const s = situacaoDaRodada(visao);
  const e = 0.45 * (cartas[0] ?? 0) + 0.3 * (cartas[1] ?? 0) + 0.25 * (s.vitorias - s.derrotas) + (s.parceiroGanhando ? 0.15 : 0) - (s.adversarioGanhando ? 0.1 : 0);
  return Math.max(0, Math.min(1, e));
}
function equidadeDificil(visao) {
  const probs = minhasCartas(visao).map((c) => probabilidadeImbativel(c.carta, visao)).sort((a, b) => b - a);
  const p1 = probs[0] ?? 0;
  const p2 = probs[1] ?? 0;
  const s = situacaoDaRodada(visao);
  const parceiro = s.parceiroGanhando ? 0.2 : 0.1;
  let e;
  if (s.vitorias > s.derrotas) e = 1 - (1 - p1) * (1 - parceiro);
  else if (s.derrotas > s.vitorias) e = p1 * Math.max(p2, parceiro);
  else e = p1 * 0.6 + p2 * 0.25 + parceiro;
  return Math.max(0, Math.min(1, e));
}
function equidade(visao, nivel) {
  return nivel === "dificil" ? equidadeDificil(visao) : equidadeMedio(visao);
}
function exigenciaAceitar(visao) {
  const degrau = [3, 6, 9, 12].indexOf(visao.pedido?.valor ?? 3);
  return 0.45 + degrau * 0.05;
}
function responder(visao, nivel) {
  const podeAumentar = visao.acoes.some((a) => a.tipo === "RESPONDER_TRUCO" && a.resposta === "aumentar");
  const e = equidade(visao, nivel);
  if (adversarioVenceSeCorrermos(visao)) return podeAumentar && e > 0.6 ? "aumentar" : "aceitar";
  if (podeAumentar && e >= 0.85) return "aumentar";
  return e >= exigenciaAceitar(visao) ? "aceitar" : "correr";
}
function devePedir(visao, nivel) {
  return equidade(visao, nivel) >= 0.75;
}
function decidirOnze2(visao, nivel) {
  const todas = [...visao.minhasCartas, ...visao.cartasParceiro ?? []].filter((c) => c !== null);
  const manilhas = todas.filter((c) => c.valor === visao.manilha).length;
  const fortes = todas.filter((c) => c.valor !== visao.manilha && (c.valor === "3" || c.valor === "2")).length;
  if (nivel === "facil") return manilhas > 0 ? "jogar" : "correr";
  const pontos = manilhas * 1.5 + fortes * 0.7;
  const placarAdversario = visao.placar[outraDupla(visao.dupla)];
  const exigencia = nivel === "dificil" && placarAdversario >= 9 ? 1.8 : 2.2;
  return pontos >= exigencia ? "jogar" : "correr";
}
function facil(visao, aleatorio) {
  const a = visao.assento;
  if (visao.decisaoOnze) return { tipo: "DECIDIR_MAO_DE_ONZE", assento: a, decisao: decidirOnze2(visao, "facil") };
  if (visao.pedido) {
    const r = aleatorio();
    const podeAumentar = visao.acoes.some((x) => x.tipo === "RESPONDER_TRUCO" && x.resposta === "aumentar");
    return { tipo: "RESPONDER_TRUCO", assento: a, resposta: r < 0.1 && podeAumentar ? "aumentar" : r < 0.6 ? "aceitar" : "correr" };
  }
  if (visao.acoes.some((x) => x.tipo === "PEDIR_TRUCO") && aleatorio() < 0.05) return { tipo: "PEDIR_TRUCO", assento: a };
  const abertas = visao.acoes.filter((x) => x.tipo === "JOGAR_CARTA" && !x.encoberta);
  return sortear(abertas, aleatorio);
}
function estrategica(visao, nivel, aleatorio) {
  const a = visao.assento;
  if (visao.decisaoOnze) return { tipo: "DECIDIR_MAO_DE_ONZE", assento: a, decisao: decidirOnze2(visao, nivel) };
  if (visao.pedido) return { tipo: "RESPONDER_TRUCO", assento: a, resposta: responder(visao, nivel) };
  if (visao.acoes.some((x) => x.tipo === "PEDIR_TRUCO") && devePedir(visao, nivel)) {
    return { tipo: "PEDIR_TRUCO", assento: a };
  }
  return escolherCarta(visao, aleatorio);
}
function estrategia(visao, nivel, aleatorio) {
  return nivel === "facil" ? facil(visao, aleatorio) : estrategica(visao, nivel, aleatorio);
}

// src/bots/index.ts
function mesmaAcao(a, b) {
  if (a.tipo !== b.tipo || a.assento !== b.assento) return false;
  if (a.tipo === "JOGAR_CARTA" && b.tipo === "JOGAR_CARTA") return a.indice === b.indice && !!a.encoberta === !!b.encoberta;
  if (a.tipo === "RESPONDER_TRUCO" && b.tipo === "RESPONDER_TRUCO") return a.resposta === b.resposta;
  if (a.tipo === "DECIDIR_MAO_DE_ONZE" && b.tipo === "DECIDIR_MAO_DE_ONZE") return a.decisao === b.decisao;
  return true;
}
function acaoSegura(visao) {
  return visao.acoes.find((a) => a.tipo === "JOGAR_CARTA" && !a.encoberta) ?? visao.acoes.find((a) => a.tipo === "RESPONDER_TRUCO" && a.resposta === "correr") ?? visao.acoes.find((a) => a.tipo === "DECIDIR_MAO_DE_ONZE" && a.decisao === "jogar") ?? visao.acoes[0];
}
function decidirBot(visao, nivel, aleatorio = Math.random) {
  if (visao.acoes.length === 0) return void 0;
  let proposta;
  try {
    proposta = estrategia(visao, nivel, aleatorio);
  } catch {
    proposta = void 0;
  }
  if (proposta && visao.acoes.some((a) => mesmaAcao(a, proposta))) return { acao: proposta, fallback: false };
  return { acao: acaoSegura(visao), fallback: true };
}

// src/ui/arte/avatares-catalogo.ts
var PELE_CLARA = "#f1c7a3";
var PELE_MEDIA = "#c68c5c";
var PELE_ESCURA = "#8a5a3b";
var OLHO = "#1e1b18";
var BOCA = "#7a3b2e";
var AVATARES = [
  {
    id: "mineradora",
    nome: "Mineradora",
    fundo: "#4a4a4a",
    paleta: { Y: "#f2c94c", L: "#fffbe6", h: "#5c3a1e", s: PELE_MEDIA, k: OLHO, n: "#a8704a", m: BOCA, o: "#d9762b" },
    mapa: ["..YYYYYY..", ".YYYLLYYY.", "YYYYYYYYYY", "hssssssssh", "hskksskksh", "hssssssssh", "hsssnnsssh", "hssmmmmssh", ".ssssssss.", "..oooooo.."]
  },
  {
    id: "lenhador",
    nome: "Lenhador",
    fundo: "#2f5a2a",
    paleta: { R: "#c0392b", r: "#7b1f17", s: PELE_CLARA, k: OLHO, n: "#d9a27c", b: "#d2691e", m: BOCA },
    mapa: ["..RrRrRr..", ".rRrRrRrR.", "RrRrRrRrRr", "ssssssssss", "skksssskks", "ssssnnssss", "bsbbbbbbsb", "bbbmmmmbbb", ".bbbbbbbb.", "..bbbbbb.."]
  },
  {
    id: "ferreira",
    nome: "Ferreira",
    fundo: "#6b2f1a",
    paleta: { P: "#1c1c1c", s: PELE_ESCURA, G: "#7d7d7d", c: "#6fc3df", n: "#6e4429", m: "#4a2218", a: "#8b5a2b" },
    mapa: ["...PPPP...", ".PPPPPPPP.", "PPPPPPPPPP", "PssssssssP", "GGccGGccGG", "PssssssssP", "PsssnnsssP", ".ssmmmmss.", ".ssssssss.", "..aaaaaa.."]
  },
  {
    id: "explorador",
    nome: "Explorador",
    fundo: "#a8794d",
    paleta: { H: "#6b4423", h: "#2c1a0e", s: PELE_MEDIA, k: OLHO, n: "#a8704a", B: "#3b2414", m: BOCA, v: "#4f7a28" },
    mapa: ["...HHHH...", "..HHHHHH..", ".hhhhhhhh.", "HHHHHHHHHH", "ssssssssss", "skksssskks", "ssssnnssss", "sBBBBBBBBs", ".ssmmmmss.", "..vvvvvv.."]
  },
  {
    id: "feiticeira",
    nome: "Feiticeira",
    fundo: "#1f1a3a",
    paleta: { U: "#6a3fa0", u: "#3e2366", s: "#e8d9c5", C: "#5ff2e8", m: "#9b4f6a" },
    mapa: ["....UU....", "...UUUU...", "..UUUUUU..", ".UUuuuuUU.", "UUussssuUU", "UUsCssCsUU", "UUssssssUU", "UUssmmssUU", "UUUssssUUU", "UUUUUUUUUU"]
  },
  {
    id: "cozinheiro",
    nome: "Cozinheiro",
    fundo: "#b0413e",
    paleta: { W: "#f5f5f5", w: "#c9c9c9", s: PELE_CLARA, k: OLHO, p: "#f08a8a", n: "#d9a27c", m: BOCA },
    mapa: ["..WWWWWW..", ".WWWWWWWW.", ".WwWWWWwW.", "..WWWWWW..", ".ssssssss.", "ssksssskss", "sppssssspp", "ssssnnssss", ".ssmmmmss.", "..WWWWWW.."]
  },
  {
    id: "pescadora",
    nome: "Pescadora",
    fundo: "#1f5f8b",
    paleta: { A: "#2e86c1", h: "#c0562b", s: PELE_CLARA, k: OLHO, f: "#c98a5e", n: "#d9a27c", m: BOCA },
    mapa: ["..AAAAAA..", ".AAAAAAAA.", "AAAAAAAAAA", "hssssssssh", "hskksskksh", "hsfssssfsh", "hsssnnsssh", "hhssmmsshh", "hhsssssshh", ".hhAAAAhh."]
  },
  {
    id: "golem",
    nome: "Golem de pedra",
    fundo: "#2b3a2b",
    paleta: { G: "#8a8a8a", g: "#6a6a6a", M: "#4f8a3a", E: "#7dff6a", k: "#2a2a2a" },
    mapa: ["MMgGGGgMMM", "GGgGGGGgGG", "GGGGgGGGGG", "GEEGGGGEEG", "GEEGGGGEEG", "GGGGggGGGG", "gGGGGGGGGg", "GGkkkkkkGG", "GGGGGGGGgG", "gGGGGGGGGG"]
  }
];

// src/servidor/sala.ts
var MINUTOS_PARA_INICIAR = 30;
var SEGUNDOS_SEM_SINAL = 60;
var SEGUNDOS_ENTRE_SINAIS = 15;
var NOMES_BOTS = ["Tijolo", "Cascalho", "Brasa", "Musgo", "Granito", "Argila", "Pavio", "Sereno"];
var mais = (agora, ms) => new Date(agora.getTime() + ms).toISOString();
function validarPerfil(perfil) {
  const p = perfil;
  const apelido = typeof p?.apelido === "string" ? p.apelido.trim() : "";
  if (apelido.length < 2 || apelido.length > 16) throw new ErroServidor("DADOS_INVALIDOS", "O apelido precisa ter de 2 a 16 caracteres.");
  const avatar = AVATARES.some((a) => a.id === p.avatar) ? p.avatar : AVATARES[0].id;
  return { apelido, avatar };
}
function novaSala(codigo, perfil, tokenHash, agora) {
  return {
    codigo,
    situacao: "aguardando",
    anfitriao: 0,
    assentos: [{ tipo: "humano", nome: perfil.apelido, avatar: perfil.avatar, tokenHash, ultimoSinal: agora.toISOString() }, null, null, null],
    lotes: [],
    criadaEm: agora.toISOString(),
    expiraEm: mais(agora, MINUTOS_PARA_INICIAR * 6e4),
    atualizadaEm: agora.toISOString(),
    versao: 0
  };
}
function presente(o, agora) {
  if (!o || o.tipo !== "humano" || o.saiu || !o.ultimoSinal) return false;
  return agora.getTime() - new Date(o.ultimoSinal).getTime() <= SEGUNDOS_SEM_SINAL * 1e3;
}
function controladoPorBot(o, agora) {
  return !!o && (o.tipo === "bot" || !presente(o, agora));
}
function assentoDoToken(sala, tokenHash) {
  const i = sala.assentos.findIndex((o) => o?.tokenHash === tokenHash);
  return i >= 0 ? i : void 0;
}
function nomeUnico(sala, apelido, ignorar) {
  const usados = new Set(sala.assentos.filter((o, i) => o && i !== ignorar).map((o) => o.nome.toLowerCase()));
  if (!usados.has(apelido.toLowerCase())) return apelido;
  for (let n = 2; ; n++) {
    const candidato = `${apelido.slice(0, 13)} ${n}`;
    if (!usados.has(candidato.toLowerCase())) return candidato;
  }
}
function exigirAguardando(sala, agora) {
  if (sala.situacao === "encerrada") throw new ErroServidor("SALA_ENCERRADA", "Esta sala j\xE1 foi encerrada.", 410);
  if (sala.situacao === "em_jogo") throw new ErroServidor("SALA_EM_JOGO", "A partida desta sala j\xE1 come\xE7ou.", 409);
  if (new Date(sala.expiraEm) < agora) throw new ErroServidor("SALA_EXPIRADA", "Esta sala expirou sem come\xE7ar.", 410);
}
function entrar(sala, perfil, tokenHash, agora) {
  exigirAguardando(sala, agora);
  let alvo = sala.assentos.findIndex((o) => o === null);
  if (alvo < 0) alvo = sala.assentos.findIndex((o) => o?.tipo === "bot");
  if (alvo < 0) throw new ErroServidor("SALA_CHEIA", "A sala est\xE1 cheia.", 409);
  sala.assentos[alvo] = {
    tipo: "humano",
    nome: nomeUnico(sala, perfil.apelido, alvo),
    avatar: perfil.avatar,
    tokenHash,
    ultimoSinal: agora.toISOString()
  };
  return alvo;
}
function reconectar(sala, tokenHash, agora) {
  const assento = assentoDoToken(sala, tokenHash);
  if (assento === void 0) return void 0;
  const o = sala.assentos[assento];
  if (o.saiu && sala.situacao === "encerrada") return void 0;
  delete o.saiu;
  o.ultimoSinal = agora.toISOString();
  return assento;
}
function registrarSinal(sala, assento, agora) {
  const o = sala.assentos[assento];
  if (!o || o.saiu) return false;
  const ultimo = o.ultimoSinal ? new Date(o.ultimoSinal).getTime() : 0;
  if (agora.getTime() - ultimo < SEGUNDOS_ENTRE_SINAIS * 1e3) return false;
  o.ultimoSinal = agora.toISOString();
  return true;
}
function botNovo(sala, dificuldade) {
  const usados = new Set(sala.assentos.map((o) => o?.nome));
  const nome = NOMES_BOTS.find((n) => !usados.has(n)) ?? `Bot ${sala.assentos.filter(Boolean).length + 1}`;
  const avatares = AVATARES.map((a) => a.id).filter((id) => !sala.assentos.some((o) => o?.avatar === id));
  return { tipo: "bot", nome, avatar: avatares[0] ?? "golem", dificuldade: dificuldade ?? "medio" };
}
function operarAssento(sala, meu, op, agora, aleatorio = Math.random) {
  exigirAguardando(sala, agora);
  const anfitriao = sala.anfitriao === meu;
  const exigirAnfitriao = () => {
    if (!anfitriao) throw new ErroServidor("SEM_PERMISSAO", "S\xF3 o anfitri\xE3o pode fazer isso.", 403);
  };
  const valido = (a) => ASSENTOS.includes(a);
  switch (op.tipo) {
    case "mover": {
      if (!valido(op.para)) throw new ErroServidor("DADOS_INVALIDOS", "Assento inv\xE1lido.");
      if (sala.assentos[op.para]) throw new ErroServidor("ASSENTO_OCUPADO", "Esse assento j\xE1 est\xE1 ocupado.", 409);
      sala.assentos[op.para] = sala.assentos[meu];
      sala.assentos[meu] = null;
      if (anfitriao) sala.anfitriao = op.para;
      return;
    }
    case "adicionarBot": {
      exigirAnfitriao();
      if (!valido(op.assento)) throw new ErroServidor("DADOS_INVALIDOS", "Assento inv\xE1lido.");
      if (sala.assentos[op.assento]) throw new ErroServidor("ASSENTO_OCUPADO", "Esse assento j\xE1 est\xE1 ocupado.", 409);
      sala.assentos[op.assento] = botNovo(sala, ["facil", "medio", "dificil"].includes(op.dificuldade) ? op.dificuldade : "medio");
      return;
    }
    case "removerBot": {
      exigirAnfitriao();
      if (!valido(op.assento) || sala.assentos[op.assento]?.tipo !== "bot") throw new ErroServidor("DADOS_INVALIDOS", "N\xE3o h\xE1 bot nesse assento.");
      sala.assentos[op.assento] = null;
      return;
    }
    case "trocar": {
      exigirAnfitriao();
      if (!valido(op.a) || !valido(op.b)) throw new ErroServidor("DADOS_INVALIDOS", "Assento inv\xE1lido.");
      [sala.assentos[op.a], sala.assentos[op.b]] = [sala.assentos[op.b], sala.assentos[op.a]];
      if (sala.anfitriao === op.a) sala.anfitriao = op.b;
      else if (sala.anfitriao === op.b) sala.anfitriao = op.a;
      return;
    }
    case "sortear": {
      exigirAnfitriao();
      const anfitriaoOcupante = sala.assentos[sala.anfitriao];
      const embaralhados = [...sala.assentos].sort(() => aleatorio() - 0.5);
      sala.assentos = embaralhados;
      sala.anfitriao = sala.assentos.indexOf(anfitriaoOcupante);
      return;
    }
    default:
      throw new ErroServidor("DADOS_INVALIDOS", "Opera\xE7\xE3o desconhecida.");
  }
}
function transferirAnfitriao(sala, agora) {
  if (presente(sala.assentos[sala.anfitriao] ?? null, agora)) return true;
  for (let i = 1; i <= 4; i++) {
    const a = (sala.anfitriao + i) % 4;
    if (presente(sala.assentos[a] ?? null, agora)) {
      sala.anfitriao = a;
      return true;
    }
  }
  return false;
}
function sair(sala, meu, agora) {
  const o = sala.assentos[meu];
  if (!o) return;
  if (sala.situacao === "aguardando") {
    sala.assentos[meu] = null;
  } else {
    o.saiu = true;
  }
  if (!transferirAnfitriao(sala, agora)) {
    sala.situacao = "encerrada";
    sala.expiraEm = agora.toISOString();
  }
}
function assentosOcupados(sala) {
  return sala.assentos.filter(Boolean).length;
}

// src/servidor/jogo.ts
var RITMO = { bot: 900, rodada: 1800, mao: 2600 };
var PRAZO = { jogada: 3e4, decisao: 2e4 };
var MS_SEM_HUMANOS = 12e4;
var HORAS_INATIVIDADE = 2;
var MAX_LOTES = 40;
var mais2 = (agora, ms) => new Date(agora.getTime() + ms).toISOString();
function participantesDa(sala) {
  return sala.assentos.map(
    (o) => ({ nome: o.nome, avatar: o.avatar, tipo: o.tipo, ...o.dificuldade ? { dificuldade: o.dificuldade } : {} })
  );
}
function registrarLote(sala, eventos) {
  if (eventos.length === 0) return;
  sala.lotes = [...sala.lotes, { versao: sala.versao + 1, eventos }].slice(-MAX_LOTES);
}
function depoisDaAcao(sala, anterior, novo, eventos, agora) {
  sala.partida = novo;
  registrarLote(sala, eventos);
  sala.expiraEm = mais2(agora, HORAS_INATIVIDADE * 36e5);
  const fimMao = eventos.some((e) => e.tipo === "MAO_ENCERRADA");
  const fimRodada = eventos.find((e) => e.tipo === "RODADA_ENCERRADA");
  const espera = fimMao ? RITMO.mao : fimRodada ? RITMO.rodada : RITMO.bot;
  if (fimRodada && fimRodada.tipo === "RODADA_ENCERRADA") {
    let rodada;
    if (novo.mao.numero === anterior.mao.numero) {
      rodada = novo.mao.rodadas[novo.mao.rodadas.length - 2];
    } else {
      const ultima = structuredClone(anterior.mao.rodadas[anterior.mao.rodadas.length - 1]);
      const jogada = eventos.find((e) => e.tipo === "CARTA_JOGADA");
      if (jogada && jogada.tipo === "CARTA_JOGADA" && jogada.carta) {
        ultima.jogadas.push({ assento: jogada.assento, carta: jogada.carta, encoberta: jogada.encoberta });
      }
      ultima.resultado = fimRodada.resultado;
      if (fimRodada.vencedor !== void 0) ultima.vencedor = fimRodada.vencedor;
      rodada = ultima;
    }
    sala.destaque = { rodada, placar: [novo.placar[0], novo.placar[1]], ate: mais2(agora, espera) };
  } else {
    delete sala.destaque;
  }
  sala.proximoBotEm = mais2(agora, espera);
  const vez = assentoDaVez(novo);
  if (novo.fase === "jogando" && vez !== void 0 && presente(sala.assentos[vez] ?? null, agora)) {
    const decidir = novo.mao.pedido || novo.mao.decisaoOnze ? PRAZO.decisao : PRAZO.jogada;
    sala.prazo = mais2(agora, espera + decidir);
  } else {
    delete sala.prazo;
  }
  if (novo.fase === "encerrada") {
    delete sala.prazo;
    sala.expiraEm = mais2(agora, HORAS_INATIVIDADE * 36e5);
  }
}
function iniciarPartida(sala, meu, agora, semente) {
  if (sala.anfitriao !== meu) throw new ErroServidor("SEM_PERMISSAO", "S\xF3 o anfitri\xE3o pode iniciar a partida.", 403);
  const revanche = sala.situacao === "em_jogo" && sala.partida?.fase === "encerrada";
  if (!revanche) {
    if (sala.situacao !== "aguardando") throw new ErroServidor("SALA_EM_JOGO", "A partida j\xE1 est\xE1 em andamento.", 409);
    if (new Date(sala.expiraEm) < agora) throw new ErroServidor("SALA_EXPIRADA", "Esta sala expirou sem come\xE7ar.", 410);
    const faltam = 4 - assentosOcupados(sala);
    if (faltam > 0) throw new ErroServidor("ASSENTOS_VAZIOS", `Falta${faltam > 1 ? "m" : ""} ${faltam} participante${faltam > 1 ? "s" : ""}.`, 409);
  } else {
    sala.assentos = sala.assentos.map((o) => o?.saiu ? { tipo: "bot", nome: o.nome, avatar: o.avatar, dificuldade: "medio" } : o);
  }
  const anterior = sala.partida;
  const { estado, eventos } = criarPartida({ participantes: participantesDa(sala), semente });
  sala.situacao = "em_jogo";
  depoisDaAcao(sala, anterior ?? estado, estado, eventos, agora);
  delete sala.destaque;
}
function acaoHumana(sala, meu, acao, agora) {
  if (sala.situacao !== "em_jogo" || !sala.partida) throw new ErroServidor("REGRA", "N\xE3o h\xE1 partida em andamento.", 409);
  const anterior = sala.partida;
  const r = aplicarAcao(anterior, { ...acao, assento: meu });
  if (!r.ok) throw new ErroServidor("REGRA", r.erro.mensagem, 422);
  depoisDaAcao(sala, anterior, r.estado, r.eventos, agora);
}
function avancar(sala, agora, aleatorio = Math.random) {
  if (sala.situacao === "aguardando" && new Date(sala.expiraEm) < agora) {
    sala.situacao = "encerrada";
    return true;
  }
  const partida = sala.partida;
  if (sala.situacao !== "em_jogo" || !partida) return false;
  const algumPresente = sala.assentos.some((o) => presente(o, agora));
  if (!algumPresente) {
    const ultimoSinal = Math.max(...sala.assentos.map((o) => o?.ultimoSinal && !o.saiu ? new Date(o.ultimoSinal).getTime() : 0));
    if (agora.getTime() - ultimoSinal > MS_SEM_HUMANOS || sala.assentos.every((o) => o?.tipo !== "humano" || o.saiu)) {
      sala.situacao = "encerrada";
      sala.expiraEm = agora.toISOString();
      return true;
    }
    return false;
  }
  if (!presente(sala.assentos[sala.anfitriao] ?? null, agora)) transferirAnfitriao(sala, agora);
  if (partida.fase !== "jogando") return false;
  const vez = assentoDaVez(partida);
  if (vez === void 0) return false;
  const ocupante = sala.assentos[vez] ?? null;
  const porBot = controladoPorBot(ocupante, agora);
  const liberado = porBot ? !sala.proximoBotEm || agora >= new Date(sala.proximoBotEm) : !!sala.prazo && agora >= new Date(sala.prazo);
  if (!liberado) return false;
  const nivel = ocupante?.tipo === "bot" ? ocupante.dificuldade ?? "medio" : "medio";
  const decisao = decidirBot(visaoDoAssento(partida, vez), nivel, aleatorio);
  if (!decisao) return false;
  const r = aplicarAcao(partida, decisao.acao);
  if (!r.ok) return false;
  depoisDaAcao(sala, partida, r.estado, r.eventos, agora);
  return true;
}
function respostaPara(sala, meu, desde, agora) {
  const assentos = sala.assentos.map((o, i) => ({
    assento: i,
    ocupado: !!o,
    ...o ? { tipo: o.tipo, nome: o.nome, avatar: o.avatar } : {},
    ...o?.dificuldade ? { dificuldade: o.dificuldade } : {},
    anfitriao: sala.anfitriao === i,
    botNoLugar: !!o && o.tipo === "humano" && controladoPorBot(o, agora),
    souEu: i === meu
  }));
  const resposta = {
    codigo: sala.codigo,
    situacao: sala.situacao,
    versao: sala.versao,
    meuAssento: meu,
    souAnfitriao: sala.anfitriao === meu,
    assentos,
    expiraEm: sala.expiraEm,
    lotes: sala.lotes.filter((l) => l.versao > desde).map((l) => ({ versao: l.versao, eventos: eventosParaAssento(l.eventos, meu) })),
    agora: agora.toISOString()
  };
  if (sala.partida) resposta.visao = visaoDoAssento(sala.partida, meu);
  if (sala.prazo && sala.partida && assentoDaVez(sala.partida) === meu) resposta.prazo = sala.prazo;
  if (sala.destaque && new Date(sala.destaque.ate) > agora) {
    resposta.destaque = {
      ...sala.destaque,
      rodada: {
        iniciante: sala.destaque.rodada.iniciante,
        resultado: sala.destaque.rodada.resultado,
        vencedor: sala.destaque.rodada.vencedor,
        jogadas: sala.destaque.rodada.jogadas.map((j) => ({
          assento: j.assento,
          encoberta: j.encoberta,
          carta: j.encoberta && j.assento !== meu ? null : j.carta
        }))
      }
    };
  }
  return resposta;
}

// src/servidor/servico.ts
var TENTATIVAS = 6;
var MS_RETENCAO = 24 * 36e5;
var Servico = class {
  repo;
  relogio;
  semente;
  aleatorio;
  constructor(repo, relogio = () => /* @__PURE__ */ new Date(), semente = () => Date.now() ^ Math.floor(Math.random() * 2147483647), aleatorio = Math.random) {
    this.repo = repo;
    this.relogio = relogio;
    this.semente = semente;
    this.aleatorio = aleatorio;
  }
  async carregar(codigo) {
    const sala = await this.repo.buscar(normalizarCodigo(codigo));
    if (!sala) throw new ErroServidor("SALA_INEXISTENTE", "Sala n\xE3o encontrada. Confira o c\xF3digo.", 404);
    return sala;
  }
  async meuAssento(sala, token) {
    if (typeof token !== "string" || token.length < 16) throw new ErroServidor("CREDENCIAL_INVALIDA", "Credencial inv\xE1lida.", 401);
    const assento = assentoDoToken(sala, await hashToken(token));
    if (assento === void 0) throw new ErroServidor("CREDENCIAL_INVALIDA", "Voc\xEA n\xE3o est\xE1 nesta sala.", 401);
    return assento;
  }
  /** Lê, aplica `fn` numa cópia e grava se `fn` disser que mudou. */
  async transacao(codigo, fn) {
    for (let i = 0; i < TENTATIVAS; i++) {
      const original = await this.carregar(codigo);
      const sala = structuredClone(original);
      const agora = this.relogio();
      const { mudou, valor } = await fn(sala, agora);
      if (!mudou) return valor;
      sala.versao = original.versao + 1;
      sala.atualizadaEm = agora.toISOString();
      if (await this.repo.salvar(sala, original.versao)) return valor;
    }
    throw new ErroServidor("CONFLITO", "Muita gente mexendo ao mesmo tempo. Tente de novo.", 409);
  }
  /** UC-005 */
  async criarSala(perfil) {
    const p = validarPerfil(perfil);
    const agora = this.relogio();
    await this.repo.limparExpiradas(new Date(agora.getTime() - MS_RETENCAO)).catch(() => void 0);
    const token = gerarToken();
    const hash = await hashToken(token);
    for (let i = 0; i < 10; i++) {
      const codigo = gerarCodigo();
      if (await this.repo.criar(novaSala(codigo, p, hash, agora))) return { codigo, token, assento: 0 };
    }
    throw new ErroServidor("INDISPONIVEL", "N\xE3o foi poss\xEDvel gerar um c\xF3digo de sala. Tente de novo.", 503);
  }
  /** UC-006 e UC-015 (com a credencial já guardada, é reconexão). */
  async entrar(codigo, perfil, token) {
    const cod = normalizarCodigo(codigo);
    if (typeof token === "string" && token.length >= 16) {
      const hash2 = await hashToken(token);
      const assento2 = await this.transacao(cod, async (sala2, agora) => {
        const a = reconectar(sala2, hash2, agora);
        return { mudou: a !== void 0, valor: a };
      });
      if (assento2 !== void 0) return { codigo: cod, token, assento: assento2, reconectou: true };
      const sala = await this.carregar(cod);
      if (sala.situacao !== "aguardando") throw new ErroServidor("CREDENCIAL_INVALIDA", "N\xE3o h\xE1 assento seu para recuperar nesta sala.", 401);
    }
    const p = validarPerfil(perfil);
    const novo = gerarToken();
    const hash = await hashToken(novo);
    const assento = await this.transacao(cod, async (sala, agora) => ({ mudou: true, valor: entrar(sala, p, hash, agora) }));
    return { codigo: cod, token: novo, assento, reconectou: false };
  }
  /** UC-007 */
  async operar(codigo, token, op) {
    await this.transacao(codigo, async (sala, agora) => {
      operarAssento(sala, await this.meuAssento(sala, token), op, agora, this.aleatorio);
      return { mudou: true, valor: void 0 };
    });
  }
  /** UC-008 e UC-016 */
  async iniciar(codigo, token) {
    await this.transacao(codigo, async (sala, agora) => {
      iniciarPartida(sala, await this.meuAssento(sala, token), agora, this.semente());
      return { mudou: true, valor: void 0 };
    });
  }
  /** UC-010 a UC-013 */
  async acao(codigo, token, acao) {
    if (!acao || typeof acao !== "object" || typeof acao.tipo !== "string") {
      throw new ErroServidor("DADOS_INVALIDOS", "A\xE7\xE3o inv\xE1lida.");
    }
    await this.transacao(codigo, async (sala, agora) => {
      const meu = await this.meuAssento(sala, token);
      registrarSinal(sala, meu, agora);
      acaoHumana(sala, meu, acao, agora);
      return { mudou: true, valor: void 0 };
    });
  }
  /** UC-014 */
  async sair(codigo, token) {
    await this.transacao(codigo, async (sala, agora) => {
      sair(sala, await this.meuAssento(sala, token), agora);
      return { mudou: true, valor: void 0 };
    });
  }
  /**
   * Consulta periódica do navegador: registra presença, deixa bots jogarem / aplica prazos
   * e devolve o que este assento pode ver desde a versão `desde`.
   */
  async estado(codigo, token, desde) {
    return this.transacao(codigo, async (sala, agora) => {
      const meu = await this.meuAssento(sala, token);
      const sinal = registrarSinal(sala, meu, agora);
      const avancou = avancar(sala, agora, this.aleatorio);
      const mudou = sinal || avancou;
      const resposta = respostaPara(sala, meu, Number.isFinite(desde) ? desde : -1, agora);
      if (mudou) resposta.versao = sala.versao + 1;
      return { mudou, valor: resposta };
    });
  }
};

// src/servidor/http.ts
var servicoPadrao;
function servico() {
  servicoPadrao ??= new Servico(repositorioPadrao());
  return servicoPadrao;
}
function json(dados, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
async function corpo(req) {
  try {
    const dados = await req.json();
    return dados && typeof dados === "object" ? dados : {};
  } catch {
    throw new ErroServidor("DADOS_INVALIDOS", "Corpo da requisi\xE7\xE3o inv\xE1lido.");
  }
}
var texto = (v) => typeof v === "string" ? v : "";
async function tratar(rota, req, s = servico()) {
  try {
    if (rota === "estado") {
      if (req.method !== "GET") return json({ erro: "M\xE9todo n\xE3o permitido." }, 405);
      const url = new URL(req.url);
      const token2 = req.headers.get("x-credencial") ?? "";
      const r = await s.estado(url.searchParams.get("codigo") ?? "", token2, Number(url.searchParams.get("desde") ?? -1));
      return json(r);
    }
    if (req.method !== "POST") return json({ erro: "M\xE9todo n\xE3o permitido." }, 405);
    const b = await corpo(req);
    const token = req.headers.get("x-credencial") ?? b.token;
    switch (rota) {
      case "criar":
        return json(await s.criarSala(b.perfil), 201);
      case "entrar":
        return json(await s.entrar(texto(b.codigo), b.perfil, token));
      case "assentos":
        await s.operar(texto(b.codigo), token, b.operacao);
        return json({ ok: true });
      case "iniciar":
        await s.iniciar(texto(b.codigo), token);
        return json({ ok: true });
      case "acao":
        await s.acao(texto(b.codigo), token, b.acao);
        return json({ ok: true });
      case "sair":
        await s.sair(texto(b.codigo), token);
        return json({ ok: true });
    }
  } catch (e) {
    if (e instanceof ErroServidor) return json({ erro: e.message, codigo: e.codigo }, e.status);
    console.error(e);
    return json({ erro: "Erro inesperado no servidor.", codigo: "INDISPONIVEL" }, 500);
  }
  return json({ erro: "Rota desconhecida." }, 404);
}
function rotaDoCaminho(caminho) {
  const mapa = {
    "/api/salas/criar": "criar",
    "/api/salas/entrar": "entrar",
    "/api/salas/assentos": "assentos",
    "/api/salas/estado": "estado",
    "/api/salas/sair": "sair",
    "/api/partidas/iniciar": "iniciar",
    "/api/partidas/acao": "acao"
  };
  return mapa[caminho.replace(/\/$/, "")];
}
export {
  rotaDoCaminho,
  tratar
};
