# Trucão da Barela

Jogo web de **truco paulista** para duas duplas: partidas contra bots, partidas online por código de sala e marcador de pontos para jogar com baralho físico — com visual em estilo de blocos/pixel art.

## Disciplina

Análise e Projeto de Software — Prof. Dr. João Choma — UEM/DIN

## Equipe

| Aluno | RA |
|---|---|
| _a preencher_ | |

## Documentação

| Documento | Conteúdo |
|---|---|
| [Plano de arquitetura e implementação](docs/plano-arquitetura-implementacao.md) | Stack, arquitetura, modelo de dados, API, sons e fases |
| [Regras de negócio](docs/regras-de-negocio.md) | 26 regras (RN-001 a RN-026) |
| [Requisitos](docs/requisitos.md) | 22 RF e 10 RNF |
| [Casos de uso](docs/casos-de-uso.md) | 20 UCs com CA/CT, checklist e matriz de rastreabilidade |

## Como rodar

Requer Node 20 ou superior.

```bash
npm install
npm run dev        # abre em http://localhost:5173
npm test           # testes do motor de regras
npm run coverage   # testes + cobertura (mínimo de 90% no motor)
npm run build      # build de produção (o que a Vercel executa)
```

## Andamento

| Fase | Situação |
|---|---|
| 0. Documentação | Concluída |
| 1. Base do projeto (Vite, React, TS, ESLint, Vitest, CI, Vercel) | Concluída |
| 2. Motor de regras (`src/engine`) | Concluída — 86 testes, 100% das linhas |
| 3. Bots | Próxima |
| 4. Mesa contra bots + arte | — |
| 5. Marcador | — |
| 6. Online (Supabase + `/api`) | — |
| 7. Polimento | — |

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
│  └─ __tests__/    um bloco de testes por RN
├─ bots/            fase 3
├─ ui/              componentes e tema
└─ pages/           telas
public/sons/        slots de áudio (veja public/sons/LEIA-ME.md)
```

O motor funciona como um *reducer*: `aplicarAcao(estado, acao)` devolve um novo estado e a lista de eventos, ou um erro de regra sem alterar nada. A interface e os bots só enxergam `visaoDoAssento(estado, assento)`.

## Créditos de arte e som

Arte e sons sintetizados são autorais. Áudios colocados em `public/sons/` devem ter a origem e a licença registradas aqui (RNF-010).

| Arquivo | Origem | Licença |
|---|---|---|
| | | |

Fontes: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) e [VT323](https://fonts.google.com/specimen/VT323) — SIL Open Font License.
