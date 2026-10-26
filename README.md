# Trucão da Barela

Jogo web de **truco paulista** para duas duplas: partidas contra bots, partidas online por código de sala e marcador de pontos para jogar com baralho físico — com visual em estilo de blocos/pixel art.

## Disciplina

Análise e Projeto de Software — Prof. Dr. João Choma — UEM/DIN

## Equipe

| Aluno | RA |
|---|---|
| Isabella Barela Venancio | 144023 |

## Documentação

| Documento | Conteúdo |
|---|---|
| [Plano de arquitetura e implementação](docs/plano-arquitetura-implementacao.md) | Stack, arquitetura, modelo de dados, API, sons e fases |
| [Regras de negócio](docs/regras-de-negocio.md) | 27 regras (RN-001 a RN-027) |
| [Requisitos](docs/requisitos.md) | 24 RF e 10 RNF |
| [Casos de uso](docs/casos-de-uso.md) | 21 UCs com CA/CT, checklist e matriz de rastreabilidade |

## Como rodar

Requer Node 20 ou superior.

```bash
npm install
npm run dev        # abre em http://localhost:5173
npm test           # testes do motor de regras
npm run coverage   # testes + cobertura (mínimo de 90% no motor)
npm run build      # build de produção (o que a Vercel executa)
```

Em `npm run dev` o modo online já funciona: sem Supabase configurado, as salas ficam na memória do servidor de desenvolvimento. Abra duas janelas (uma anônima) para jogar contra você mesmo.

## Colocar o online no ar (Supabase + Vercel)

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode o conteúdo de `supabase/migrations/0001_salas.sql`.
3. Em **Project Settings → API Keys**, copie a *Secret key* (`sb_secret_...`) — ou, na aba *Legacy API keys*, a *service_role*. A *Project URL* fica em **Project Settings → Data API**.
4. Copie `.env.example` para `.env.local`, preencha as duas variáveis e rode `npm run verificar:supabase`. O script confere a chave, a tabela e o controle de versão usando uma sala de teste, que ele apaga no final.
5. Com tudo ✔, rode `npm run dev` e jogue online: agora as salas ficam no Supabase.
6. Na Vercel, em **Settings → Environment Variables**, crie `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` com os mesmos valores e faça um novo deploy.

A chave secreta fica só no servidor: o navegador nunca acessa o banco (RNF-002). Sem essas variáveis, a Vercel responde que o online não está configurado, e o resto do jogo continua funcionando.

Ao alterar algo em `src/servidor`, rode `npm run build:api` e suba também `api/_lib/servidor.mjs` — é o código que as funções da Vercel executam.

## Andamento

| Fase | Situação |
|---|---|
| 0. Documentação | Concluída |
| 1. Base do projeto (Vite, React, TS, ESLint, Vitest, CI, Vercel) | Concluída |
| 2. Motor de regras (`src/engine`) | Concluída — 86 testes, 100% das linhas |
| 3. Bots (`src/bots`) | Concluída — fácil, médio e difícil + simulador |
| 4. Mesa contra bots + arte + sons | Concluída — partidas completas testadas no Chromium (desktop e 360 px) |
| 5. Marcador (`src/marcador`) | Concluída — placar, avisos de onze/ferro, desfazer e histórico |
| 6. Online (`src/servidor`, `src/online`, `api/`) | Concluída — salas por código, lobby, bots, prazos, sair/reconectar e revanche, testados com dois navegadores |
| Extra: sinais ao parceiro (RN-027) | Concluída — 9 sinais com gestos em pixel art, bots que sinalizam e leem sinais, sigilo testado no online |
| 7. Polimento | Próxima |

## Estrutura

```
src/
├─ engine/          motor de regras puro (sem React/rede) — RN-001 a RN-018, RN-026
│  ├─ baralho.ts    baralho, força das cartas, manilha
│  ├─ mesa.ts       assentos, duplas, ordem anti-horária
│  ├─ rodada.ts     vencedor da rodada e da mão
│  ├─ truco.ts      escada e permissões do truco
│  ├─ partida.ts    criarPartida, aplicarAcao, acoesValidas
│  ├─ visao.ts      o que cada assento pode ver (sigilo)
│  ├─ sinais.ts     sinais ao parceiro (RN-027)
│  └─ __tests__/    um bloco de testes por RN
├─ bots/            bots por nível (RF-021) — só enxergam a visão do assento
│  ├─ avaliacao.ts  força da mão, cartas não vistas, probabilidade de carta imbatível
│  ├─ estrategias.ts fácil, médio e difícil
│  ├─ index.ts      decidirBot() com fallback para ação segura
│  ├─ sinais.ts     sinais que o bot faz no início da mão
│  └─ simulador.ts  partidas bot × bot
├─ marcador/        marcador físico: lógica pura (RN-024, RN-025) + hook de armazenamento
├─ servidor/        online: salas, jogo autoritativo com bots e prazos, repositório (memória/Supabase), rotas HTTP
├─ online/          cliente da API, credenciais de assento, hook da sala e lobby
├─ ui/
│  ├─ arte/         PixelArt, cartas, naipes, avatares e rostos dos sinais (arte autoral)
│  ├─ mesa/         Mesa, controle da partida contra bots e narração
│  ├─ armazenamento.ts  perfil, preferências e partida salva no dispositivo
│  └─ sons.ts       slots de som + reserva sintetizada
└─ pages/           Início, Contra bots, Online, Marcador, Histórico, Perfil, Preferências, Regras
api/                funções da Vercel (chamam o bundle api/_lib/servidor.mjs)
supabase/           migração da tabela salas
public/sons/        slots de áudio (veja public/sons/LEIA-ME.md)
```

O motor funciona como um *reducer*: `aplicarAcao(estado, acao)` devolve um novo estado e a lista de eventos, ou um erro de regra sem alterar nada. A interface e os bots só enxergam `visaoDoAssento(estado, assento)`.

## Créditos de arte e som

Arte e sons sintetizados são autorais. Áudios colocados em `public/sons/` devem ter a origem e a licença registradas aqui (RNF-010). Em **Preferências → Testar sons** dá para ouvir cada slot e ver se ele está tocando o seu arquivo ou a reserva.

| Arquivo | Origem | Licença |
|---|---|---|
| | | |

Fontes: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) e [VT323](https://fonts.google.com/specimen/VT323) — SIL Open Font License.
