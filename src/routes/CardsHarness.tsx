// Test-only page (e2e builds with VITE_E2E=1). Renders every share card combination at full size so
// Playwright can measure readability: text never under 38px, nothing overflowing, every ratio and theme.
// Not part of the product and compiled out of production builds.

import { useSearchParams } from 'react-router-dom';
import { OgCard, type OgInput } from '../components/OgCard';
import { ShareCard, type CardData } from '../components/ShareCard';
import { useCardBudget } from '../components/useCardBudget';
import { answersFrom, puzzleCards, resultCard, RATIOS, type Ratio } from '../engine/cards';
import { buildHiddenWords } from '../engine/hiddenWords';
import { games } from '../games/catalog';

const ratios = Object.keys(RATIOS) as Ratio[];

function Deck({ id, input }: { id: string; input: Parameters<typeof puzzleCards>[0] }) {
  const [budgetScale, onOverflow] = useCardBudget(id);
  const cards = puzzleCards({ ...input, budgetScale });
  return (
    <div data-deck={id} data-pages={cards.length} data-budget={budgetScale}>
      {cards.map((c, i) => (
        <Card key={i} card={c} onOverflow={onOverflow} />
      ))}
    </div>
  );
}

const Card = ({ card, onOverflow }: { card: CardData; onOverflow?: () => void }) => (
  <div data-harness-card="" data-w={card.w} data-h={card.h} style={{ width: card.w, height: card.h, marginBottom: 8 }}>
    <ShareCard card={card} onOverflow={onOverflow} />
  </div>
);

export function CardsHarness() {
  const [q] = useSearchParams();
  const only = q.get('game');
  const theme = (q.get('theme') as 'dark' | 'light') ?? 'dark';
  const list = games.filter((g) => !only || g.id === only);

  const longName = { name: 'Oluwadamilare Chukwuemeka-Adebayo Okonkwo', handle: '@oluwadamilare.chukwu' };

  return (
    <div style={{ padding: 8 }}>
      {list.map((g) => {
        const p = buildHiddenWords(g);
        const found = (i: number) => i % 2 === 0;
        const answers = answersFrom(g.text, p.answers.map((a) => a.key)).map((a, i) => ({ ...a, found: found(i), hinted: i % 5 === 0 }));
        const base = { answers, secs: 3725, theme, kicker: `${g.category} · ${p.difficulty}`, date: '26 Sept', url: 'fignda.pages.dev/play/' + g.id, noun: g.noun, text: g.text };
        return ratios.map((ratio) => (
          <div key={`${g.id}-${ratio}`}>
            {(['excerpt', 'full'] as const).map((mode) =>
              [false, true].map((show) =>
                [false, true].map((daily) => (
                  <Deck
                    key={`${mode}-${show}-${daily}`}
                    id={`${g.id}|${ratio}|${mode}|${show}|${daily}`}
                    input={{ ...base, ratio, mode, show: show && !daily, hideCount: daily, ...(daily ? longName : {}) }}
                  />
                )),
              ),
            )}
            {[false, true].map((daily) => (
              <Card
                key={`result-${daily}`}
                card={resultCard({ ...base, ratio, title: g.title, hideCount: daily, score: 20600, hints: 12, ...longName })}
              />
            ))}
          </div>
        ));
      })}
    </div>
  );
}

/** Test and render-only: one link preview at 1200x630. /__og?game=bible&daily=1, or no game for the default. */
export function OgHarness() {
  const [q] = useSearchParams();
  const g = games.find((x) => x.id === q.get('game'));
  const input: OgInput = g
    ? { kind: 'game', title: g.title, noun: g.noun, text: g.text, dict: g.dict, daily: q.get('daily') === '1' }
    : { kind: 'default' };
  return <OgCard input={input} />;
}
