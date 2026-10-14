import { characterFor } from '../avatar/draw';
import { CLEAR_STARS, faceSeed, roleLabel, type Chapter, type Proof } from '../engine/chapter';
import { Avatar } from './Avatar';
import styles from './StepResult.module.css';

type Props = {
  chapter: Chapter;
  /** The step, counted from 1. */
  at: number;
  /** The best stars this player has on it. */
  stars: number;
};

const PROOF_LABEL: Record<Proof, string> = { chance: 'Chance', means: 'Means', motive: 'Motive' };
/** The order a case is worked in: when, then how, then why. */
const ORDER: readonly Proof[] = ['chance', 'means', 'motive'];

/**
 * What a step leaves behind (SPEC section 6, Step): the fact on a pinned slip, the suspect it clears as a taped
 * photo, and means, motive and chance as 3 tags that fill in across the case. Drawn as the case board is.
 */
export function StepResult({ chapter, at, stars }: Props) {
  const step = chapter.steps[at - 1];
  if (!step) return null;
  const suspect = chapter.suspects.find((s) => s.who === step.clears);
  const cleared = !!suspect && stars >= CLEAR_STARS;
  const before = new Set(chapter.steps.slice(0, at - 1).flatMap((s) => (s.gives ? [s.gives] : [])));
  const tagged = step.gives != null || before.size > 0;
  const said = ORDER.map((p) => `${PROOF_LABEL[p]}: ${p === step.gives ? 'found on this step' : before.has(p) ? 'found' : 'not yet'}`).join('. ');

  return (
    <div className={styles.result} data-step-result>
      <div className={styles.row}>
        <p className={styles.slip} data-fact>
          {step.fact}
        </p>
        {suspect && (
          <span className={styles.photo} data-suspect={suspect.who} data-cleared={cleared || undefined}>
            <span className={styles.portrait}>
              <Avatar parts={characterFor(faceSeed(chapter, suspect.who), suspect.look)} size={56} />
            </span>
            <span className={styles.name} title={suspect.name}>
              {suspect.name}
            </span>
            <span className={styles.role} title={roleLabel(suspect.who)}>
              {roleLabel(suspect.who)}
            </span>
            {cleared && <span className={styles.tape}>Cleared</span>}
          </span>
        )}
      </div>
      {tagged && (
        <div className={styles.tags} role="img" aria-label={`${said}.`}>
          {ORDER.map((p) => (
            <span key={p} className={styles.tag} data-proof={p} data-state={p === step.gives ? 'new' : before.has(p) ? 'had' : 'open'}>
              {PROOF_LABEL[p]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
