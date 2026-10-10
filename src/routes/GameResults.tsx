import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { clampStars, Stars } from '../components/Stars';
import { formatTime } from '../engine/time';
import styles from './GameResults.module.css';

type Props = {
  title: string;
  line: string;
  score: number;
  found: number;
  total: number;
  secs: number;
  canReplay: boolean;
  onReplay: () => void;
  onShare: () => void;
  /** Copies or shares the text result. Resolves to the line to show ("Copied."). */
  onText: () => Promise<string>;
  /** A sitting: where the next one is. It leads the actions and takes the accent from Share. */
  next?: { to: string; label: string };
  /** Where this game's board lives, if it has one. */
  boardPath?: string;
  guest: boolean;
  /** For a guest, in place of the plain ask: their place today, or where their run lives. */
  guestLine?: string;
  /** Your run of dailies, said once after a daily. */
  streak?: string;
  /** "Only 8% found Habakkuk." */
  rare?: string;
  /** Stars for a catalogue puzzle played alone. 0 or missing: no stars shown. */
  stars?: number;
  /** Said beside the stars when this play raised them. */
  starsUp?: string;
  /** Skill lines, rarest first: clean read, no-hint perfect, deep find, long word. The caller sends 2 at most. */
  skills?: readonly string[];
  /** One line per personal record this play beat. */
  records?: readonly string[];
  /** After today's daily: "Today hid 11. Most days hide 8." */
  day?: string;
  /** After today's daily: one calm line that the day is done. */
  done?: string;
  /** A sponsored puzzle: "With NAME" and, when there is one, the sponsor's link and its site name. */
  sponsor?: { line: string; url?: string; host?: string; /** The link was opened. */ onVisit?: () => void };
  /** Extra actions under the result (the reminder ask). */
  children?: ReactNode;
};

/** Lines worth a paragraph: no blanks, none twice. */
const lines = (l?: readonly string[]) => [...new Set((l ?? []).filter((x) => typeof x === 'string' && x.trim() !== ''))];

export function GameResults({ title, line, score, found, total, secs, canReplay, onReplay, onShare, onText, next, boardPath, guest, guestLine, streak, rare, stars, starsUp, skills, records, day, done, sponsor, children }: Props) {
  const { pathname } = useLocation();
  const [note, setNote] = useState('');
  const earned = clampStars(stars);
  return (
    <section className={styles.results} aria-labelledby="results-title">
      <div className={styles.head}>
        <h2 id="results-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.line}>
          {line}
          {boardPath && (
            <>
              {' '}
              <Link to={boardPath} className={styles.board}>
                See the leaderboard
              </Link>
            </>
          )}
        </p>
        {earned > 0 && (
          <p className={styles.stars}>
            <Stars value={earned} size={20} pop={!!starsUp} />
            {starsUp && <span>{starsUp}</span>}
          </p>
        )}
        {lines(skills).map((l) => (
          <p key={l} className={styles.streak}>
            {l}
          </p>
        ))}
        {lines(records).map((l) => (
          <p key={l} className={styles.streak}>
            {l}
          </p>
        ))}
        {rare && <p className={styles.streak}>{rare}</p>}
        {day && <p className={styles.streak}>{day}</p>}
        {streak && <p className={styles.streak}>{streak}</p>}
        {done && <p className={styles.streak}>{done}</p>}
        {sponsor?.line && (
          <p className={styles.with}>
            {sponsor.line}
            {sponsor.url && sponsor.host && (
              <>
                {' · '}
                <a href={sponsor.url} target="_blank" rel="sponsored noopener" className={styles.board} onClick={sponsor.onVisit} onAuxClick={sponsor.onVisit}>
                  {sponsor.host}
                </a>
              </>
            )}
          </p>
        )}
      </div>
      <div className={styles.row}>
        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>Score</dt>
            <dd className={styles.statValue}>{score.toLocaleString('en-US')}</dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>Found</dt>
            <dd className={styles.statValue}>
              {found}/{total}
            </dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>Time</dt>
            <dd className={styles.statValue}>{formatTime(secs)}</dd>
          </div>
        </dl>
        <div className={styles.actions}>
          {next && (
            <Button variant="accent" to={next.to}>
              {next.label}
              <Icon icon={ArrowRight} size={16} />
            </Button>
          )}
          {canReplay && (
            <Button variant="secondary" onClick={onReplay}>
              Play again
            </Button>
          )}
          <Button variant="secondary" to="/play">
            More games
          </Button>
          <Button variant="secondary" onClick={() => void onText().then(setNote)}>
            Copy result
          </Button>
          {/* One accent a screen: on a sitting it is the way on, so Share steps back. */}
          <Button variant={next ? 'secondary' : 'accent'} onClick={onShare}>
            Share
            {!next && <Icon icon={ArrowRight} size={16} />}
          </Button>
        </div>
      </div>
      <p className={styles.note} role="status">
        {note}
      </p>
      {children}
      {guest && (
        <div className={styles.guest}>
          <span className={styles.guestText}>
            {guestLine || 'You are playing as a guest. Sign in and this score goes with you, with your streak and your name on shared cards.'}
          </span>
          {/* The first time sign in is offered (SPEC section 6, The first minute). /welcome sends an existing player straight on. */}
          <Link className={styles.signin} to={`/welcome?from=${encodeURIComponent(pathname)}`}>
            Keep this score
          </Link>
        </div>
      )}
    </section>
  );
}
