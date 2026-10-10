import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Award, Check, Lock } from 'lucide-react';
import { avatarFor } from '../avatar/draw';
import { guestSeed } from '../avatar/guest';
import { Avatar } from '../components/Avatar';
import { Culprit, SecretSlots } from '../components/CaseFile';
import { Icon } from '../components/Icon';
import { Partner } from '../components/Partner';
import { Ring } from '../components/Ring';
import { Stars } from '../components/Stars';
import { clampStars } from '../components/starsLabel';
import { pick } from '../copy';
import { buildPath, clueStates, type CatalogueItem, type ClueState, type Path } from '../engine/journey';
import { caseFile } from '../games/caseFile';
import { games } from '../games/catalog';
import { useAuth } from '../lib/auth';
import { PROGRESS_EVENT } from '../lib/progress';
import { loadFinished } from '../lib/shelves';
import { loadStars } from '../lib/starStore';
import { storage } from '../lib/storage';
import styles from './Journey.module.css';

export type JourneyGame = CatalogueItem & { title: string };

type Props = {
  /** The puzzles the path is made of. Defaults to the catalogue. Null or empty: the empty state. */
  catalogue?: readonly JourneyGame[] | null;
  /** A path built earlier. Cases whose puzzle has left the catalogue are skipped. Defaults to one built from the catalogue. */
  path?: Path | null;
  /** Ids of finished clues. A puzzle's own id closes its whole case. Defaults to this browser's. */
  done?: Iterable<string> | null;
  /** Best stars per clue id. Defaults to this browser's. A clue with stars counts as done. */
  stars?: Readonly<Record<string, unknown>> | null;
  className?: string;
};

/** The clue the player stood on at their last visit, so the avatar can hop from it once. */
export const JOURNEY_AT_KEY = 'gazecraft-journey-at';

/** Steps left and right down a case: the winding line. */
const SWAY = [0, 1, 2, 1, 0, -1, -2, -1] as const;
const AVATAR = { clue: 56, big: 68, finished: 56 } as const;

type ClueView = { id: string; to: string; name: string; state: ClueState; stars: 0 | 1 | 2 | 3; big: boolean; shift: number };
type CaseView = { id: string; title: string; clues: ClueView[]; state: 'done' | 'open' | 'locked'; stars: 0 | 1 | 2 | 3; count: string; line: string; /** The case being worked: its opening line and the secret so far. */ open: string; slots: string[] };

const EMPTY: Path = { cases: [] };

function safePath(catalogue: readonly JourneyGame[]): Path {
  try {
    return buildPath(catalogue);
  } catch {
    return EMPTY;
  }
}

/**
 * The path on the Games tab: a card per case, and the clues of the case being worked as round discs on a winding
 * line. A list of links in order. Done clues can be replayed, the next one carries the player's avatar, the rest
 * are locked. A closed case is a link to its whole puzzle.
 */
export function Journey({ catalogue = games, path, done, stars, className }: Props) {
  const { profile } = useAuth();
  const headId = useId();
  const starter = useMemo(() => avatarFor(guestSeed()), []);
  // Read again when the account brings clues done on another device.
  const [rev, setRev] = useState(0);
  useEffect(() => {
    const on = () => setRev((v) => v + 1);
    window.addEventListener(PROGRESS_EVENT, on);
    return () => window.removeEventListener(PROGRESS_EVENT, on);
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `rev` is the reason to read storage again
  const browser = useMemo(() => ({ finished: loadFinished(), stars: loadStars() }), [rev]);
  const [cameFrom] = useState(() => storage.get(JOURNEY_AT_KEY));

  const view = useMemo(() => {
    const list = Array.isArray(catalogue) ? (catalogue as readonly JourneyGame[]) : [];
    const titles = new Map(list.map((g) => [g.id, g.title || g.id]));
    const built = path && Array.isArray(path.cases) ? path : safePath(list);
    const best = stars ?? browser.stars;
    const starOf = (id: string) => clampStars(best[id]);
    const finished = new Set<string>(done ?? browser.finished);
    for (const id of Object.keys(best)) if (starOf(id) > 0) finished.add(id);

    const standing = clueStates(built, finished, new Set(titles.keys()));
    const next = standing.clues.find((s) => s.state === 'next');
    const cases: CaseView[] = [];
    built.cases.forEach((c, ci) => {
      const mine = standing.clues.filter((s) => s.case === ci);
      // The puzzle has left the catalogue: nothing to draw.
      if (!mine.length) return;
      const title = titles.get(c.id) ?? c.id;
      const left = standing.left[ci]!;
      const state = left === 0 ? 'done' : next?.case === ci ? 'open' : 'locked';
      const clues = mine.map((s, i) => ({
        id: s.id,
        to: s.n ? `/play/${s.puzzle}/${s.n}` : `/play/${s.puzzle}`,
        name: s.n ? `Clue ${s.n}` : 'Unmasking',
        state: s.state,
        stars: s.state === 'done' ? starOf(s.id) : 0,
        big: i === mine.length - 1,
        shift: SWAY[i % SWAY.length]!,
      }));
      // The secret so far, for the case being worked. None for a puzzle that is not in the catalogue.
      const file = state === 'open' ? caseFile(c.id, finished) : undefined;
      cases.push({
        id: c.id,
        title,
        clues,
        state,
        stars: state === 'done' ? starOf(c.id) : 0,
        count: state === 'done' ? '' : pick(left === 1 ? 'clueLeft' : 'cluesLeft', { n: left }),
        line: state === 'done' ? pick('caseDone', { c: title }) : '',
        open: file ? pick('caseOpen', { n: clues.length }) : '',
        slots: file?.slots ?? [],
      });
    });
    const total = standing.clues.length;
    const walked = standing.clues.filter((s) => s.state === 'done');
    return {
      cases,
      walked: new Set(walked.map((s) => s.id)),
      total,
      doneCount: walked.length,
      next: standing.next,
      complete: standing.complete,
      lockedClue: next ? pick('journeyLocked', { title: next.n ? `clue ${next.n}` : 'the unmasking' }) : '',
      lockedCase: next ? pick('journeyLocked', { title: titles.get(next.puzzle) ?? next.puzzle }) : '',
      line: standing.complete ? pick('journeyDone') : total === 0 ? pick('journeyEmpty') : '',
    };
  }, [catalogue, path, done, stars, browser]);
  useEffect(() => {
    if (view.next) storage.set(JOURNEY_AT_KEY, view.next);
    else storage.remove(JOURNEY_AT_KEY);
  }, [view.next]);

  const me = (size: number) => (profile ? <Avatar handle={profile.handle} size={size} /> : <Avatar parts={starter} size={size} />);
  const state = view.total === 0 ? 'empty' : view.complete ? 'complete' : 'going';

  return (
    <section className={[styles.journey, className].filter(Boolean).join(' ')} aria-labelledby={headId} data-journey={state}>
      <header className={styles.head}>
        <h2 id={headId} className={styles.title}>
          Your path
        </h2>
        {view.total > 0 && (
          <p className={styles.count}>
            <Ring value={view.doneCount / view.total} label="Path progress" />
            {pick('journeyCount', { n: view.doneCount, t: view.total })}
          </p>
        )}
      </header>

      {state === 'empty' && (
        <p className={styles.note} data-journey-note="empty">
          <Partner moment="empty" size={40} />
          {view.line}
        </p>
      )}
      {state === 'complete' && (
        <div className={styles.finished} data-journey-note="complete">
          {me(AVATAR.finished)}
          <p className={styles.finishedLine}>{view.line}</p>
        </div>
      )}

      {view.cases.map((c) => {
        const n = c.clues.length;
        return (
          <section key={c.id} className={styles.case} aria-labelledby={`${headId}-${c.id}`} data-case={c.id} data-state={c.state}>
            <header className={styles.caseHead}>
              <div className={styles.caseText}>
                <h3 id={`${headId}-${c.id}`} className={styles.caseTitle}>
                  {c.state === 'done' ? (
                    <Link to={`/play/${c.id}`} className={styles.caseLink}>
                      {c.title}
                      <span className={styles.srOnly}>. Closed. Play again.</span>
                    </Link>
                  ) : (
                    c.title
                  )}
                </h3>
                {c.state !== 'done' && <p className={styles.caseCount}>{c.count}</p>}
                {c.stars > 0 && <Stars value={c.stars} pop={c.id === cameFrom} />}
              </div>
              {c.state === 'done' && (
                <p className={styles.badge} data-case-badge>
                  <Icon icon={Award} size={20} />
                  {c.line}
                </p>
              )}
              {c.state === 'locked' && (
                <p className={styles.lock} data-case-lock>
                  <Icon icon={Lock} size={20} />
                  <span className={styles.srOnly}>Locked. {view.lockedCase}</span>
                </p>
              )}
            </header>

            {c.state === 'open' && c.slots.length > 0 && (
              <div className={styles.file} data-case-file>
                <Culprit id={c.id} size={48} state="masked" />
                <div className={styles.fileText}>
                  <p className={styles.fileLine}>{c.open}</p>
                  <SecretSlots slots={c.slots} />
                </div>
              </div>
            )}

            {c.state === 'open' && (
              <div className={styles.track} style={{ '--count': n } as CSSProperties}>
                {n > 1 && (
                  <svg className={styles.line} viewBox={`-2 0 4 ${n - 1}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
                    {c.clues.slice(0, -1).map((a, i) => {
                      const b = c.clues[i + 1]!;
                      const walked = a.state === 'done' && b.state !== 'locked';
                      return (
                        <path
                          key={a.id}
                          className={walked ? styles.walked : styles.ahead}
                          data-line={walked ? 'walked' : 'ahead'}
                          d={`M${a.shift} ${i} C${a.shift} ${i + 0.5} ${b.shift} ${i + 0.5} ${b.shift} ${i + 1}`}
                          strokeWidth={3}
                          strokeDasharray={walked ? undefined : '1 9'}
                        />
                      );
                    })}
                  </svg>
                )}
                <ol className={styles.clues}>
                  {c.clues.map((s, i) => {
                    const last = s.big ? 'The last clue of the case. ' : '';
                    const prev = c.clues[i - 1];
                    const slot = (inside: ReactNode) => (
                      <span className={styles.slot}>
                        <span className={styles.disc}>{inside}</span>
                      </span>
                    );
                    const tag = (text: string) => (
                      <span className={styles.tag} aria-hidden="true">
                        {text}
                      </span>
                    );
                    let body: ReactNode;
                    if (s.state === 'locked') {
                      body = (
                        <span className={styles.link} aria-disabled="true">
                          {slot(<Icon icon={Lock} size={20} />)}
                          {s.big && tag('Last clue')}
                          <span className={styles.name}>{s.name}</span>
                          <span className={styles.srOnly}>
                            . Locked. {last}
                            {view.lockedClue}
                          </span>
                        </span>
                      );
                    } else if (s.state === 'next') {
                      // The avatar hops in once, from the clue it stood on last time, if that clue is now done.
                      const moved = !!cameFrom && view.walked.has(cameFrom);
                      const hop = !moved ? undefined : prev?.id === cameFrom ? 'arc' : 'drop';
                      body = (
                        <Link to={s.to} className={styles.link} aria-current="step">
                          {slot(
                            <span className={styles.rider} data-hop={hop} style={{ '--hop-x': hop === 'arc' ? prev!.shift - s.shift : 0 } as CSSProperties}>
                              {me(s.big ? AVATAR.big : AVATAR.clue)}
                            </span>,
                          )}
                          {tag('Next clue')}
                          <span className={styles.name}>{s.name}</span>
                          <span className={styles.srOnly}>. Next clue. {last}Play.</span>
                        </Link>
                      );
                    } else {
                      body = (
                        <Link to={s.to} className={styles.link}>
                          {slot(<Icon icon={Check} size={20} />)}
                          {s.big && tag('Last clue')}
                          <span className={styles.name}>{s.name}</span>
                          <span className={styles.srOnly}>. Done. {last}</span>{' '}
                          {s.stars > 0 && (
                            <>
                              <Stars value={s.stars} pop={s.id === cameFrom} />
                              <span className={styles.srOnly}>.</span>{' '}
                            </>
                          )}
                          <span className={styles.srOnly}>Play again.</span>
                        </Link>
                      );
                    }
                    return (
                      <li key={s.id} className={styles.clue} data-clue={s.id} data-state={s.state} data-big={s.big || undefined} style={{ '--shift': s.shift } as CSSProperties}>
                        {body}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </section>
        );
      })}
    </section>
  );
}