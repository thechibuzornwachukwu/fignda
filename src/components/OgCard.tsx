import { excerptRange } from '../engine/excerpt';
import { answersFrom } from '../engine/cards';
import { buildHiddenWords } from '../engine/hiddenWords';
import { rangeText, sentences, toChars } from '../engine/text';
import { LogoMark } from './Logo';
import styles from './OgCard.module.css';

export type OgInput =
  | { kind: 'default' }
  | { kind: 'game'; title: string; noun: string; text: string; dict: readonly string[]; daily?: boolean };

/**
 * Link preview image, 1200x630. Same language as the share cards: dark ink, Manrope, lime mark.
 * Never shows answers or highlights. Daily previews never show the count.
 */
export function OgCard({ input }: { input: OgInput }) {
  if (input.kind === 'default') {
    return (
      <div className={styles.og} data-theme="dark" data-og="">
        <Brand />
        <div className={styles.body}>
          <div className={styles.display}>
            Find it.
            <br />
            <span className={styles.sub}>Figure it out.</span>
          </div>
        </div>
        <Foot left="Words hide across letters, spaces and punctuation." />
      </div>
    );
  }

  const p = buildHiddenWords({ text: input.text, dict: input.dict });
  const { chars } = toChars(input.text);
  const sents = sentences(input.text, chars);
  const r = excerptRange(sents, answersFrom(input.text, p.answers.map((a) => a.key)), 150, () => true);
  const excerpt = r ? rangeText(chars, sents, r[0], r[1]) : '';
  const cut = r && r[1] < sents.length - 1 ? `${excerpt} …` : excerpt;
  const question = input.daily
    ? `How many ${input.noun} can you find?`
    : `Can you find ${p.answers.length} ${input.noun}?`;

  return (
    <div className={styles.og} data-theme="dark" data-og="">
      <Brand kicker={input.daily ? 'Daily puzzle' : input.title} />
      <div className={styles.body}>
        <div className={styles.question}>{question}</div>
        <div className={styles.excerpt}>{cut}</div>
      </div>
      <Foot left="Play this puzzle" />
    </div>
  );
}

function Brand({ kicker }: { kicker?: string }) {
  return (
    <div className={styles.top}>
      <div className={styles.brand}>
        <LogoMark size={56} />
        <span className={styles.word}>fignda</span>
      </div>
      {kicker && <span className={styles.kicker}>{kicker}</span>}
    </div>
  );
}

function Foot({ left }: { left: string }) {
  return (
    <div className={styles.foot}>
      <span className={styles.footLeft}>{left}</span>
      <span className={styles.url}>fignda.pages.dev</span>
    </div>
  );
}
