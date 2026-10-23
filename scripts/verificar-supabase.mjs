#!/usr/bin/env node
/**
 * Confere se o Supabase está pronto para o modo online, sem mexer em salas de verdade.
 * Uso: npm run verificar:supabase   (lê SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY do .env.local ou do ambiente)
 *
 * Passos: chave aceita → tabela `salas` existe → cria uma sala de teste → gravação com versão certa passa
 * → gravação com versão velha é recusada (RNF-001) → apaga a sala de teste.
 */
import { existsSync, readFileSync } from 'node:fs';

for (const arquivo of ['.env.local', '.env']) {
  if (!existsSync(arquivo)) continue;
  for (const linha of readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const url = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const ok = (t) => console.log(`  ✔ ${t}`);
const falha = (t, dica) => {
  console.error(`  ✘ ${t}`);
  if (dica) console.error(`    → ${dica}`);
  process.exit(1);
};

console.log('Verificando o Supabase do Trucão da Barela\n');
if (!url || !/^https?:\/\//.test(url)) falha('SUPABASE_URL não configurada.', 'Copie .env.example para .env.local e preencha com a Project URL.');
if (!chave) falha('SUPABASE_SERVICE_ROLE_KEY não configurada.', 'Use a Secret key (sb_secret_...) ou a service_role legada.');
if (chave.startsWith('sb_publishable_') || /"role":"anon"/.test(Buffer.from(chave.split('.')[1] ?? '', 'base64').toString())) {
  falha('Essa é a chave pública (anon/publishable).', 'O servidor precisa da chave SECRETA: Secret key (sb_secret_...) ou service_role.');
}
ok(`variáveis encontradas (${url})`);

const cabecalhos = {
  apikey: chave,
  ...(chave.startsWith('eyJ') ? { Authorization: `Bearer ${chave}` } : {}),
  'Content-Type': 'application/json',
};
async function req(caminho, init = {}) {
  try {
    return await fetch(`${url}/rest/v1/${caminho}`, { ...init, headers: { ...cabecalhos, ...(init.headers ?? {}) } });
  } catch (e) {
    falha(`Não consegui conectar em ${url}.`, `Confira a URL e a internet. (${e.cause?.code ?? e.message})`);
  }
}
const detalhe = async (r) => (await r.text()).slice(0, 200);

// 1. Chave e tabela
let r = await req('salas?select=codigo&limit=1');
if (r.status === 401 || r.status === 403) falha(`Chave recusada (${r.status}).`, 'Confira se copiou a chave secreta inteira, sem espaços.');
if (r.status === 404 || (r.status >= 400 && /PGRST205|does not exist|relation/.test(await r.clone().text()))) {
  falha('A tabela "salas" não existe.', 'Rode supabase/migrations/0001_salas.sql no SQL Editor do Supabase.');
}
if (!r.ok) falha(`Erro ao ler a tabela (${r.status}).`, await detalhe(r));
ok('chave aceita e tabela "salas" encontrada');

// 2. Sala de teste
const codigo = 'TESTE' + Math.floor(Math.random() * 10);
const agora = new Date();
const linha = (versao) => ({
  codigo,
  versao,
  dados: { codigo, teste: true, versao },
  atualizada_em: agora.toISOString(),
  expira_em: new Date(agora.getTime() + 60_000).toISOString(),
});
await req(`salas?codigo=eq.${codigo}`, { method: 'DELETE' });
r = await req('salas', { method: 'POST', body: JSON.stringify(linha(0)), headers: { Prefer: 'return=minimal' } });
if (!r.ok) falha(`Não consegui criar a sala de teste (${r.status}).`, await detalhe(r));
ok('sala de teste criada');

try {
  // 3. Gravação com a versão certa
  r = await req(`salas?codigo=eq.${codigo}&versao=eq.0`, { method: 'PATCH', body: JSON.stringify(linha(1)), headers: { Prefer: 'return=representation' } });
  if (!r.ok) falha(`Não consegui atualizar a sala (${r.status}).`, await detalhe(r));
  if ((await r.json()).length !== 1) falha('A atualização não alterou a sala.');
  ok('gravação com versão certa aceita');

  // 4. Gravação com versão velha
  r = await req(`salas?codigo=eq.${codigo}&versao=eq.0`, { method: 'PATCH', body: JSON.stringify(linha(1)), headers: { Prefer: 'return=representation' } });
  if (!r.ok || (await r.json()).length !== 0) falha('Gravação com versão velha não foi recusada (controle de versão).');
  ok('gravação com versão velha recusada (RNF-001)');
} finally {
  // 5. Limpeza
  await req(`salas?codigo=eq.${codigo}`, { method: 'DELETE' });
}
ok('sala de teste apagada');

console.log('\nTudo certo. Coloque as mesmas duas variáveis na Vercel e faça um novo deploy.');
