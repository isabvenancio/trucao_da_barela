import { Link } from 'react-router-dom';
import { ORDEM_VALORES } from '../engine/index.ts';
import type { Carta as TCarta } from '../engine/index.ts';
import { Carta } from '../ui/arte/Carta.tsx';

const c = (valor: TCarta['valor'], naipe: TCarta['naipe']): TCarta => ({ valor, naipe });

/** UC-003: regras do truco paulista adotadas pelo jogo (o tutorial guiado chega na fase 7). */
export function Regras() {
  return (
    <main className="pagina pagina--texto">
      <h1>Regras</h1>
      <p>Truco paulista com baralho de 40 cartas (sem 8, 9, 10 e coringas), duas duplas, parceiros frente a frente. Ganha a dupla que fizer 12 pontos.</p>

      <section>
        <h2>Cartas e manilha</h2>
        <p>Da mais fraca para a mais forte:</p>
        <p className="ordem-cartas">{ORDEM_VALORES.join(' < ')}</p>
        <p>
          Depois de dar as cartas, uma carta é virada: a <strong>vira</strong>. As <strong>manilhas</strong> são as cartas do valor
          seguinte ao da vira e vencem todas as outras. Se a vira for 3, a manilha é 4.
        </p>
        <div className="exemplo-cartas" aria-label="Exemplo: vira 7, manilhas Q">
          <figure>
            <Carta carta={c('7', 'copas')} tamanho="p" />
            <figcaption>Vira 7</figcaption>
          </figure>
          <span aria-hidden="true">→</span>
          {(['ouros', 'espadas', 'copas', 'paus'] as const).map((n) => (
            <Carta key={n} carta={c('Q', n)} manilha="Q" tamanho="p" />
          ))}
        </div>
        <p>
          Entre as manilhas vale o naipe: ouros (picafumo) &lt; espadas (espadilha) &lt; copas &lt; paus (<strong>zap</strong>). Cartas
          comuns de mesmo valor empatam, sem importar o naipe.
        </p>
      </section>

      <section>
        <h2>Rodadas e mão</h2>
        <p>Cada mão tem até 3 rodadas. Vence a mão quem ganhar 2 rodadas. Com empates:</p>
        <ul>
          <li>1ª empatada: quem ganhar a 2ª leva. Se a 2ª também empatar, a 3ª decide.</li>
          <li>1ª ganha e 2ª empatada: leva quem ganhou a 1ª.</li>
          <li>Uma rodada para cada dupla e 3ª empatada: leva quem ganhou a 1ª.</li>
          <li>Três empates: ninguém pontua.</li>
        </ul>
        <p>Da 2ª rodada em diante dá para jogar a carta <strong>encoberta</strong>: ela não vale nada, mas ninguém vê qual foi.</p>
      </section>

      <section>
        <h2>Truco</h2>
        <p>
          A mão vale 1 ponto. Na sua vez, antes de jogar, você pode pedir <strong>truco</strong> (3). Os adversários aceitam, correm ou
          aumentam para <strong>seis</strong>; depois vêm <strong>nove</strong> e <strong>doze</strong>. Quem corre entrega o valor que
          a mão tinha antes do pedido. A mesma dupla não pode aumentar o próprio pedido.
        </p>
      </section>

      <section>
        <h2>Mão de onze e mão de ferro</h2>
        <p>
          Quando só uma dupla tem 11 pontos, ela vê as cartas do parceiro e decide: jogar a mão valendo 3 (sem truco) ou correr e dar 1 ponto
          aos adversários. Se as duas duplas têm 11, é <strong>mão de ferro</strong>: ninguém vê as próprias cartas, não tem truco e quem
          vencer leva a partida.
        </p>
      </section>

      <section>
        <h2>Variações que adotamos</h2>
        <ul>
          <li>Depois de uma rodada empatada, começa a próxima quem começou a empatada.</li>
          <li>O pedido de truco é respondido pelo próximo adversário na ordem de jogo.</li>
          <li>Na mão de onze, decide o primeiro jogador humano da dupla.</li>
        </ul>
      </section>

      <Link to="/" className="botao botao--pedra">
        Voltar
      </Link>
    </main>
  );
}
