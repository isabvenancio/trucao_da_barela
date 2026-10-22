# Trucão da Barela — Requisitos

> Análise e Projeto de Software · Prof. Dr. João Choma · Situação: **Proposto**
> **22 requisitos funcionais** e **10 requisitos não funcionais**, com origem, vínculos e plano de verificação.
> Documentos relacionados: [00 — Plano](00-plano-arquitetura-implementacao.md) · [01 — Regras de negócio](01-regras-de-negocio.md) · [03 — Casos de uso](03-casos-de-uso.md)

## Sumário

**Funcionais**

| ID | Requisito | Prioridade | UC |
|---|---|---|---|
| [RF-001](#rf-001---configurar-perfil-de-jogador) | Configurar perfil de jogador | Alta | UC-001 |
| [RF-002](#rf-002---configurar-preferências) | Configurar preferências | Baixa | UC-002 |
| [RF-003](#rf-003---consultar-regras-e-tutorial) | Consultar regras e tutorial | Média | UC-003 |
| [RF-004](#rf-004---iniciar-partida-contra-bots) | Iniciar partida contra bots | Alta | UC-004 |
| [RF-005](#rf-005---criar-sala-online) | Criar sala online | Média | UC-005 |
| [RF-006](#rf-006---entrar-em-sala-online) | Entrar em sala online | Média | UC-006 |
| [RF-007](#rf-007---organizar-duplas-da-sala) | Organizar duplas da sala | Média | UC-007 |
| [RF-008](#rf-008---iniciar-partida-online) | Iniciar partida online | Média | UC-008 |
| [RF-009](#rf-009---distribuir-mão) | Distribuir mão | Alta | UC-009 |
| [RF-010](#rf-010---jogar-carta) | Jogar carta | Alta | UC-010 |
| [RF-011](#rf-011---pedir-truco) | Pedir truco | Alta | UC-011 |
| [RF-012](#rf-012---responder-pedido-de-truco) | Responder pedido de truco | Alta | UC-012 |
| [RF-013](#rf-013---decidir-mão-de-onze) | Decidir mão de onze | Alta | UC-013 |
| [RF-014](#rf-014---sair-da-partida) | Sair da partida | Média | UC-014 |
| [RF-015](#rf-015---reconectar-à-partida-online) | Reconectar à partida online | Média | UC-015 |
| [RF-016](#rf-016---encerrar-partida-e-jogar-revanche) | Encerrar partida e jogar revanche | Baixa | UC-016 |
| [RF-017](#rf-017---iniciar-marcador-de-pontos) | Iniciar marcador de pontos | Média | UC-017 |
| [RF-018](#rf-018---registrar-pontos-no-marcador) | Registrar pontos no marcador | Média | UC-018 |
| [RF-019](#rf-019---desfazer-registro-no-marcador) | Desfazer registro no marcador | Média | UC-019 |
| [RF-020](#rf-020---consultar-histórico-do-marcador) | Consultar histórico do marcador | Baixa | UC-020 |
| [RF-021](#rf-021---controlar-participantes-bot) | Controlar participantes bot | Alta | UC-004, UC-010 a UC-015 |
| [RF-022](#rf-022---apresentar-estado-da-mesa) | Apresentar estado da mesa | Alta | UC-009 a UC-013 |

**Não funcionais**

| ID | Requisito | Prioridade |
|---|---|---|
| [RNF-001](#rnf-001---integridade-das-regras) | Integridade das regras | Alta |
| [RNF-002](#rnf-002---segurança-e-sigilo) | Segurança e sigilo | Alta |
| [RNF-003](#rnf-003---desempenho) | Desempenho | Alta |
| [RNF-004](#rnf-004---usabilidade-e-acessibilidade) | Usabilidade e acessibilidade | Alta |
| [RNF-005](#rnf-005---compatibilidade-e-responsividade) | Compatibilidade e responsividade | Alta |
| [RNF-006](#rnf-006---disponibilidade-e-resiliência) | Disponibilidade e resiliência | Média |
| [RNF-007](#rnf-007---privacidade) | Privacidade | Média |
| [RNF-008](#rnf-008---manutenibilidade-e-testabilidade) | Manutenibilidade e testabilidade | Alta |
| [RNF-009](#rnf-009---implantação-e-custo) | Implantação e custo | Média |
| [RNF-010](#rnf-010---identidade-visual-original) | Identidade visual original | Média |

## Contexto, origem e premissas

O Trucão da Barela é um jogo web de truco paulista para duas duplas, com partidas contra bots, partidas online em salas por código e um marcador de pontos para jogos com baralho físico, com identidade visual em estilo de blocos/pixel art.

**Origem:** proposta do grupo e regras do domínio documentadas em [01-regras-de-negocio.md](01-regras-de-negocio.md). Limites numéricos e escolhas técnicas são propostas da análise; não derivam de entrevistas, aprovação formal de usuários ou testes executados.

**Premissas propostas:** sem conta de usuário; partida contra bots no navegador; partida online validada no servidor (Vercel Functions + Supabase); marcador apenas no dispositivo. Ranking, chat livre, apostas e pagamentos estão fora do escopo.

As fichas funcionais sintetizam o objetivo e apontam o caso de uso que detalha processamento, alternativas, exceções e cenários de aceite. RF-021 e RF-022 são requisitos transversais, sem caso de uso próprio, e descrevem o processamento na própria ficha. Nenhum teste de software é declarado executado.

## Atores, dados e relações

| Ator | Papel e limite |
|---|---|
| Jogador | Pessoa que usa o jogo: configura perfil, joga contra bots, entra em salas online e usa o marcador. Não possui conta. |
| Anfitrião | Jogador que criou a sala online. Organiza assentos, adiciona bots e inicia partidas e revanches. Especialização de Jogador. |
| Serviço de tempo real | Sistema externo secundário (Supabase Realtime) que avisa os navegadores da sala quando o estado muda. Não decide regras. |

| Elemento | Informação e responsabilidade |
|---|---|
| Perfil | Apelido e avatar, guardados no dispositivo (RN-023). |
| Preferências | Som, velocidade das animações/bots, alto contraste; guardadas no dispositivo. |
| Sala | Código, situação (aguardando, em jogo, encerrada), anfitrião, instante de expiração (RN-020). |
| Participante | Ocupante de assento 0–3: humano ou bot (com nível); apelido, avatar, credencial de assento e último sinal de presença. |
| Partida | Duplas, placar, carteador, mão corrente e situação; encerra ao 12 (RN-017). |
| Mão | Cartas de cada participante, vira, manilha, valor vigente, tipo (normal, de onze, de ferro), rodadas e pedido pendente. |
| Rodada | Cartas jogadas (abertas ou encobertas), quem iniciou e resultado (dupla vencedora ou empate). |
| Pedido de truco | Dupla solicitante, valor pedido, respondente e resposta. |
| Evento | Fato ocorrido na mesa (carta jogada, truco pedido, rodada vencida...) usado para apresentar e animar a mesa. |
| Partida do marcador | Nomes das duplas, registros, totais, situação e data (RN-024, RN-025). |
| Registro do marcador | Dupla, valor somado (1, 3, 6, 9 ou 12) e instante. |

**Cardinalidades propostas**

| Relação | Cardinalidade |
|---|---|
| Sala / Participante | Uma sala possui de 1 a 4 participantes humanos e exatamente 4 participantes ao iniciar. |
| Sala / Partida | Uma sala realiza zero ou muitas partidas (revanches); apenas uma em andamento. |
| Partida / Mão | Uma partida possui uma ou muitas mãos; cada mão pertence a uma partida. |
| Mão / Rodada | Uma mão possui de 1 a 3 rodadas (pode terminar antes por correr). |
| Rodada / Carta jogada | Uma rodada possui de 1 a 4 cartas jogadas; cada carta é jogada uma vez por mão. |
| Mão / Pedido de truco | Uma mão possui zero a quatro pedidos (3, 6, 9, 12). |
| Partida do marcador / Registro | Uma partida do marcador possui zero ou muitos registros. |

Estas relações derivam das regras e dos fluxos atuais; o modelo físico proposto está no [plano de arquitetura](00-plano-arquitetura-implementacao.md#7-modelo-de-dados-online).

---

## RF-001 - Configurar perfil de jogador

O sistema deve permitir ao jogador definir apelido e avatar usados nas partidas.

| Campo | Descrição |
|---|---|
| Objetivo | Identificar o jogador na mesa sem exigir conta. |
| Ator / interessado | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Proposta da análise; UC-001. |
| Precondições | Nenhuma. |
| Entradas | Apelido; avatar do catálogo. |
| Processamento | UC-001, Fluxo principal, passos 1–5. |
| Saídas / pós-condições | Perfil salvo no dispositivo e usado em novas partidas e salas. |
| Alternativas / exceções | Fluxos alternativos e exceções de UC-001. |
| Regras relacionadas | RN-023 |
| Casos e testes | UC-001; CT-001.1, CT-001.2 |
| Critérios de aceite | CA-001.1: apelido de 2 a 16 caracteres e avatar do catálogo são salvos e reaparecem ao reabrir o jogo. CA-001.2: apelido inválido não é salvo e o perfil anterior é preservado. |

## RF-002 - Configurar preferências

O sistema deve permitir ajustar som, velocidade das animações e jogadas de bots, e modo de alto contraste.

| Campo | Descrição |
|---|---|
| Objetivo | Adaptar a experiência ao jogador. |
| Ator / interessado | Jogador |
| Prioridade / status | Baixa / Proposto |
| Origem | Proposta da análise; UC-002. |
| Precondições | Nenhuma. |
| Entradas | Som (ligado/desligado, volume); velocidade (lenta, normal, rápida); alto contraste. |
| Processamento | UC-002, Fluxo principal, passos 1–4. |
| Saídas / pós-condições | Preferências aplicadas imediatamente e salvas no dispositivo. |
| Alternativas / exceções | Fluxos de UC-002. |
| Regras relacionadas | — |
| Casos e testes | UC-002; CT-002.1, CT-002.2 |
| Critérios de aceite | CA-002.1: preferências alteradas são aplicadas imediatamente e mantidas ao reabrir. CA-002.2: restaurar padrão retorna todos os valores originais. |

## RF-003 - Consultar regras e tutorial

O sistema deve apresentar as regras do truco paulista adotadas e um tutorial guiado de uma mão.

| Campo | Descrição |
|---|---|
| Objetivo | Ensinar as regras e as variações adotadas. |
| Ator / interessado | Jogador |
| Prioridade / status | Média / Proposto |
| Origem | Proposta da análise; UC-003. |
| Precondições | Nenhuma. |
| Entradas | Seção escolhida; ações do tutorial. |
| Processamento | UC-003, Fluxo principal, passos 1–5. |
| Saídas / pós-condições | Regras apresentadas; tutorial concluído ou abandonado sem efeito sobre partidas. |
| Alternativas / exceções | Fluxos de UC-003. |
| Regras relacionadas | RN-001 a RN-017 (conteúdo apresentado) |
| Casos e testes | UC-003; CT-003.1, CT-003.2 |
| Critérios de aceite | CA-003.1: a tela apresenta hierarquia das cartas, manilha, truco, mão de onze e mão de ferro conforme as RNs. CA-003.2: o tutorial pode ser concluído ou abandonado sem afetar partidas. |

## RF-004 - Iniciar partida contra bots

O sistema deve permitir iniciar uma partida em que o jogador forma dupla com um bot contra dois bots, escolhendo a dificuldade.

| Campo | Descrição |
|---|---|
| Objetivo | Jogar truco sozinho, a qualquer momento. |
| Ator / interessado | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Proposta do grupo; UC-004. |
| Precondições | Jogo carregado no navegador. |
| Entradas | Dificuldade do parceiro; dificuldade dos adversários. |
| Processamento | UC-004, Fluxo principal, passos 1–6 (inclui UC-009). |
| Saídas / pós-condições | Partida em andamento, placar 0×0, primeira mão distribuída. |
| Alternativas / exceções | Fluxos de UC-004. |
| Regras relacionadas | RN-005, RN-019 |
| Casos e testes | UC-004; CT-004.1, CT-004.2 |
| Critérios de aceite | CA-004.1: a partida inicia com o jogador e um bot na mesma dupla contra dois bots, nas dificuldades escolhidas. CA-004.2: a partida contra bots funciona sem conexão depois de o jogo ter sido carregado. |

## RF-005 - Criar sala online

O sistema deve permitir criar uma sala online identificada por código, tornando o criador anfitrião.

| Campo | Descrição |
|---|---|
| Objetivo | Reunir conhecidos em uma partida online. |
| Ator / interessado | Jogador (torna-se Anfitrião) |
| Prioridade / status | Média / Proposto |
| Origem | Proposta do grupo; UC-005. |
| Precondições | Conexão com a internet; perfil configurado ou padrão. |
| Entradas | Perfil do jogador. |
| Processamento | UC-005, Fluxo principal, passos 1–5. |
| Saídas / pós-condições | Sala aguardando, código único, criador no assento 0 como anfitrião. |
| Alternativas / exceções | Fluxos de UC-005. |
| Regras relacionadas | RN-020, RN-023 |
| Casos e testes | UC-005; CT-005.1, CT-005.2 |
| Critérios de aceite | CA-005.1: a sala criada tem código único de 6 caracteres e o criador ocupa um assento como anfitrião. CA-005.2: falha do serviço não gera sala parcial nem exibe código. |

## RF-006 - Entrar em sala online

O sistema deve permitir entrar em uma sala aguardando, informando o código ou abrindo o link de convite.

| Campo | Descrição |
|---|---|
| Objetivo | Ocupar um assento em sala criada por outro jogador. |
| Ator / interessado | Jogador |
| Prioridade / status | Média / Proposto |
| Origem | Proposta do grupo; UC-006. |
| Precondições | Conexão com a internet. |
| Entradas | Código da sala; perfil. |
| Processamento | UC-006, Fluxo principal, passos 1–6. |
| Saídas / pós-condições | Jogador em assento livre; credencial de assento guardada no dispositivo. |
| Alternativas / exceções | Fluxos de UC-006. |
| Regras relacionadas | RN-020, RN-022, RN-023 |
| Casos e testes | UC-006; CT-006.1, CT-006.2, CT-006.3 |
| Critérios de aceite | CA-006.1: código válido de sala aguardando com vaga coloca o jogador em assento livre. CA-006.2: código inexistente, sala cheia, em jogo ou expirada é recusado sem ocupar assento. CA-006.3: apelido repetido na sala recebe sufixo numérico. |

## RF-007 - Organizar duplas da sala

O sistema deve permitir escolher assentos e ao anfitrião adicionar ou remover bots e trocar participantes de assento.

| Campo | Descrição |
|---|---|
| Objetivo | Definir as duplas antes de iniciar. |
| Ator / interessado | Anfitrião; Jogador (escolher o próprio assento) |
| Prioridade / status | Média / Proposto |
| Origem | Proposta do grupo; UC-007. |
| Precondições | Sala aguardando. |
| Entradas | Assento; tipo (bot) e dificuldade. |
| Processamento | UC-007, Fluxo principal, passos 1–5. |
| Saídas / pós-condições | Assentos e duplas atualizados para todos os participantes. |
| Alternativas / exceções | Fluxos de UC-007. |
| Regras relacionadas | RN-005, RN-019, RN-020 |
| Casos e testes | UC-007; CT-007.1, CT-007.2, CT-007.3 |
| Critérios de aceite | CA-007.1: o anfitrião adiciona e remove bots em assentos livres, escolhendo a dificuldade. CA-007.2: trocas de assento atualizam as duplas para todos os participantes. CA-007.3: participante que não é anfitrião não altera o assento de outros. |

## RF-008 - Iniciar partida online

O sistema deve permitir ao anfitrião iniciar a partida quando os 4 assentos estiverem ocupados.

| Campo | Descrição |
|---|---|
| Objetivo | Começar a partida online. |
| Ator / interessado | Anfitrião; Serviço de tempo real |
| Prioridade / status | Média / Proposto |
| Origem | Proposta do grupo; UC-008. |
| Precondições | Sala aguardando com 4 assentos ocupados. |
| Entradas | Comando de início. |
| Processamento | UC-008, Fluxo principal, passos 1–5 (inclui UC-009). |
| Saídas / pós-condições | Sala em jogo; partida 0×0; primeira mão distribuída a todos. |
| Alternativas / exceções | Fluxos de UC-008. |
| Regras relacionadas | RN-005, RN-020 |
| Casos e testes | UC-008; CT-008.1, CT-008.2 |
| Critérios de aceite | CA-008.1: somente o anfitrião, com 4 assentos ocupados, inicia a partida. CA-008.2: ao iniciar, todos os participantes recebem a primeira mão. |

## RF-009 - Distribuir mão

O sistema deve embaralhar, distribuir 3 cartas a cada participante, virar a vira e definir a manilha a cada mão.

| Campo | Descrição |
|---|---|
| Objetivo | Preparar cada mão conforme as regras. |
| Ator / interessado | Sistema (incluído por UC-004, UC-008, UC-016) |
| Prioridade / status | Alta / Proposto |
| Origem | Regras do domínio; UC-009. |
| Precondições | Partida em andamento sem dupla com 12. |
| Entradas | Placar; carteador anterior. |
| Processamento | UC-009, Fluxo principal, passos 1–6. |
| Saídas / pós-condições | Mão pronta com cartas, vira, manilha, valor e tipo definidos. |
| Alternativas / exceções | Mão de onze e mão de ferro (UC-009 A1, A2). |
| Regras relacionadas | RN-001, RN-003, RN-006, RN-015, RN-016, RN-018 |
| Casos e testes | UC-009; CT-009.1, CT-009.2, CT-009.3 |
| Critérios de aceite | CA-009.1: cada participante recebe 3 cartas distintas e a vira define a manilha. CA-009.2: o carteador gira a cada mão. CA-009.3: placar com 11 aciona mão de onze ou mão de ferro. |

## RF-010 - Jogar carta

O sistema deve permitir ao participante da vez jogar uma carta, aberta ou encoberta, e calcular vencedores de rodada, mão e partida.

| Campo | Descrição |
|---|---|
| Objetivo | Disputar as rodadas da mão. |
| Ator / interessado | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Regras do domínio; UC-010. |
| Precondições | Partida em andamento; vez do jogador; sem decisão pendente. |
| Entradas | Carta; indicação de encoberta. |
| Processamento | UC-010, Fluxo principal, passos 1–8. |
| Saídas / pós-condições | Carta registrada na rodada; resultados e placar atualizados. |
| Alternativas / exceções | Fluxos de UC-010. |
| Regras relacionadas | RN-002 a RN-004, RN-007 a RN-011, RN-016, RN-017, RN-021 |
| Casos e testes | UC-010; CT-010.1, CT-010.2, CT-010.3 |
| Critérios de aceite | CA-010.1: somente jogada válida do participante da vez é aceita. CA-010.2: os vencedores da rodada e da mão são calculados conforme RN-009 e RN-010. CA-010.3: carta encoberta só é aceita a partir da 2ª rodada e não tem valor. |

## RF-011 - Pedir truco

O sistema deve permitir ao participante da vez pedir truco ou o próximo valor da escada.

| Campo | Descrição |
|---|---|
| Objetivo | Aumentar o valor da mão. |
| Ator / interessado | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Regras do domínio; UC-011. |
| Precondições | Vez do jogador, antes da jogada; mão normal. |
| Entradas | Comando de pedido. |
| Processamento | UC-011, Fluxo principal, passos 1–5. |
| Saídas / pós-condições | Pedido pendente aguardando resposta (UC-012). |
| Alternativas / exceções | Fluxos de UC-011. |
| Regras relacionadas | RN-008, RN-012, RN-013 |
| Casos e testes | UC-011; CT-011.1, CT-011.2 |
| Critérios de aceite | CA-011.1: o pedido só é aceito na vez, antes da jogada, pela dupla com direito a pedir. CA-011.2: o pedido é bloqueado na mão de onze, na mão de ferro e com valor 12. |

## RF-012 - Responder pedido de truco

O sistema deve permitir ao respondente aceitar, correr ou aumentar um pedido de truco.

| Campo | Descrição |
|---|---|
| Objetivo | Decidir sobre o aumento proposto. |
| Ator / interessado | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Regras do domínio; UC-012. |
| Precondições | Pedido pendente dirigido ao jogador. |
| Entradas | Aceitar, correr ou aumentar. |
| Processamento | UC-012, Fluxo principal, passos 1–5. |
| Saídas / pós-condições | Valor elevado, mão encerrada ou novo pedido para a outra dupla. |
| Alternativas / exceções | Fluxos de UC-012. |
| Regras relacionadas | RN-012, RN-014, RN-017, RN-021 |
| Casos e testes | UC-012; CT-012.1, CT-012.2, CT-012.3 |
| Critérios de aceite | CA-012.1: aceitar eleva o valor da mão ao valor pedido. CA-012.2: correr encerra a mão e dá ao solicitante o valor anterior ao pedido. CA-012.3: aumentar gera novo pedido dirigido à outra dupla. |

## RF-013 - Decidir mão de onze

O sistema deve permitir à dupla com 11 pontos ver as cartas do parceiro e decidir jogar ou correr.

| Campo | Descrição |
|---|---|
| Objetivo | Aplicar a mão de onze. |
| Ator / interessado | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Regras do domínio; UC-013. |
| Precondições | Apenas a dupla do jogador tem 11; mão distribuída. |
| Entradas | Jogar ou correr. |
| Processamento | UC-013, Fluxo principal, passos 1–5. |
| Saídas / pós-condições | Mão valendo 3 sem truco, ou adversária +1 e mão encerrada. |
| Alternativas / exceções | Fluxos de UC-013. |
| Regras relacionadas | RN-015, RN-017, RN-018, RN-021 |
| Casos e testes | UC-013; CT-013.1, CT-013.2 |
| Critérios de aceite | CA-013.1: a dupla com 11 vê as 6 cartas antes de decidir. CA-013.2: jogar faz a mão valer 3 sem truco; correr dá 1 ponto à adversária. |

## RF-014 - Sair da partida

O sistema deve permitir sair da partida, encerrando-a (contra bots) ou passando o assento a um bot (online).

| Campo | Descrição |
|---|---|
| Objetivo | Deixar a mesa sem travar os demais. |
| Ator / interessado | Jogador |
| Prioridade / status | Média / Proposto |
| Origem | Proposta da análise; UC-014. |
| Precondições | Partida em andamento ou sala aguardando. |
| Entradas | Confirmação de saída. |
| Processamento | UC-014, Fluxo principal, passos 1–5. |
| Saídas / pós-condições | Jogador fora da mesa; bot no assento online. |
| Alternativas / exceções | Fluxos de UC-014. |
| Regras relacionadas | RN-022 |
| Casos e testes | UC-014; CT-014.1, CT-014.2 |
| Critérios de aceite | CA-014.1: contra bots, sair pede confirmação e encerra sem registrar resultado. CA-014.2: online, um bot assume o assento e a partida continua para os demais. |

## RF-015 - Reconectar à partida online

O sistema deve devolver ao jogador o mesmo assento ao voltar à sala com a credencial guardada.

| Campo | Descrição |
|---|---|
| Objetivo | Retomar a partida após queda de conexão ou fechamento da página. |
| Ator / interessado | Jogador |
| Prioridade / status | Média / Proposto |
| Origem | Proposta da análise; UC-015. |
| Precondições | Credencial de assento guardada no dispositivo; partida da sala em andamento. |
| Entradas | Código da sala; credencial de assento. |
| Processamento | UC-015, Fluxo principal, passos 1–5. |
| Saídas / pós-condições | Jogador controla novamente o assento a partir da próxima decisão. |
| Alternativas / exceções | Fluxos de UC-015. |
| Regras relacionadas | RN-020, RN-022 |
| Casos e testes | UC-015; CT-015.1, CT-015.2 |
| Critérios de aceite | CA-015.1: credencial válida devolve o mesmo assento e as cartas atuais. CA-015.2: credencial inválida ou partida encerrada não concede assento. |

## RF-016 - Encerrar partida e jogar revanche

O sistema deve apresentar o resultado ao fim da partida e permitir revanche com as mesmas duplas.

| Campo | Descrição |
|---|---|
| Objetivo | Concluir a partida e continuar jogando. |
| Ator / interessado | Jogador; Anfitrião (online) |
| Prioridade / status | Baixa / Proposto |
| Origem | Proposta do grupo; UC-016. |
| Precondições | Uma dupla alcançou 12 pontos. |
| Entradas | Revanche ou voltar ao início. |
| Processamento | UC-016, Fluxo principal, passos 1–5 (inclui UC-009). |
| Saídas / pós-condições | Resultado apresentado; nova partida 0×0 se houver revanche. |
| Alternativas / exceções | Fluxos de UC-016. |
| Regras relacionadas | RN-006, RN-017, RN-026 |
| Casos e testes | UC-016; CT-016.1, CT-016.2 |
| Critérios de aceite | CA-016.1: a tela final apresenta a dupla vencedora e o placar. CA-016.2: a revanche mantém as duplas e zera o placar; online, só o anfitrião a inicia. |

## RF-017 - Iniciar marcador de pontos

O sistema deve permitir iniciar uma contagem de pontos para partida com baralho físico, nomeando as duplas.

| Campo | Descrição |
|---|---|
| Objetivo | Marcar pontos de partidas jogadas fora do app. |
| Ator / interessado | Jogador |
| Prioridade / status | Média / Proposto |
| Origem | Proposta do grupo; UC-017. |
| Precondições | Nenhuma. |
| Entradas | Nomes das duplas (opcionais). |
| Processamento | UC-017, Fluxo principal, passos 1–4. |
| Saídas / pós-condições | Marcador 0×0 salvo no dispositivo. |
| Alternativas / exceções | Fluxos de UC-017. |
| Regras relacionadas | RN-024, RN-025 |
| Casos e testes | UC-017; CT-017.1, CT-017.2 |
| Critérios de aceite | CA-017.1: o marcador inicia 0×0 com os nomes padrão ou informados. CA-017.2: marcador em andamento é retomado ao reabrir o jogo. |

## RF-018 - Registrar pontos no marcador

O sistema deve permitir somar 1, 3, 6, 9 ou 12 pontos a uma dupla do marcador.

| Campo | Descrição |
|---|---|
| Objetivo | Registrar o resultado de cada mão física. |
| Ator / interessado | Jogador |
| Prioridade / status | Média / Proposto |
| Origem | Proposta do grupo; UC-018. |
| Precondições | Marcador em andamento. |
| Entradas | Dupla; valor. |
| Processamento | UC-018, Fluxo principal, passos 1–5. |
| Saídas / pós-condições | Registro adicionado e total atualizado; vitória declarada ao 12. |
| Alternativas / exceções | Fluxos de UC-018. |
| Regras relacionadas | RN-024 |
| Casos e testes | UC-018; CT-018.1, CT-018.2 |
| Critérios de aceite | CA-018.1: os valores permitidos somam ao total da dupla escolhida. CA-018.2: ao alcançar 11 o marcador avisa a mão de onze; ao alcançar 12 ou mais declara a vencedora e bloqueia novos registros. |

## RF-019 - Desfazer registro no marcador

O sistema deve permitir desfazer o último registro do marcador.

| Campo | Descrição |
|---|---|
| Objetivo | Corrigir registro feito por engano. |
| Ator / interessado | Jogador |
| Prioridade / status | Média / Proposto |
| Origem | Proposta da análise; UC-019. |
| Precondições | Marcador com pelo menos um registro. |
| Entradas | Comando desfazer. |
| Processamento | UC-019, Fluxo principal, passos 1–4. |
| Saídas / pós-condições | Último registro removido; totais recalculados. |
| Alternativas / exceções | Fluxos de UC-019. |
| Regras relacionadas | RN-024 |
| Casos e testes | UC-019; CT-019.1, CT-019.2 |
| Critérios de aceite | CA-019.1: desfazer remove somente o último registro, inclusive reabrindo partida encerrada. CA-019.2: sem registros, desfazer fica indisponível. |

## RF-020 - Consultar histórico do marcador

O sistema deve listar as partidas encerradas no marcador e permitir apagar o histórico.

| Campo | Descrição |
|---|---|
| Objetivo | Rever resultados anteriores. |
| Ator / interessado | Jogador |
| Prioridade / status | Baixa / Proposto |
| Origem | Proposta da análise; UC-020. |
| Precondições | Nenhuma. |
| Entradas | Seleção de partida; comando apagar. |
| Processamento | UC-020, Fluxo principal, passos 1–4. |
| Saídas / pós-condições | Lista apresentada; histórico apagado se confirmado. |
| Alternativas / exceções | Fluxos de UC-020. |
| Regras relacionadas | RN-025 |
| Casos e testes | UC-020; CT-020.1, CT-020.2 |
| Critérios de aceite | CA-020.1: o histórico lista até 50 partidas encerradas, mais recentes primeiro, com data, nomes e placar. CA-020.2: apagar o histórico pede confirmação e remove tudo do dispositivo. |

## RF-021 - Controlar participantes bot

O sistema deve decidir as ações dos participantes bot — jogar carta, pedir e responder truco e decidir mão de onze — conforme o nível de dificuldade, e assumir assentos de humanos quando previsto.

| Campo | Descrição |
|---|---|
| Objetivo | Permitir partidas com menos de 4 humanos e evitar partidas travadas. |
| Ator / interessado | Sistema; Jogador; Anfitrião |
| Prioridade / status | Alta / Proposto |
| Origem | Proposta do grupo (jogar com bots); RN-019, RN-021, RN-022. |
| Precondições | Vez ou decisão pendente de um assento controlado por bot. |
| Entradas | Visão do assento (RN-018); nível; ações válidas. |
| Processamento | 1. O sistema identifica que a decisão corrente pertence a um bot ou a um humano com prazo expirado/desconectado. 2. O sistema obtém a visão do assento e a lista de ações válidas. 3. A estratégia do nível escolhe uma ação válida. 4. O sistema aplica a ação pelas mesmas validações dos humanos (UC-010 a UC-013). 5. O sistema registra o evento indicando ação de bot e o apresenta com o ritmo das preferências. |
| Saídas / pós-condições | Ação válida aplicada; partida prossegue. |
| Alternativas / exceções | Se a estratégia devolver ação inválida, aplica-se a primeira ação válida (carta de menor força aberta, ou correr) e o erro é registrado para correção. |
| Regras relacionadas | RN-018, RN-019, RN-021, RN-022 |
| Casos e testes | UC-004, UC-010 a UC-015; CT-021.1, CT-021.2, CT-021.3 |
| Critérios de aceite | CA-021.1: a decisão do bot recebe somente a visão do seu assento. CA-021.2: em 1.000 partidas simuladas, bots difíceis vencem bots fáceis em pelo menos 60% e nenhuma ação inválida é aplicada. CA-021.3: o bot assume a decisão de humano com prazo expirado ou desconectado e devolve o controle na reconexão. |
| Cenários de teste | CT-021.1: chamar a decisão do bot do assento 1 e inspecionar a entrada; esperado: sem cartas dos assentos 0, 2 e 3. CT-021.2: simular 1.000 partidas Difícil × Fácil com sementes fixas; esperado: taxa ≥ 60% e zero ações inválidas. CT-021.3: expirar o prazo de jogada do assento 2 online; esperado: jogada válida automática e controle humano mantido na decisão seguinte. |

## RF-022 - Apresentar estado da mesa

O sistema deve apresentar a cada participante a mesa a partir do seu assento: suas cartas, vira, manilha, cartas abertas, placar, valor da mão, participante da vez, prazo e eventos recentes.

| Campo | Descrição |
|---|---|
| Objetivo | Permitir que o jogador entenda a situação e decida. |
| Ator / interessado | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Proposta da análise; RN-018. |
| Precondições | Partida em andamento. |
| Entradas | Estado da partida; assento do jogador. |
| Processamento | 1. O sistema gera a visão do assento aplicando RN-018. 2. O sistema posiciona o jogador embaixo e o parceiro à frente. 3. O sistema destaca a vira, as manilhas na mão do jogador, o participante da vez e o valor vigente. 4. O sistema apresenta os eventos em sequência (animação e texto). 5. O sistema habilita somente as ações válidas para o jogador. |
| Saídas / pós-condições | Mesa atualizada após cada evento. |
| Alternativas / exceções | Online, se a visão não puder ser obtida, a mesa indica “reconectando” e mantém a última visão (UC-015). |
| Regras relacionadas | RN-003, RN-018 |
| Casos e testes | UC-009 a UC-013; CT-022.1, CT-022.2 |
| Critérios de aceite | CA-022.1: a mesa apresenta placar, valor da mão, vira, manilha, participante da vez e cartas abertas. CA-022.2: cada evento (truco, vencedor da rodada, fim da mão) é anunciado visualmente e em texto acessível. |
| Cenários de teste | CT-022.1: com vira 6 e um 7 na mão do jogador; esperado: 7 destacado como manilha e “Manilha: 7” visível. CT-022.2: pedido de truco do adversário; esperado: anúncio visual e região de leitura de tela com “Truco! Valendo 3”. |

---

## RNF-001 - Integridade das regras

Todas as regras de jogo devem ser aplicadas por **um único motor de regras**. Online, o **servidor** é a autoridade: valida cada ação com o motor antes de gravar e recusa ações fora de vez, duplicadas ou concorrentes (controle de versão).

| Campo | Descrição |
|---|---|
| Justificativa | Evita divergência entre modos de jogo e trapaça por manipulação do navegador. |
| Escopo | UC-004, UC-008 a UC-016; RF-021 |
| Prioridade / status | Alta / Proposto |
| Origem | Decisão de qualidade proposta para a análise. |
| Rastreabilidade | RF-004, RF-008 a RF-016, RF-021; RN-001 a RN-018 |
| Verificação | VN-RNF-001 — Não executada: depende de implementação. **Método:** testes de integração enviando ações forjadas e simultâneas para `/api/partidas/acao`. **Aprovação:** 100% das ações inválidas recusadas sem alterar o estado; duas ações simultâneas para a mesma versão resultam em exatamente uma gravação. |

## RNF-002 - Segurança e sigilo

O navegador de cada participante deve receber **somente a visão do seu assento**; o estado completo e a semente do embaralhamento nunca saem do servidor. Credenciais de assento são aleatórias (≥ 128 bits), guardadas como hash e transmitidas apenas por HTTPS. As tabelas não são acessíveis diretamente pelo navegador.

| Campo | Descrição |
|---|---|
| Justificativa | Sem sigilo das cartas o jogo online perde sentido (RN-018). |
| Escopo | UC-005 a UC-016 (online) |
| Prioridade / status | Alta / Proposto |
| Origem | Decisão de qualidade proposta; derivada de RN-018. |
| Rastreabilidade | RF-005 a RF-015, RF-022; RN-018, RN-022 |
| Verificação | VN-RNF-002 — Não executada. **Método:** inspeção das respostas da API e do canal em tempo real com ferramenta de rede; tentativa de leitura direta das tabelas com a chave pública. **Aprovação:** nenhuma resposta contém cartas de outro assento ou encobertas; leitura direta recusada; token inválido recebe recusa. |

## RNF-003 - Desempenho

| Métrica | Meta proposta |
|---|---|
| Carregamento inicial (4G, celular intermediário) | ≤ 3 s até a tela inicial interativa |
| Ação online até atualização nos outros navegadores | ≤ 1 s no percentil 95 |
| Decisão de um bot | ≤ 300 ms |
| Animações da mesa | sem travamentos perceptíveis (≥ 50 quadros/s em desktop) |
| Tamanho do pacote inicial | ≤ 500 KB comprimido, sem contar arte carregada sob demanda |

| Campo | Descrição |
|---|---|
| Justificativa | Truco é um jogo rápido; demora quebra o ritmo das apostas. |
| Escopo | Todos os UCs de mesa e online |
| Prioridade / status | Alta / Proposto |
| Origem | Decisão de qualidade proposta. |
| Rastreabilidade | RF-004, RF-008 a RF-013, RF-021, RF-022 |
| Verificação | VN-RNF-003 — Não executada. **Método:** Lighthouse em perfil móvel; medição de 100 ações online com marcação de tempo; benchmark do bot. **Aprovação:** todas as metas da tabela atingidas. |

## RNF-004 - Usabilidade e acessibilidade

A mesa deve indicar claramente a vez, o valor da mão e a manilha; botões de ação devem ter área de toque mínima de 44×44 px; o contraste deve atender WCAG 2.1 AA (modo normal e alto contraste); cartas e avatares devem ter texto alternativo; ações principais devem funcionar por teclado; eventos devem ser anunciados em região acessível a leitores de tela. Um jogador iniciante deve concluir o tutorial em até 5 minutos.

| Campo | Descrição |
|---|---|
| Justificativa | A estética pixel art não pode prejudicar legibilidade. |
| Escopo | UC-001 a UC-020 |
| Prioridade / status | Alta / Proposto |
| Origem | Decisão de qualidade proposta. |
| Rastreabilidade | RF-001 a RF-022 |
| Verificação | VN-RNF-004 — Não executada. **Método:** auditoria com axe/Lighthouse; navegação só por teclado; teste com 5 pessoas fazendo o tutorial. **Aprovação:** zero violações graves; 4 de 5 concluem o tutorial em até 5 min. |

## RNF-005 - Compatibilidade e responsividade

O jogo deve funcionar nas duas últimas versões de Chrome, Edge, Firefox e Safari (desktop e móvel), em telas a partir de 360 px de largura, nas orientações retrato e paisagem.

| Campo | Descrição |
|---|---|
| Justificativa | Truco é jogado com amigos, frequentemente pelo celular. |
| Escopo | Todos os UCs |
| Prioridade / status | Alta / Proposto |
| Origem | Decisão de qualidade proposta. |
| Rastreabilidade | RF-001 a RF-022 |
| Verificação | VN-RNF-005 — Não executada. **Método:** testes e2e (Playwright) em Chromium, Firefox e WebKit em 360×640 e 1366×768. **Aprovação:** partida completa contra bots e uso do marcador sem rolagem horizontal ou elemento cortado. |

## RNF-006 - Disponibilidade e resiliência

Partida contra bots, marcador, regras e preferências devem funcionar **sem conexão** depois do primeiro carregamento. Online, perda de conexão deve ser indicada em até 5 s e a reconexão deve recuperar o estado automaticamente (RN-022).

| Campo | Descrição |
|---|---|
| Justificativa | Jogo físico e contra bots não devem depender de internet; quedas são comuns no celular. |
| Escopo | UC-001 a UC-004, UC-009 a UC-020 |
| Prioridade / status | Média / Proposto |
| Origem | Decisão de qualidade proposta. |
| Rastreabilidade | RF-004, RF-014, RF-015, RF-017 a RF-020 |
| Verificação | VN-RNF-006 — Não executada. **Método:** modo avião após carregar; corte de rede durante partida online. **Aprovação:** funções offline operam; aviso em ≤ 5 s; estado recuperado ao voltar a rede. |

## RNF-007 - Privacidade

O sistema não deve coletar e-mail, telefone, nome real ou localização. Perfil, preferências e marcador ficam apenas no dispositivo. Dados de salas online (apelidos, avatares, estado) devem ser apagados até **24 h** após o encerramento ou expiração da sala. Não são usados rastreadores de terceiros.

| Campo | Descrição |
|---|---|
| Justificativa | Minimização de dados (LGPD); não há necessidade de identificação real. |
| Escopo | UC-001, UC-005, UC-006, UC-017 a UC-020 |
| Prioridade / status | Média / Proposto |
| Origem | Decisão de qualidade proposta; derivada de RN-023 e RN-025. |
| Rastreabilidade | RF-001, RF-005, RF-006, RF-017 a RF-020; RN-023, RN-025 |
| Verificação | VN-RNF-007 — Não executada. **Método:** inspeção do esquema do banco, das requisições de rede e da rotina de limpeza. **Aprovação:** nenhum campo de dado pessoal além de apelido/avatar; salas encerradas há mais de 24 h inexistentes no banco. |

## RNF-008 - Manutenibilidade e testabilidade

O motor de regras e os bots devem ser módulos TypeScript **puros** (sem React nem rede), com embaralhamento por semente. Cada RN de jogo deve ter ao menos um teste automatizado identificado pelo seu ID. Cobertura mínima de 90% das linhas do motor; CI executando lint e testes em todo pull request.

| Campo | Descrição |
|---|---|
| Justificativa | Regras de truco têm muitos casos de borda; testes por RN mantêm a rastreabilidade até o código. |
| Escopo | `src/engine`, `src/bots`, `api/` |
| Prioridade / status | Alta / Proposto |
| Origem | Decisão de qualidade proposta. |
| Rastreabilidade | RN-001 a RN-019, RN-024; RF-009 a RF-013, RF-021 |
| Verificação | VN-RNF-008 — Não executada. **Método:** relatório de cobertura do Vitest; busca dos IDs RN nos nomes dos testes. **Aprovação:** cobertura ≥ 90%; todas as RNs de jogo com teste; CI verde no branch principal. |

## RNF-009 - Implantação e custo

O front-end e as funções devem ser implantados na **Vercel**, e banco e tempo real no **Supabase**, ambos no plano gratuito, sem servidor dedicado. Configurações sensíveis ficam em variáveis de ambiente, nunca no repositório. Cada pull request gera um ambiente de pré-visualização.

| Campo | Descrição |
|---|---|
| Justificativa | Projeto acadêmico sem orçamento e com backend simples. |
| Escopo | Todo o sistema |
| Prioridade / status | Média / Proposto |
| Origem | Proposta do grupo (hospedagem na Vercel). |
| Rastreabilidade | RF-005 a RF-016 |
| Verificação | VN-RNF-009 — Não executada. **Método:** inspeção da configuração de implantação e do repositório. **Aprovação:** deploy automático a partir do branch principal; nenhuma chave no histórico do Git. |

## RNF-010 - Identidade visual original

A ambientação, as cartas, os naipes e os avatares devem seguir um estilo de **blocos/pixel art criado pela equipe**. Não devem ser usados logotipos, nomes comerciais, personagens ou artes de jogos e produtos de terceiros. Fontes, sons e imagens externas devem ter licença que permita o uso, registrada no README.

| Campo | Descrição |
|---|---|
| Justificativa | Respeitar propriedade intelectual em um projeto público hospedado na internet. |
| Escopo | UC-001, UC-003, UC-004, UC-009, UC-010 |
| Prioridade / status | Média / Proposto |
| Origem | Decisão de qualidade proposta. |
| Rastreabilidade | RF-001, RF-003, RF-022 |
| Verificação | VN-RNF-010 — Não executada. **Método:** revisão da pasta `src/assets` e da seção de créditos do README. **Aprovação:** todo arquivo de arte é autoral ou tem licença registrada; nenhum elemento de marca de terceiros. |

---

## Referências e critérios da disciplina

- CHOMA, J. *Regras de Negócio e Requisitos* e *Refinamento de requisitos* — Análise e Projeto de Software, UEM/DIN.
- W3C. *Web Content Accessibility Guidelines (WCAG) 2.1*.
- Lei nº 13.709/2018 (LGPD) — princípio da necessidade/minimização.
