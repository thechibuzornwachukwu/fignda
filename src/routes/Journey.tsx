import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Award, Check, Lock } from 'lucide-react';
import { avatarFor } from '../avatar/draw';
import { guestSeed } from '../avatar/guest';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Ring } from '../components/Ring';
import { Stars } from '../components/Stars';
import { clampStars } from '../components/starsLabel';
import { pick } from '../copy';
import { buildPath, stopStates, type CatalogueItem, type Path, type StopState } from '../engine/journey';
import { games } from '../games/catalog';
import { useAuth } from '../lib/auth';
import { loadFinished } from '../lib/shelves';
import { loadStars } from '../lib/starStore';
import { storage } from '../lib/storage';
import styles from './Journey.module.css';

export type JourneyGame = CatalogueItem & { title: string };

type Props = {
  /** The puzzles the path is made of. Defaults to the catalogue. Null or empty: the empty state. */
  catalogue?: readonly JourneyGame[] | null;
  /** A path built earlier. Stops whose puzzle has left the catalogue are skipped. Defaults to one built from the catalogue. */
  path?: Path | null;
  /** Ids of finished puzzles. Defaults to this browser's. */
  done?: Iterable<string> | null;
  /** Best stars per puzzle id. Defaults to this browser's. A puzzle with stars counts as done. */
  stars?: Readonly<Record<string, unknown>> | null;
  className?: string;
};

/** The stop the player stood on at their last visit, so the avatar can hop from it once. */
export const JOURNEY_AT_KEY = 'gazecraft-journey-at';

/** Steps left and right down a chapter: the winding line. */
const SWAY = [0, 1, 2, 1, 0, -1, -2, -1] as const;
const AVATAR = { stop: 56, big: 68, finished: 56 } as const;

type StopView = { id: string; title: string; state: StopState; stars: 0 | 1 | 2 | 3; big: boolean; shift: number };
type ChapterView = { id: string; title: string; stops: StopView[]; done: number; state: 'done' | 'open' | 'locked'; line: string };

const EMPTY: Path = { chapters: [] };

function safePath(catalogue: readonly JourneyGame[]): Path {
  try {
    return buildPath(catalogue);
  } catch {
    return EMPTY;
  }
}

/**
 * The path on the Games tab: chapters of round stops on a winding line. A list of links in order.
 * Done stops can be replayed, the next one carries the player's avatar, the rest are locked.
 */
export function Journey({ catalogue = games, path, done, stars, className }: Props) {
  const { profile } = useAuth();
  const headId = useId();
  const starter = useMemo(() => avatarFor(guestSeed()), []);
  const browser = useMemo(() => ({ finished: loadFinished(), stars: loadStars() }), []);
  const [cameFrom] = useState(() => storage.get(JOURNEY_AT_KEY));

  const view = useMemo(() => {
    const list = Array.isArray(catalogue) ? (catalogue as readonly JourneyGame[]) : [];
    const titles = new Map(list.map((g) => [g.id, g.title || g.id]));
    const built = path && Array.isArray(path.chapters) ? path : safePath(list);
    const best = stars ?? browser.stars;
    const starOf = (id: string) => clampStars(best[id]);
    const finished = new Set<string>(done ?? browser.finished);
    for (const id of Object.keys(best)) if (starOf(id) > 0) finished.add(id);

    const standing = stopStates(built, finished, new Set(titles.keys()));
    const nextTitle = standing.next ? (titles.get(standing.next) ?? standing.next) : '';
    const chapters: ChapterView[] = [];
    built.chapters.forEach((c, ci) => {
      const mine = standing.stops.filter((s) => s.chapter === ci);
      // Every puzzle of the chapter has left the catalogue: nothing to draw.
      if (!mine.length) return;
      const dir = chapters.length % 2 ? -1 : 1;
      const stops = mine.map((s, i) => ({
        id: s.id,
        title: titles.get(s.id) ?? s.id,
        state: s.state,
        stars: s.state === 'done' ? starOf(s.id) : 0,
        big: i === mine.length - 1,
        shift: SWAY[i % SWAY.length]! * dir,
      }));
      const doneCount = stops.filter((s) => s.state === 'done').length;
      const state = doneCount === stops.length ? 'done' : stops[0]!.state === 'locked' ? 'locked' : 'open';
      chapters.push({ id: c.id, title: c.title, stops, done: doneCount, state, line: state === 'done' ? pick('chapterDone', { c: c.title }) : '' });
    });
    const total = standing.stops.length;
    return {
      chapters,
      walked: new Set(standing.stops.filter((x) => x.state === 'done').map((x) => x.id)),
      total,
      doneCount: standing.stops.filter((s) => s.state === 'done').length,
      next: standing.next,
      complete: standing.complete,
      locked: nextTitle ? pick('journeyLocked', { title: nextTitle }) : '',
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
          {view.line}
        </p>
      )}
      {state === 'complete' && (
        <div className={styles.finished} data-journey-note="complete">
          {me(AVATAR.finished)}
          <p className={styles.finishedLine}>{view.line}</p>
        </div>
      )}

      {view.chapters.map((c) => {
        const n = c.stops.length;
        return (
          <section key={c.id} className={styles.chapter} aria-labelledby={`${headId}-${c.id}`} data-chapter={c.id} data-state={c.state}>
            <header className={styles.chapterHead}>
              <div className={styles.chapterText}>
                <h3 id={`${headId}-${c.id}`} className={styles.chapterTitle}>
                  {c.title}
                </h3>
                <p className={styles.chapterCount}>{pick('journeyCount', { n: c.done, t: n })}</p>
              </div>
              {c.state === 'done' && (
                <p className={styles.badge} data-chapter-badge>
                  <Icon icon={Award} size={20} />
                  {c.line}
                </p>
              )}
            </header>

            <div className={styles.track} style={{ '--count': n } as CSSProperties}>
              {n > 1 && (
                <svg className={styles.line} viewBox={`-2 0 4 ${n - 1}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
                  {c.stops.slice(0, -1).map((a, i) => {
                    const b = c.stops[i + 1]!;
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
              <ol className={styles.stops}>
                {c.stops.map((s, i) => {
                  const last = s.big ? 'Last stop of the chapter. ' : '';
                  const prev = c.stops[i - 1];
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
                        {s.big && tag('Last stop')}
                        <span className={styles.name}>{s.title}</span>
                        <span className={styles.srOnly}>
                          . Locked. {last}
                          {view.locked}
                        </span>
                      </span>
                    );
                  } else if (s.state === 'next') {
                    // The avatar hops in once, from the stop it stood on last time, if that stop is now done.
                    const moved = !!cameFrom && view.walked.has(cameFrom);
                    const hop = !moved ? undefined : prev?.id === cameFrom ? 'arc' : 'drop';
                    body = (
                      <Link to={`/play/${s.id}`} className={styles.link} aria-current="step">
                        {slot(
                          <span className={styles.rider} data-hop={hop} style={{ '--hop-x': hop === 'arc' ? prev!.shift - s.shift : 0 } as CSSProperties}>
                            {me(s.big ? AVATAR.big : AVATAR.stop)}
                          </span>,
                        )}
                        {tag('Next stop')}
                        <span className={styles.name}>{s.title}</span>
                        <span className={styles.srOnly}>. Next stop. {last}Play.</span>
                      </Link>
                    );
                  } else {
                    body = (
                      <Link to={`/play/${s.id}`} className={styles.link}>
                        {slot(<Icon icon={Check} size={20} />)}
                        {s.big && tag('Last stop')}
                        <span className={styles.name}>{s.title}</span>
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
                    <li key={s.id} className={styles.stop} data-stop={s.id} data-state={s.state} data-big={s.big || undefined} style={{ '--shift': s.shift } as CSSProperties}>
                      {body}
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        );
      })}
    </section>
  );
}
