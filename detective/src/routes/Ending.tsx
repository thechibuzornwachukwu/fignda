import { ArrowLeft, Award } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { characterFor } from '../avatar/draw';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Stars } from '../components/Stars';
import { IconLink } from '../components/IconLink';
import { TextLink } from '../components/TextLink';
import { pick } from '../copy';
import { faceSeed, roleLabel, type Chapter } from '../engine/chapter';
import { useAuth } from '../lib/auth';
import { useCase } from '../lib/cold';
import deck from './Ending.module.css';
import styles from './LineUp.module.css';

/** What was found, what they say, what came after: 1 card each. */
const CARDS = 3;

/**
 * The ending of a written chapter (SPEC section 6, Ending), whatever its shape and whichever step closed it. It
 * is read a card at a time: who it was beside what was found, what they say, and what is still undecided. It
 * draws no lesson.
 */
export function Ending({ chapter, stars, msg }: { chapter: Chapter; stars: number; msg?: string }) {
  const { cold, base } = useCase(chapter.id);
  const auth = useAuth();
  const guest = auth.enabled && !auth.profile && !cold;
  const keep = useMemo(() => pick('chapterKeep'), []);
  const culprit = chapter.suspects.find((s) => s.who === chapter.culprit)!;
  const [at, setAt] = useState(0);
  const row = useRef<HTMLDivElement>(null);
  const last = at === CARDS - 1;

  const go = (i: number) => {
    setAt(i);
    const el = row.current;
    // The cards scroll sideways by themselves under a thumb. A tap moves them the same way.
    el?.scrollTo?.({ left: i * el.clientWidth });
  };

  return (
    <div className={styles.screen} data-ending={chapter.id}>
      <div className={styles.top}>
        <IconLink to={base} icon={ArrowLeft} label="The board" />
        <span className={deck.earned}>
          {cold && (
            <span className={deck.seal} data-seal>
              <Icon icon={Award} size={18} label="Gold seal" />
            </span>
          )}
          <Stars value={stars as 0 | 1 | 2 | 3} size={20} />
        </span>
      </div>
      <h1 className={styles.title}>Case closed</h1>
      {msg && <p className={styles.line}>{msg}</p>}
      <div
        ref={row}
        className={deck.cards}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth > 0) setAt(Math.min(CARDS - 1, Math.round(el.scrollLeft / el.clientWidth)));
        }}
        data-cards={at + 1}
      >
        <section className={deck.card} aria-label="What was found">
          <div className={styles.reveal}>
            <span className={styles.culprit} data-culprit-photo>
              <Avatar parts={characterFor(faceSeed(chapter, culprit.who), culprit.look)} size={96} />
              <span className={styles.name}>{culprit.name}</span>
              <span className={styles.role}>{roleLabel(culprit.who)}</span>
            </span>
            <p className={styles.slip} data-found>
              {chapter.ending.found}
            </p>
          </div>
        </section>
        <section className={deck.card} aria-label={`What ${culprit.name} says`}>
          <blockquote className={styles.confession} data-confession>
            &ldquo;{chapter.ending.confession}&rdquo;
          </blockquote>
        </section>
        <section className={deck.card} aria-label="What came after">
          <p className={styles.after} data-after>
            {chapter.ending.after}
          </p>
        </section>
      </div>
      <div className={deck.foot}>
        {last ? (
          <Button variant="accent" to="/cases">
            Back to cases
          </Button>
        ) : (
          <Button variant="accent" onClick={() => go(at + 1)}>
            Next
          </Button>
        )}
        <span className={deck.dots}>
          {Array.from({ length: CARDS }, (_, i) => (
            <button key={i} type="button" className={deck.dot} aria-label={`Card ${i + 1} of ${CARDS}`} aria-current={i === at || undefined} onClick={() => go(i)} />
          ))}
        </span>
      </div>
      {guest && last && (
        <p className={styles.line} data-keep>
          {keep} <TextLink to={`/signin?next=${encodeURIComponent('/cases')}`}>Sign in</TextLink>
        </p>
      )}
    </div>
  );
}
