import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { puzzleCards, resultCard, type Ratio } from '../engine/cards';
import type { SpanAnswer } from '../engine/excerpt';
import { formatTime } from '../engine/time';
import { cardToFile, copyText, deliver, shareUrl, shareUrlLabel } from '../lib/share';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import { Segmented } from './Segmented';
import { ShareCard, ShareCardFrame, type CardData } from './ShareCard';
import { Toggle } from './Toggle';
import { useCardBudget } from './useCardBudget';
import { useDelayedWaiting } from './useDelayedWaiting';
import { Waiting } from './Waiting';
import styles from './ShareSheet.module.css';

export type ShareGame = {
  id: string;
  title: string;
  noun: string;
  category: string;
  difficulty: string;
  text: string;
  /** Daily number and its display date. */
  daily?: { n: number; date: string };
  /** Public path for the link, e.g. /d/269. */
  path: string;
  /** Signed in: the sharer's handle. The link becomes a head-to-head challenge (`?vs=`). */
  vs?: string;
  /** A sponsored puzzle: "With NAME" and the sponsor's site name. */
  sponsor?: { line: string; host?: string };
};

export type ShareResult = {
  answers: SpanAnswer[];
  secs: number;
  score: number;
  hints: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  game: ShareGame;
  result: ShareResult;
  player: { name?: string; handle?: string };
};

type Kind = 'result' | 'puzzle';
type Mode = 'excerpt' | 'full';

const PREVIEW_MAX = 300;

/** Defaults: Result, 4:5, Excerpt, off. */
export function ShareSheet({ open, onClose, game, result, player }: Props) {
  const [kind, setKind] = useState<Kind>('result');
  const [ratio, setRatio] = useState<Ratio>('4:5');
  const [mode, setMode] = useState<Mode>('excerpt');
  const [show, setShow] = useState(false);
  const [page, setPage] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const exportRefs = useRef<Array<HTMLDivElement | null>>([]);
  // Images usually take under a second. Past that, the waiting line shows where the note goes.
  const waiting = useDelayedWaiting(busy);

  const daily = !!game.daily;
  const showOn = show && !daily;
  const layoutKey = `${ratio}|${mode}|${showOn}`;
  const [budgetScale, onOverflow] = useCardBudget(layoutKey);
  const previewW = Math.min(PREVIEW_MAX, Math.max(200, (typeof window === 'undefined' ? 400 : window.innerWidth) - 72));

  const cards: CardData[] = useMemo(() => {
    const base = {
      ratio,
      answers: result.answers,
      secs: result.secs,
      theme: (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') ?? 'dark',
      kicker: daily ? `Daily #${game.daily!.n}` : `${game.category} · ${game.difficulty}`,
      date: daily ? game.daily!.date : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      url: shareUrlLabel(game.path),
      name: player.name,
      handle: player.handle ? `@${player.handle}` : undefined,
      previewW,
      hideCount: daily,
      sponsor: game.sponsor?.line,
      sponsorHost: game.sponsor?.host,
    };
    return kind === 'result'
      ? [resultCard({ ...base, title: game.title, score: result.score, hints: result.hints })]
      : puzzleCards({ ...base, text: game.text, mode, show: showOn, noun: game.noun, budgetScale });
  }, [kind, ratio, mode, showOn, budgetScale, result, game, player, daily, previewW]);

  const current = Math.min(page, cards.length - 1);
  const card = cards[current]!;

  const reset = (fn: () => void) => {
    fn();
    setPage(0);
    setNote('');
  };

  const found = result.answers.filter((a) => a.found).length;
  const total = result.answers.length;
  // The card prints the plain path; the link carries the challenge.
  const link = shareUrl(game.vs ? `${game.path}?vs=${encodeURIComponent(game.vs)}` : game.path);
  const text =
    kind === 'result'
      ? `Gazecraft · ${game.title}\n${daily ? `${found} found` : `${found}/${total}`} · ${formatTime(result.secs)} · ${result.score.toLocaleString('en-US')}\nCan you beat it?`
      : `${daily ? `How many ${game.noun} can you find?` : `Can you find ${total} ${game.noun}?`} Gazecraft`;

  const send = async () => {
    setBusy(true);
    setNote('');
    try {
      const slug = game.id.replace(/[^a-z0-9-]/gi, '');
      const files = await Promise.all(
        cards.map((c, i) =>
          cardToFile(exportRefs.current[i]!, c.w, c.h, `gazecraft-${slug}-${kind}-${ratio.replace(':', 'x')}${cards.length > 1 ? `-${i + 1}` : ''}.png`),
        ),
      );
      const r = await deliver(files, text, link);
      setNote(r === 'shared' ? 'Shared.' : r === 'saved' ? (files.length > 1 ? `Saved ${files.length} images.` : 'Saved.') : '');
    } catch {
      setNote('Could not make the image. Try Copy link.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => setNote((await copyText(link)) ? 'Link copied.' : link);

  const modeNote =
    mode === 'full'
      ? cards.length > 1
        ? `The whole text in ${cards.length} pages. Shares as a carousel.`
        : 'The whole text fits on one card.'
      : 'Whole sentences with the most hidden words.';

  return (
    <Dialog open={open} onClose={onClose} label="Share">
      <div className={styles.sheet}>
        <div className={styles.previewCol}>
          <ShareCardFrame key={`${layoutKey}|${kind}|${current}`} card={card} onOverflow={onOverflow} />
          {cards.length > 1 && (
            <div className={styles.pager}>
              <button
                type="button"
                className={styles.pageBtn}
                aria-label="Previous page"
                onClick={() => setPage((current - 1 + cards.length) % cards.length)}
              >
                <Icon icon={ChevronLeft} size={18} />
              </button>
              <span aria-live="polite">
                {current + 1} / {cards.length}
              </span>
              <button
                type="button"
                className={styles.pageBtn}
                aria-label="Next page"
                onClick={() => setPage((current + 1) % cards.length)}
              >
                <Icon icon={ChevronRight} size={18} />
              </button>
            </div>
          )}
        </div>

        <div className={styles.controls}>
          <div className={styles.head}>
            <h2 className={styles.title}>Share</h2>
            <button type="button" className={styles.close} onClick={onClose}>
              Close
            </button>
          </div>
          <Segmented
            label="Card"
            hideLabel
            options={[
              ['result', 'Result'],
              ['puzzle', 'Puzzle'],
            ]}
            value={kind}
            onChange={(v) => reset(() => setKind(v))}
          />
          <Segmented
            label="Frame"
            options={[
              ['1:1', '1:1'],
              ['4:5', '4:5'],
              ['9:16', '9:16'],
            ]}
            value={ratio}
            onChange={(v) => reset(() => setRatio(v))}
          />
          {kind === 'puzzle' && (
            <>
              <div className={styles.group}>
                <Segmented
                  label="Text"
                  options={[
                    ['excerpt', 'Excerpt'],
                    ['full', 'Full puzzle'],
                  ]}
                  value={mode}
                  onChange={(v) => reset(() => setMode(v))}
                />
                <span className={styles.note}>{modeNote}</span>
              </div>
              <Toggle
                label="Show my finds"
                note={
                  daily
                    ? 'Locked for daily puzzles until tomorrow'
                    : showOn
                      ? 'Card is stamped Contains answers'
                      : 'Off. Nothing is spoiled.'
                }
                checked={showOn}
                disabled={daily}
                onChange={(v) => reset(() => setShow(v))}
              />
            </>
          )}
          <div className={styles.actions}>
            <Button variant="primary" onClick={send} disabled={busy} className={styles.send}>
              {cards.length > 1 ? `Share ${cards.length} images` : 'Share image'}
            </Button>
            <Button variant="secondary" onClick={copy}>
              Copy link
            </Button>
          </div>
          {waiting ? (
            <Waiting size="inline" />
          ) : (
            <span className={styles.status} role="status">
              {note}
            </span>
          )}
        </div>
      </div>

      {/* Full-size copies for export. Off screen, never shown. */}
      <div className={styles.export} aria-hidden="true">
        {open &&
          cards.map((c, i) => (
            <ShareCard
              key={`${layoutKey}|${kind}|${i}`}
              card={c}
              onOverflow={onOverflow}
              ref={(el) => {
                exportRefs.current[i] = el;
              }}
            />
          ))}
      </div>
    </Dialog>
  );
}
