import { useRef, useState } from 'react';
import { Eye, Flag, Flame, FolderCheck, Layers, Lock, Ruler, Share2, Sparkles, Star, type LucideIcon } from 'lucide-react';
import type { Avatar as AvatarParts } from '../avatar/draw';
import { medalsOf, type Medal, type MedalCounts, type MedalKey } from '../lib/medals';
import { cardToFile, deliver, shareUrlLabel } from '../lib/share';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import { MEDAL_CARD, MedalCard } from './MedalCard';
import styles from './Medals.module.css';

const GLYPH: Record<MedalKey, LucideIcon> = { clean: Sparkles, nohint: Eye, long: Ruler, deep: Layers, run: Flame, cases: FolderCheck, points: Star, first: Flag };

/** One medal: a disc on a ribbon, struck with its tier, in the metal of that tier. Not earned: an outline and a lock. */
export function MedalFace({ medal, size = 'md' }: { medal: Medal; size?: 'md' | 'lg' }) {
  const earned = medal.tier >= 0;
  return (
    <span className={styles.medal} data-metal={medal.metal ?? 'none'} data-size={size} aria-hidden="true">
      <span className={styles.ribbon} />
      <span className={styles.disc}>
        <Icon icon={earned ? GLYPH[medal.key] : Lock} size={size === 'lg' ? 20 : 16} />
        <span className={styles.face}>{medal.face}</span>
      </span>
    </span>
  );
}

type Props = {
  codes: readonly string[];
  /** The player's own counts: with them a medal shows how far it is to its next tier. */
  counts?: MedalCounts;
  /** Who the medals belong to, for the words that are shared. Left out: "I". */
  owner?: string;
  /** The name and the detective drawn on a shared medal's picture. */
  name?: string;
  handle?: string;
  parts?: AvatarParts;
  /** The page a shared medal links to. */
  path?: string;
  /** Show the medals not earned yet too, as outlines. A player's own page does. */
  all?: boolean;
};

/**
 * A player's medals (SPEC section 6, Medals): 1 a kind, worn at the highest tier earned. The medal says what it
 * is: its glyph, the number struck on it and its metal. Under it, only its name and a bar toward the next tier.
 * Tap one to see it large and share it.
 */
export function Medals({ codes, counts, owner, name, handle, parts, path = '/play', all = false }: Props) {
  const [open, setOpen] = useState<MedalKey | null>(null);
  const [said, setSaid] = useState('');
  const [busy, setBusy] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const medals = medalsOf(codes, counts).filter((m) => all || m.tier >= 0);
  if (medals.length === 0) return null;
  const shown = medals.find((m) => m.key === open);

  const share = async (m: Medal) => {
    const url = `${window.location.origin}${path}`;
    const text = `${owner ? `${owner} earned` : 'I earned'} the ${m.name} medal on Gazecraft.`;
    // The picture first: the medal, the detective and the name. Where it cannot be made, the line and the link.
    if (card.current) {
      setBusy(true);
      try {
        const file = await cardToFile(card.current, MEDAL_CARD, MEDAL_CARD, `gazecraft-${m.key}.png`);
        const done = await deliver([file], text, url);
        setSaid(done === 'saved' ? 'Saved' : '');
        return;
      } catch {
        /* Fall back to the line and the link. */
      } finally {
        setBusy(false);
      }
    }
    try {
      if (navigator.share) await navigator.share({ title: 'Gazecraft', text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setSaid('Copied');
      }
    } catch {
      /* The player closed the sheet. Nothing to say. */
    }
  };

  return (
    <>
      <ul className={styles.row} data-medals>
        {medals.map((m) => {
          const earned = m.tier >= 0;
          return (
            <li key={m.key}>
              <button
                type="button"
                className={styles.card}
                data-medal={m.key}
                data-earned={earned || undefined}
                aria-label={`${m.name}. ${earned ? 'Earned.' : 'Not earned yet.'}${m.toward ? ` ${m.toward} toward the next.` : ''}`}
                onClick={() => {
                  setSaid('');
                  setOpen(m.key);
                }}
              >
                <MedalFace medal={m} />
                <span className={styles.name}>{m.name}</span>
                {m.progress != null && (
                  <span className={styles.track}>
                    <span className={styles.fill} style={{ width: `${Math.round(m.progress * 100)}%` }} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog open={!!shown} onClose={() => setOpen(null)} label={shown?.name ?? 'Medal'}>
        {shown && (
          <div className={styles.show} data-medal-open={shown.key}>
            <MedalFace medal={shown} size="lg" />
            <h2 className={styles.title}>{shown.name}</h2>
            {shown.toward && (
              <p className={styles.toward}>
                <span className={styles.track}>
                  <span className={styles.fill} style={{ width: `${Math.round((shown.progress ?? 0) * 100)}%` }} />
                </span>
                {shown.toward}
              </p>
            )}
            {shown.tier >= 0 && (
              <Button variant="primary" onClick={() => void share(shown)} disabled={busy}>
                <Icon icon={Share2} size={18} />
                {said || 'Share'}
              </Button>
            )}
            {shown.tier >= 0 && (
              <div className={styles.offstage} aria-hidden="true">
                <MedalCard ref={card} medal={shown} name={name ?? owner ?? 'Gazecraft'} handle={handle} parts={parts} link={shareUrlLabel(path)} />
              </div>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
