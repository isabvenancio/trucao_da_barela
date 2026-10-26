# Trucão da Barela — Regras de negócio

> Análise e Projeto de Software · Prof. Dr. João Choma · Situação: **Proposto**
> **27 regras de negócio**, com condição, dados, exceções, justificativa, tipo, interessados e vínculos aos requisitos e casos de uso.
> Documentos relacionados: [00 — Plano](plano-arquitetura-implementacao.md) · [02 — Requisitos](requisitos.md) · [03 — Casos de uso](casos-de-uso.md)

## Sumário

| ID | Regra | Tipo |
|---|---|---|
| [RN-001](#rn-001---composição-do-baralho) | Composição do baralho | Integridade |
| [RN-002](#rn-002---força-das-cartas-comuns) | Força das cartas comuns | Cálculo |
| [RN-003](#rn-003---vira-e-definição-da-manilha) | Vira e definição da manilha | Cálculo / derivação |
| [RN-004](#rn-004---ordem-das-manilhas-por-naipe) | Ordem das manilhas por naipe | Cálculo |
| [RN-005](#rn-005---duplas-e-assentos) | Duplas e assentos | Integridade |
| [RN-006](#rn-006---distribuição-e-rodízio-do-carteador) | Distribuição e rodízio do carteador | Workflow |
| [RN-007](#rn-007---ordem-de-jogo-nas-rodadas) | Ordem de jogo nas rodadas | Workflow / parametrizável |
| [RN-008](#rn-008---jogada-válida) | Jogada válida | Proteção do negócio |
| [RN-009](#rn-009---vencedor-da-rodada) | Vencedor da rodada | Decisão |
| [RN-010](#rn-010---vencedor-da-mão) | Vencedor da mão | Decisão |
| [RN-011](#rn-011---carta-encoberta) | Carta encoberta | Restrição |
| [RN-012](#rn-012---valor-da-mão-e-escada-do-truco) | Valor da mão e escada do truco | Cálculo / parametrizável |
| [RN-013](#rn-013---pedido-de-truco) | Pedido de truco | Restrição / workflow |
| [RN-014](#rn-014---resposta-ao-pedido-de-truco) | Resposta ao pedido de truco | Decisão / parametrizável |
| [RN-015](#rn-015---mão-de-onze) | Mão de onze | Decisão |
| [RN-016](#rn-016---mão-de-ferro) | Mão de ferro | Decisão |
| [RN-017](#rn-017---pontuação-e-vitória-da-partida) | Pontuação e vitória da partida | Evento |
| [RN-018](#rn-018---sigilo-das-cartas) | Sigilo das cartas | Proteção do negócio |
| [RN-019](#rn-019---bots-sem-informação-privilegiada) | Bots sem informação privilegiada | Integridade / proteção |
| [RN-020](#rn-020---formação-e-início-da-sala-online) | Formação e início da sala online | Integridade / workflow |
| [RN-021](#rn-021---prazo-de-decisão-online) | Prazo de decisão online | Evento / parametrizável |
| [RN-022](#rn-022---saída-e-reconexão-de-participantes) | Saída e reconexão de participantes | Evento |
| [RN-023](#rn-023---identificação-do-jogador) | Identificação do jogador | Integridade |
| [RN-024](#rn-024---pontuação-no-marcador-físico) | Pontuação no marcador físico | Cálculo / workflow |
| [RN-025](#rn-025---histórico-local-do-marcador) | Histórico local do marcador | Privacidade |
| [RN-026](#rn-026---revanche) | Revanche | Workflow |
| [RN-027](#rn-027---sinais-ao-parceiro) | Sinais ao parceiro | Restrição / proteção do negócio |

## Contexto, origem e premissas

O Trucão da Barela é um jogo web de truco paulista para duas duplas, com partidas contra bots, partidas online em salas e um marcador de pontos para jogos com baralho físico. Perfil do jogador, salas, participantes, partidas, mãos, rodadas, pedidos de truco, bots e registros do marcador formam o escopo.

**Origem:** proposta do grupo para a disciplina e regras tradicionais do truco paulista praticadas no Brasil. Onde existem variações regionais, a variação adotada é declarada como **proposta da análise** e marcada como parametrizável. As regras não são atribuídas a entrevistas, aprovação formal de usuários ou testes executados.

**Premissas propostas:** sem cadastro de conta (identificação por apelido e avatar); partida contra bots executada no navegador; partida online validada no servidor; marcador salvo apenas no dispositivo; apostas, pagamentos, ranking e chat livre fora do escopo. Números como 30 segundos, 60 segundos e 16 caracteres são restrições propostas.

**Glossário**

| Termo | Significado |
|---|---|
| Partida | Disputa entre as duas duplas até uma delas alcançar 12 pontos |
| Mão | Cada distribuição de 3 cartas por participante; vale 1 ponto, ou mais se houver truco |
| Rodada | Cada uma das até 3 jogadas da mão, em que cada participante joga uma carta |
| Vira | Carta virada após a distribuição que define a manilha |
| Manilha | As 4 cartas de valor imediatamente acima da vira; superam todas as outras |
| Carteador | Participante que embaralha e distribui a mão |
| Mão (jogador) / pé | “Mão” é o primeiro a jogar, à direita do carteador; “pé” é o carteador, último a jogar |
| Correr | Desistir da mão diante de um pedido de truco ou na mão de onze |
| Participante | Ocupante de um assento: jogador humano ou bot |

Os identificadores RN, RF, RNF, UC, CA e CT são mantidos nos três documentos. CA representa critério de aceite; CT é cenário de teste proposto. A tipologia segue a classificação apresentada em aula (integridade, cálculo, decisão, workflow, evento, parametrizável, proteção, legal). As prioridades são propostas de planejamento da equipe.

---

## RN-001 - Composição do baralho

O jogo usa um baralho de **40 cartas**: valores A, 2, 3, 4, 5, 6, 7, Q, J e K nos naipes Ouros, Espadas, Copas e Paus. Não há 8, 9, 10 nem coringas.

| Campo | Descrição |
|---|---|
| Condição | Ao montar e embaralhar o baralho de cada mão. |
| Dados envolvidos | Baralho; carta (valor, naipe). |
| Exceções / alternativas | Nenhuma. Cartas fora do conjunto não podem existir no baralho. |
| Justificativa | O truco paulista é jogado com baralho “sujo” de 40 cartas; outras cartas alteram probabilidades e a hierarquia. |
| Tipo | Integridade |
| Interessados | Jogador, Equipe de desenvolvimento |
| Prioridade / status | Alta / Proposto |
| Origem | Regras tradicionais do truco paulista. |
| Requisitos e casos | RF-009; UC-009 |
| Verificação proposta | Gerar o baralho e conferir 40 cartas distintas, 10 por naipe, nenhuma de valor 8, 9 ou 10. |

## RN-002 - Força das cartas comuns

Fora as manilhas, a força das cartas, da menor para a maior, é: **4 < 5 < 6 < 7 < Q < J < K < A < 2 < 3**. Entre cartas comuns, o naipe não altera a força.

| Campo | Descrição |
|---|---|
| Condição | Ao comparar cartas abertas em uma rodada. |
| Dados envolvidos | Valor da carta; condição de manilha (RN-003). |
| Exceções / alternativas | Manilhas seguem RN-003 e RN-004; carta encoberta segue RN-011. |
| Justificativa | Define de forma determinística quem vence cada rodada. |
| Tipo | Cálculo |
| Interessados | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Regras tradicionais do truco paulista. |
| Requisitos e casos | RF-010; UC-010 |
| Verificação proposta | Comparar todos os pares de valores comuns e confirmar a ordem; confirmar que 7 de Ouros e 7 de Paus empatam quando 7 não é manilha. |

## RN-003 - Vira e definição da manilha

Depois de distribuir 3 cartas para cada participante, a carta seguinte do monte é virada (**vira**). A **manilha** é o valor imediatamente acima da vira na ordem da RN-002, em ciclo: se a vira for 3, a manilha é 4. As quatro cartas desse valor são manilhas e vencem qualquer carta comum.

| Campo | Descrição |
|---|---|
| Condição | No início de cada mão, após a distribuição. |
| Dados envolvidos | Vira; valor da manilha; monte restante. |
| Exceções / alternativas | A vira não pertence a nenhum participante e permanece visível a todos durante a mão. |
| Justificativa | A manilha variável é a característica que distingue o truco paulista (“manilha velha” não é usada). |
| Tipo | Cálculo / derivação |
| Interessados | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Regras tradicionais do truco paulista. |
| Requisitos e casos | RF-009, RF-010, RF-022; UC-009, UC-010 |
| Verificação proposta | Vira 7 → manilha Q; vira K → manilha A; vira 3 → manilha 4; em todos os casos, a manilha mais fraca vence o 3 comum. |

## RN-004 - Ordem das manilhas por naipe

Entre manilhas, a força segue o naipe, da menor para a maior: **Ouros < Espadas < Copas < Paus** (picafumo, espadilha, copas e zap). Duas manilhas nunca empatam.

| Campo | Descrição |
|---|---|
| Condição | Ao comparar duas ou mais manilhas na mesma rodada. |
| Dados envolvidos | Naipe da carta; condição de manilha. |
| Exceções / alternativas | Nenhuma. |
| Justificativa | Garante uma hierarquia total entre as manilhas. |
| Tipo | Cálculo |
| Interessados | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Regras tradicionais do truco paulista. |
| Requisitos e casos | RF-010; UC-010 |
| Verificação proposta | Com manilha 5: 5 de Paus vence 5 de Copas, que vence 5 de Espadas, que vence 5 de Ouros. |

## RN-005 - Duplas e assentos

Cada partida tem **4 participantes** em **2 duplas**. Parceiros sentam-se frente a frente, e a ordem de jogo é no **sentido anti-horário**, alternando as duplas. Na partida contra bots, o jogador forma dupla com um bot e enfrenta dois bots.

| Campo | Descrição |
|---|---|
| Condição | Ao configurar a partida contra bots, organizar a sala online e iniciar qualquer partida. |
| Dados envolvidos | Assentos 0 a 3; dupla A (assentos 0 e 2); dupla B (assentos 1 e 3); tipo do participante. |
| Exceções / alternativas | A partida não inicia com assento vazio. |
| Justificativa | Mantém a dinâmica tradicional: um parceiro nunca joga imediatamente após o outro. |
| Tipo | Integridade |
| Interessados | Jogador, Anfitrião |
| Prioridade / status | Alta / Proposto |
| Origem | Regras tradicionais do truco paulista. |
| Requisitos e casos | RF-004, RF-007, RF-008; UC-004, UC-007, UC-008 |
| Verificação proposta | Em qualquer partida iniciada, conferir 4 assentos ocupados e que após o assento 0 joga o 1, depois o 2 e o 3. |

## RN-006 - Distribuição e rodízio do carteador

O carteador da primeira mão é sorteado. A cada nova mão, o carteador passa ao participante seguinte no sentido anti-horário. O carteador embaralha e distribui 3 cartas a cada participante; o participante seguinte a ele (**mão**) inicia a primeira rodada.

| Campo | Descrição |
|---|---|
| Condição | No início de cada mão. |
| Dados envolvidos | Carteador; ordem dos assentos; baralho embaralhado. |
| Exceções / alternativas | Na revanche, um novo sorteio define o carteador (RN-026). |
| Justificativa | Distribui de forma justa a vantagem de jogar por último. |
| Tipo | Workflow |
| Interessados | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Regras tradicionais; distribuição automatizada é proposta da análise. |
| Requisitos e casos | RF-009, RF-016; UC-009, UC-016 |
| Verificação proposta | Com carteador sorteado no assento 2, a mão seguinte tem carteador 3 e a primeira rodada da mão começa no assento 0. |

## RN-007 - Ordem de jogo nas rodadas

Em cada rodada, cada participante joga uma carta, na ordem anti-horária. A rodada seguinte é iniciada por quem jogou a carta vencedora. Em rodada empatada, a próxima é iniciada por quem iniciou a rodada empatada (**variação proposta, parametrizável**).

| Campo | Descrição |
|---|---|
| Condição | Ao encerrar uma rodada que não decide a mão. |
| Dados envolvidos | Participante da vez; vencedor da rodada; resultado de empate. |
| Exceções / alternativas | Quando as duas maiores cartas são da mesma dupla, inicia quem jogou a primeira delas. |
| Justificativa | Define sem ambiguidade quem joga a seguir. |
| Tipo | Workflow / parametrizável |
| Interessados | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Regras tradicionais; tratamento do empate é proposta da análise. |
| Requisitos e casos | RF-010; UC-010 |
| Verificação proposta | Se o assento 3 vence a 1ª rodada, a 2ª começa no 3; se a 2ª empata e foi iniciada pelo 3, a 3ª começa no 3. |

## RN-008 - Jogada válida

Somente o participante **da vez** pode jogar, uma carta por rodada, e apenas uma carta da própria mão ainda não jogada. Enquanto houver decisão pendente (resposta a truco ou mão de onze), nenhuma carta pode ser jogada.

| Campo | Descrição |
|---|---|
| Condição | Ao receber qualquer pedido de jogada. |
| Dados envolvidos | Participante da vez; cartas na mão; decisões pendentes. |
| Exceções / alternativas | Jogadas fora da vez, repetidas ou com carta alheia são recusadas sem alterar a partida. |
| Justificativa | Impede jogadas indevidas, duplicadas ou trapaças. |
| Tipo | Proteção do negócio |
| Interessados | Jogador, Anfitrião |
| Prioridade / status | Alta / Proposto |
| Origem | Regras tradicionais; validação automática é proposta da análise. |
| Requisitos e casos | RF-010, RF-011; UC-010, UC-011 |
| Verificação proposta | Enviar jogada do assento 1 na vez do assento 0 e jogada de carta já usada; confirmar recusa e estado inalterado. |

## RN-009 - Vencedor da rodada

A rodada é vencida pela carta mais forte (RN-002 a RN-004). Se as cartas mais fortes forem comuns, do mesmo valor e de **duplas diferentes**, a rodada fica **empatada** (“cangada”). Se as mais fortes forem da mesma dupla, essa dupla vence a rodada.

| Campo | Descrição |
|---|---|
| Condição | Quando os 4 participantes jogaram na rodada. |
| Dados envolvidos | Cartas da rodada; dono de cada carta; manilha. |
| Exceções / alternativas | Carta encoberta nunca vence (RN-011). |
| Justificativa | Define o resultado de cada rodada, base do resultado da mão. |
| Tipo | Decisão |
| Interessados | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Regras tradicionais do truco paulista. |
| Requisitos e casos | RF-010; UC-010 |
| Verificação proposta | Com manilha J: 3 da dupla A × 3 da dupla B → empate; 3 e 3 da dupla A × 2 da dupla B → dupla A vence. |

## RN-010 - Vencedor da mão

Vence a mão a dupla que vencer **duas rodadas**. A mão termina assim que o resultado estiver definido. Com empates:

1. 1ª rodada empatada → vence quem ganhar a 2ª; se a 2ª também empatar, a 3ª decide.
2. 1ª rodada vencida e 2ª empatada → vence quem ganhou a 1ª.
3. 1ª e 2ª vencidas por duplas diferentes e 3ª empatada → vence quem ganhou a 1ª.
4. Três rodadas empatadas → nenhuma dupla pontua.

| Campo | Descrição |
|---|---|
| Condição | Ao encerrar cada rodada. |
| Dados envolvidos | Resultados das rodadas da mão. |
| Exceções / alternativas | A mão também termina se uma dupla correr (RN-014, RN-015). |
| Justificativa | Fecha todos os casos possíveis de resultado, inclusive os empates. |
| Tipo | Decisão |
| Interessados | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Regras tradicionais do truco paulista. |
| Requisitos e casos | RF-010; UC-010 |
| Verificação proposta | Tabela de verdade com todas as 3³ sequências de resultados (A, B, empate) e o vencedor esperado de cada uma. |

## RN-011 - Carta encoberta

A partir da **2ª rodada**, o participante pode jogar a carta virada para baixo. A carta encoberta não tem valor: perde para qualquer carta aberta e não é revelada aos demais. Se todas as cartas da rodada forem encobertas, a rodada empata.

| Campo | Descrição |
|---|---|
| Condição | Ao jogar uma carta na 2ª ou 3ª rodada. |
| Dados envolvidos | Carta; indicação de encoberta; número da rodada. |
| Exceções / alternativas | Não permitida na 1ª rodada nem na mão de ferro (RN-016). |
| Justificativa | Permite esconder informação do adversário, prática comum no truco paulista. |
| Tipo | Restrição |
| Interessados | Jogador |
| Prioridade / status | Média / Proposto |
| Origem | Regras tradicionais do truco paulista. |
| Requisitos e casos | RF-010; UC-010 |
| Verificação proposta | Tentar encobrir na 1ª rodada (recusado); encobrir um 3 na 2ª contra um 4 aberto (o 4 vence). |

## RN-012 - Valor da mão e escada do truco

Toda mão começa valendo **1 ponto**. Pedidos aceitos elevam o valor na sequência **3 → 6 → 9 → 12**. Não há aumento além de 12. A mão de onze vale 3 (RN-015) e a mão de ferro vale 1 (RN-016).

| Campo | Descrição |
|---|---|
| Condição | Ao iniciar a mão e a cada pedido aceito. |
| Dados envolvidos | Valor vigente da mão; último pedido. |
| Exceções / alternativas | Correr encerra a mão com o valor anterior ao pedido (RN-014). |
| Justificativa | Define quanto cada mão vale e o limite das apostas. |
| Tipo | Cálculo / parametrizável |
| Interessados | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Regras tradicionais do truco paulista. |
| Requisitos e casos | RF-011, RF-012; UC-011, UC-012 |
| Verificação proposta | Sequência truco aceito → seis aceito → nove aceito → doze aceito resulta em 12; novo pedido é recusado. |

## RN-013 - Pedido de truco

Somente o participante **da vez**, antes de jogar sua carta, pode pedir truco. Só existe um pedido pendente por vez. Uma dupla não pode aumentar o próprio pedido: o próximo aumento cabe à dupla adversária. O pedido é proibido na mão de onze e na mão de ferro.

| Campo | Descrição |
|---|---|
| Condição | Na vez do participante, antes da jogada. |
| Dados envolvidos | Participante da vez; dupla que fez o último pedido aceito; valor vigente; tipo da mão. |
| Exceções / alternativas | Se a dupla do participante fez o último pedido aceito, ele não pode pedir de novo; o valor já é 12. |
| Justificativa | Organiza a disputa de apostas e evita pedidos sucessivos pela mesma dupla. |
| Tipo | Restrição / workflow |
| Interessados | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Regras tradicionais do truco paulista. |
| Requisitos e casos | RF-011; UC-011 |
| Verificação proposta | Dupla A pede e B aceita; na vez seguinte de A, novo pedido de A é recusado; B pode pedir seis. |

## RN-014 - Resposta ao pedido de truco

O pedido é respondido pela dupla adversária. Cabe ao **primeiro adversário na ordem de jogo após o solicitante** responder (**variação proposta para o jogo digital**). As respostas são:

- **Aceitar:** o valor da mão sobe ao valor pedido e o jogo continua.
- **Correr:** a mão termina e a dupla solicitante ganha o valor vigente **antes** do pedido.
- **Aumentar:** aceita e pede o valor seguinte (se menor ou igual a 12); a resposta passa à outra dupla.

| Campo | Descrição |
|---|---|
| Condição | Ao existir pedido pendente. |
| Dados envolvidos | Pedido pendente; valor vigente; respondente. |
| Exceções / alternativas | Quando o respondente é bot ou o prazo expira, aplica-se RF-021 e RN-021. |
| Justificativa | Fecha os três desfechos de um pedido e quanto vale desistir. |
| Tipo | Decisão / parametrizável |
| Interessados | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Regras tradicionais; escolha do respondente é proposta da análise. |
| Requisitos e casos | RF-012; UC-012 |
| Verificação proposta | Pedido de truco (1→3) recusado: solicitante +1. Pedido de seis (3→6) recusado: solicitante +3. |

## RN-015 - Mão de onze

Quando **somente uma** dupla tem 11 pontos, antes da primeira rodada os parceiros dessa dupla veem as cartas um do outro e decidem:

- **Jogar:** a mão vale 3 pontos, sem possibilidade de truco.
- **Correr:** a dupla adversária ganha 1 ponto e a mão termina.

Na partida contra bots, a decisão é do jogador humano. Online, decide o primeiro participante humano da dupla na ordem de jogo (**proposta**); se ambos forem bots, decide o bot.

| Campo | Descrição |
|---|---|
| Condição | Após a distribuição, quando uma dupla tem 11 e a outra não. |
| Dados envolvidos | Placar; cartas dos parceiros da dupla com 11. |
| Exceções / alternativas | Ambas com 11 → RN-016. |
| Justificativa | Equilibra o fim da partida, já que a dupla com 11 não pode receber truco. |
| Tipo | Decisão |
| Interessados | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Regras tradicionais; responsável pela decisão no digital é proposta. |
| Requisitos e casos | RF-009, RF-013; UC-009, UC-013 |
| Verificação proposta | Placar 11×7: a dupla com 11 vê 6 cartas e escolhe; correr leva a 11×8; jogar e vencer leva a 14×7 (vitória). |

## RN-016 - Mão de ferro

Quando **as duas** duplas têm 11 pontos, a mão é de ferro: os participantes **não veem as próprias cartas** até jogá-las, não há truco nem carta encoberta, e a mão vale 1 ponto. A dupla vencedora alcança 12 e vence a partida.

| Campo | Descrição |
|---|---|
| Condição | Após a distribuição, com placar 11×11. |
| Dados envolvidos | Placar; cartas ocultas. |
| Exceções / alternativas | Se a mão terminar com três empates, ninguém pontua e uma nova mão de ferro é distribuída. |
| Justificativa | Decide a partida empatada sem vantagem de aposta. |
| Tipo | Decisão |
| Interessados | Jogador |
| Prioridade / status | Média / Proposto |
| Origem | Regras tradicionais do truco paulista. |
| Requisitos e casos | RF-009, RF-010; UC-009, UC-010 |
| Verificação proposta | Placar 11×11: cartas aparecem ocultas para todos; pedir truco é recusado; vencedora termina com 12. |

## RN-017 - Pontuação e vitória da partida

Ao fim de cada mão, a dupla vencedora soma o valor da mão. Vence a partida a primeira dupla que alcançar **12 pontos ou mais**. Ao ocorrer a vitória, a partida é encerrada e o resultado é apresentado a todos.

| Campo | Descrição |
|---|---|
| Condição | Ao encerrar uma mão. |
| Dados envolvidos | Placar das duplas; valor da mão; dupla vencedora. |
| Exceções / alternativas | Mão sem vencedor (três empates) não altera o placar. |
| Justificativa | Define quando a partida acaba. |
| Tipo | Evento (QUANDO mão encerrada ENTÃO somar e verificar vitória) |
| Interessados | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Regras tradicionais do truco paulista. |
| Requisitos e casos | RF-010, RF-012, RF-013, RF-016; UC-010, UC-012, UC-013, UC-016 |
| Verificação proposta | Placar 10×4 e mão de truco (3) vencida pela dupla com 10 → 13×4 e partida encerrada. |

## RN-018 - Sigilo das cartas

Cada participante conhece apenas: as próprias cartas, a vira, as cartas **abertas** já jogadas, o placar e os **sinais do próprio parceiro** (RN-027). Cartas encobertas, as cartas na mão dos outros e os sinais trocados pela dupla adversária nunca são revelados. A única exceção é a mão de onze, em que os parceiros da dupla com 11 veem as cartas um do outro.

| Campo | Descrição |
|---|---|
| Condição | Em toda apresentação do estado da mesa a um participante. |
| Dados envolvidos | Cartas de cada participante; visão do assento. |
| Exceções / alternativas | Mão de onze (RN-015); mão de ferro oculta inclusive as próprias cartas (RN-016). |
| Justificativa | Sem sigilo o jogo perde sentido e permite trapaça. |
| Tipo | Proteção do negócio |
| Interessados | Jogador, Anfitrião, Equipe de desenvolvimento |
| Prioridade / status | Alta / Proposto |
| Origem | Regras tradicionais; aplicação técnica é proposta da análise (RNF-002). |
| Requisitos e casos | RF-021, RF-022, RF-024; UC-009, UC-010, UC-013, UC-021 |
| Verificação proposta | Inspecionar a visão entregue ao assento 1 e confirmar ausência das cartas dos assentos 0, 2 e 3 e das encobertas. |

## RN-019 - Bots sem informação privilegiada

Bots são participantes controlados pelo sistema e seguem **as mesmas regras** dos humanos. Decidem usando somente a informação permitida ao seu assento (RN-018) — o que inclui os sinais recebidos do parceiro (RN-027). Bots também enviam sinais ao parceiro, de acordo com as próprias cartas. Há três níveis: **fácil**, **médio** e **difícil**. Bots não recebem cartas melhores nem conhecem o monte.

| Campo | Descrição |
|---|---|
| Condição | Sempre que for a vez ou a decisão de um bot. |
| Dados envolvidos | Visão do assento do bot; nível de dificuldade; ações válidas. |
| Exceções / alternativas | Um bot pode assumir temporariamente o assento de um humano (RN-021, RN-022). |
| Justificativa | Garante partidas justas e dificuldade previsível para o jogador. |
| Tipo | Integridade / proteção |
| Interessados | Jogador, Anfitrião |
| Prioridade / status | Alta / Proposto |
| Origem | Proposta do grupo (requisito de jogar com bots). |
| Requisitos e casos | RF-004, RF-007, RF-021, RF-024; UC-004, UC-007, UC-021 |
| Verificação proposta | Verificar que a função de decisão do bot recebe apenas a visão do assento; simular 10.000 partidas sem nenhuma ação inválida. |

## RN-020 - Formação e início da sala online

Uma sala online tem um **código de 6 caracteres** (letras e números, sem caracteres ambíguos como O/0 e I/1), até **4 participantes humanos** e um **anfitrião** (quem criou a sala). Vagas podem ser ocupadas por bots. Só o anfitrião inicia a partida, e apenas com os **4 assentos ocupados**. Sala sem início em **30 minutos** expira.

| Campo | Descrição |
|---|---|
| Condição | Ao criar, entrar, organizar ou iniciar uma sala. |
| Dados envolvidos | Sala (código, situação, anfitrião, expiração); participantes; assentos. |
| Exceções / alternativas | Sala cheia, em jogo, encerrada ou expirada não aceita novos participantes (exceto reconexão, RN-022). |
| Justificativa | Permite jogar com conhecidos sem cadastro e evita salas abandonadas. |
| Tipo | Integridade / workflow |
| Interessados | Jogador, Anfitrião |
| Prioridade / status | Média / Proposto |
| Origem | Proposta do grupo (jogo online); valores numéricos são propostas da análise. |
| Requisitos e casos | RF-005, RF-006, RF-007, RF-008; UC-005, UC-006, UC-007, UC-008 |
| Verificação proposta | Tentar iniciar com 3 assentos ocupados (recusado); quinto humano é recusado; sala criada há 31 minutos não aceita entrada. |

## RN-021 - Prazo de decisão online

Em partida online, cada decisão de um humano tem prazo: **30 s** para jogar carta e **20 s** para responder truco ou decidir mão de onze (**parametrizável**). Ao expirar, um bot de nível médio decide **apenas aquela ação** pelo participante.

| Campo | Descrição |
|---|---|
| Condição | Quando uma decisão pendente de humano ultrapassa o prazo. |
| Dados envolvidos | Decisão pendente; instante limite; assento. |
| Exceções / alternativas | Na partida contra bots não há prazo para o jogador. |
| Justificativa | Evita que a partida trave por ausência de um participante. |
| Tipo | Evento / parametrizável |
| Interessados | Jogador, Anfitrião |
| Prioridade / status | Média / Proposto |
| Origem | Proposta da análise. |
| Requisitos e casos | RF-010, RF-012, RF-013, RF-021; UC-010, UC-012, UC-013 |
| Verificação proposta | Deixar o prazo de jogada expirar e confirmar uma jogada válida no assento, registrada como automática. |

## RN-022 - Saída e reconexão de participantes

O participante que sai da partida, ou fica **mais de 60 s sem conexão**, tem o assento assumido por um bot de nível médio. A partida não pausa. Se ele voltar com a mesma credencial de assento, recupera o controle a partir da próxima decisão. Se o anfitrião sair antes do início, a função passa ao próximo humano; se não restar nenhum humano, a sala é encerrada.

| Campo | Descrição |
|---|---|
| Condição | Ao sair, perder conexão ou voltar à sala. |
| Dados envolvidos | Participante; credencial de assento; último sinal de presença; anfitrião. |
| Exceções / alternativas | Na partida contra bots, sair encerra a partida sem registro de resultado. |
| Justificativa | Mantém a partida jogável para quem continua e permite voltar após queda de internet. |
| Tipo | Evento |
| Interessados | Jogador, Anfitrião |
| Prioridade / status | Média / Proposto |
| Origem | Proposta da análise. |
| Requisitos e casos | RF-014, RF-015, RF-021; UC-014, UC-015 |
| Verificação proposta | Fechar a aba de um participante, aguardar 60 s, confirmar bot no assento; reabrir com a credencial e confirmar retorno do controle. |

## RN-023 - Identificação do jogador

O jogador é identificado por **apelido** (2 a 16 caracteres, sem ser apenas espaços) e por um **avatar** escolhido no catálogo do jogo. Não é exigida conta, e-mail ou senha. Na mesma sala, apelidos repetidos recebem sufixo numérico (“Ana”, “Ana 2”).

| Campo | Descrição |
|---|---|
| Condição | Ao configurar o perfil e ao entrar em sala online. |
| Dados envolvidos | Apelido; avatar. |
| Exceções / alternativas | Sem perfil configurado, o sistema sugere um apelido e um avatar padrão. |
| Justificativa | Identifica os participantes na mesa com o mínimo de dados pessoais. |
| Tipo | Integridade |
| Interessados | Jogador |
| Prioridade / status | Alta / Proposto |
| Origem | Proposta da análise. |
| Requisitos e casos | RF-001, RF-006; UC-001, UC-006 |
| Verificação proposta | Apelido “A” é recusado; dois “Ana” na mesma sala aparecem como “Ana” e “Ana 2”. |

## RN-024 - Pontuação no marcador físico

O marcador registra duas duplas com nomes (padrão **“Nós”** e **“Eles”**). Cada registro soma à dupla um dos valores **1, 3, 6, 9 ou 12**. Ao alcançar 11, o marcador avisa a mão de onze; ao alcançar **12 ou mais**, declara a vencedora e encerra a partida. O último registro pode ser desfeito, inclusive o que encerrou a partida.

| Campo | Descrição |
|---|---|
| Condição | Durante o uso do marcador. |
| Dados envolvidos | Nomes das duplas; lista de registros; totais. |
| Exceções / alternativas | Partida encerrada não aceita novos registros até ser desfeita ou reiniciada. |
| Justificativa | Reproduz a contagem do truco físico e corrige toques errados. |
| Tipo | Cálculo / workflow |
| Interessados | Jogador |
| Prioridade / status | Média / Proposto |
| Origem | Proposta do grupo (marcador para jogo físico). |
| Requisitos e casos | RF-017, RF-018, RF-019; UC-017, UC-018, UC-019 |
| Verificação proposta | Registrar +3, +6 e +3 para “Nós” → 12 e vitória; desfazer → 9 e partida reaberta. |

## RN-025 - Histórico local do marcador

Partidas encerradas no marcador são guardadas **somente no dispositivo**, com data, nomes e placar final, limitadas às **50 mais recentes**. O jogador pode apagar o histórico.

| Campo | Descrição |
|---|---|
| Condição | Ao encerrar uma partida no marcador e ao consultar o histórico. |
| Dados envolvidos | Registros de partidas do marcador. |
| Exceções / alternativas | Ao chegar a 50, a mais antiga é descartada. |
| Justificativa | Oferece histórico sem coletar dados no servidor (minimização de dados, LGPD). |
| Tipo | Legal / privacidade |
| Interessados | Jogador |
| Prioridade / status | Baixa / Proposto |
| Origem | Proposta da análise. |
| Requisitos e casos | RF-017, RF-020; UC-017, UC-020 |
| Verificação proposta | Encerrar 51 partidas e confirmar 50 no histórico; confirmar que nenhuma requisição de rede é feita. |

## RN-026 - Revanche

Ao fim da partida, uma revanche pode ser iniciada **mantendo as duplas** e zerando o placar, com novo sorteio do carteador. Online, apenas o anfitrião inicia a revanche, e assentos de quem saiu são ocupados por bots.

| Campo | Descrição |
|---|---|
| Condição | Após a vitória de uma dupla. |
| Dados envolvidos | Duplas; participantes; placar. |
| Exceções / alternativas | Se nenhum humano permanecer, a revanche não é oferecida. |
| Justificativa | Permite continuar jogando sem refazer a configuração. |
| Tipo | Workflow |
| Interessados | Jogador, Anfitrião |
| Prioridade / status | Baixa / Proposto |
| Origem | Proposta do grupo. |
| Requisitos e casos | RF-016; UC-016 |
| Verificação proposta | Após vitória, iniciar revanche e conferir placar 0×0 e mesmas duplas. |

---

## RN-027 - Sinais ao parceiro

Durante a mão, cada participante pode fazer **sinais** para o parceiro, imitando os gestos do truco presencial, para indicar as cartas que tem ou o que pretende. Os sinais adotados são:

| Sinal | Gesto (ilustração no jogo) | Significado |
|---|---|---|
| Zap | Piscar o olho | Tenho a manilha de paus |
| Copas | Levantar as sobrancelhas | Tenho a manilha de copas |
| Espadilha | Mostrar a língua | Tenho a manilha de espadas |
| Picafumo | Encher as bochechas | Tenho a manilha de ouros |
| Três | Morder o lábio | Tenho um 3 |
| Dois | Fazer biquinho | Tenho um 2 |
| Ás | Abrir a boca | Tenho um ás |
| Nada | Fechar os olhos | Não tenho carta boa |
| Pede truco | Sorrir | Pode pedir truco |

Regras:

1. Pode sinalizar quem ainda tem carta na mão, a qualquer momento da mão, mesmo fora da sua vez. O sinal não muda a vez nem o valor da mão.
2. Cada participante faz no máximo **3 sinais por mão**, sem repetir o mesmo sinal.
3. O sinal é visto **só pelo parceiro** (e por quem o fez). A dupla adversária não vê o sinal nem fica sabendo que ele aconteceu (**proposta da análise**; no jogo presencial, “pegar o sinal” do adversário faz parte do jogo).
4. Não há sinais na **mão de ferro**, porque ninguém conhece as próprias cartas (RN-016).
5. O sistema não confere se o sinal é verdadeiro.

| Campo | Descrição |
|---|---|
| Condição | Durante uma mão em andamento, por participante com carta na mão. |
| Dados envolvidos | Sinal; participante; mão; sinais já feitos na mão. |
| Exceções / alternativas | Sinal repetido, quarto sinal, mão de ferro, mão encerrada ou participante sem cartas: recusado sem efeito. |
| Justificativa | Reproduz a comunicação entre parceiros, parte tradicional do truco, que se perde no jogo digital; os jogos de truco online oferecem esse recurso. |
| Tipo | Restrição / proteção do negócio (sigilo) |
| Interessados | Jogador |
| Prioridade / status | Média / Proposto |
| Origem | Proposta do grupo; gestos e limites são propostas da análise. |
| Requisitos e casos | RF-024, RF-021, RF-022; UC-021 |
| Verificação proposta | Assento 0 sinaliza Zap: o assento 2 recebe o sinal, os assentos 1 e 3 não recebem nada; um quarto sinal na mesma mão é recusado; na mão de ferro o sinal é recusado. |

## Referências e critérios da disciplina

- CHOMA, J. *Regras de Negócio e Requisitos* — Análise e Projeto de Software, UEM/DIN.
- CHOMA, J. *Exemplo de Produto de Software: Mapas de Usuário, Fluxos e Dados* — UEM/DIN.
- Regras tradicionais do truco paulista (variações declaradas como propostas da análise).
