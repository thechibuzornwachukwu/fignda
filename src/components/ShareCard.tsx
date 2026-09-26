import { useLayoutEffect, useRef, type ReactNode, type Ref } from 'react';
import type { puzzleCards, resultCard } from '../engine/cards';
import tokens from '../styles/tokens.json';
import { LogoMark } from './Logo';
import styles from './ShareCard.module.css';

export type ResultCardData = ReturnType<typeof resultCard>;
export type PuzzleCardData = ReturnType<typeof puzzleCards>[number];
export type CardData = ResultCardData | PuzzleCardData;

const TEXT_MIN = tokens.shareCard.textMinPx;

/** Fit now, and again once web fonts have loaded (Manrope is wider than the fallback). */
function afterFonts(fit: () => void): () => void {
  let alive = true;
  fit();
  document.fonts?.ready.then(() => alive && fit());
  return () => {
    alive = false;
  };
}

type Props = {
  card: CardData;
  /** Puzzle text still overflows at the smallest allowed size: the caller should paginate further. */
  onOverflow?: () => void;
  ref?: Ref<HTMLDivElement>;
};

/** One share card at its real size (1080 wide). Scale it with ShareCardFrame for previews. */
export function ShareCard({ card, onOverflow, ref }: Props) {
  return card.kind === 'result' ? <Result card={card} ref={ref} /> : <Puzzle card={card} onOverflow={onOverflow} ref={ref} />;
}

/** Preview wrapper: a scaled, clipped window onto a full-size card. */
export function ShareCardFrame({ card, onOverflow }: { card: CardData; onOverflow?: () => void }) {
  return (
    <div className={styles.frame} style={{ width: card.pw, height: card.ph }}>
      <div style={{ transform: `scale(${card.scale})`, transformOrigin: '0 0' }}>
        <ShareCard card={card} onOverflow={onOverflow} />
      </div>
    </div>
  );
}

function Brand({ date, children }: { date: string; children?: ReactNode }) {
  return (
    <div className={styles.top}>
      <div className={styles.brand}>
        <LogoMark size={64} />
        <span className={styles.word}>fignda</span>
      </div>
      <div className={styles.topEnd}>
        {children}
        <span className={styles.date}>{date}</span>
      </div>
    </div>
  );
}

function Footer({ card, line1, line2, cta }: { card: CardData; line1: string; line2: string; cta: string }) {
  return (
    <div className={styles.foot}>
      <div className={styles.who}>
        <span className={styles.avatar} data-guest={card.guest || undefined}>
          {card.initial}
        </span>
        <div className={styles.whoText}>
          <span className={styles.line1}>{line1}</span>
          <span className={styles.line2}>{line2}</span>
        </div>
      </div>
      <div className={styles.cta}>
        <span className={styles.ctaText}>{cta}</span>
        <span className={styles.url}>{card.url}</span>
      </div>
    </div>
  );
}

function Result({ card, ref }: { card: ResultCardData; ref?: Ref<HTMLDivElement> }) {
  const scoreRef = useRef<HTMLSpanElement>(null);

  // Long scores shrink to fit the card width (down to 60% of the design size).
  useLayoutEffect(() => {
    const fit = () => {
      const el = scoreRef.current;
      const row = el?.parentElement;
      if (!el || !row) return;
      let size = card.scoreSize;
      el.style.fontSize = `${size}px`;
      while (el.offsetWidth > row.clientWidth && size > card.scoreSize * 0.6) {
        size -= 2;
        el.style.fontSize = `${size}px`;
      }
    };
    return afterFonts(fit);
  });

  return (
    <div
      ref={ref}
      className={styles.card}
      data-theme={card.theme}
      data-card="result"
      style={{ width: card.w, height: card.h, padding: card.pad, justifyContent: 'space-between' }}
    >
      <Brand date={card.date} />
      <div className={styles.stack} style={{ gap: card.gap }}>
        <div className={styles.heading}>
          <div className={styles.kicker}>{card.kicker}</div>
          <div className={styles.title} style={{ fontSize: card.titleSize }}>
            {card.title}
          </div>
        </div>
        <div className={styles.scoreRow}>
          <span ref={scoreRef} className={styles.score}>
            {card.score}
          </span>
          {card.badge && (
            <span className={styles.badge} data-kind={card.badge === 'Perfect' ? 'perfect' : 'gave-up'}>
              {card.badge}
            </span>
          )}
        </div>
        <div className={styles.stats}>
          <span>{card.found}</span>
          <span className={styles.muted}>{card.time}</span>
          <span className={styles.muted}>{card.hints}</span>
        </div>
        <div className={styles.cells} style={{ gap: card.cellGap }}>
          {card.cells.map((c, i) => (
            <span key={i} className={styles.cell} data-kind={c.kind} style={{ width: c.width, height: card.cellH }} />
          ))}
        </div>
      </div>
      <Footer card={card} line1={card.name} line2={card.handle} cta={card.cta} />
    </div>
  );
}

function Puzzle({ card, onOverflow, ref }: { card: PuzzleCardData; onOverflow?: () => void; ref?: Ref<HTMLDivElement> }) {
  const textRef = useRef<HTMLDivElement>(null);

  // Overflow: step down 1px to 88% of base (never under 38px), then ask for more pages.
  useLayoutEffect(() => {
    const fit = () => {
      const el = textRef.current;
      if (!el) return;
      const min = Math.max(TEXT_MIN, Math.floor(card.textSize * 0.88));
      let size = card.textSize;
      el.style.fontSize = `${size}px`;
      while (el.scrollHeight > el.clientHeight + 1 && size > min) {
        size--;
        el.style.fontSize = `${size}px`;
      }
      const over = el.scrollHeight > el.clientHeight + 1;
      el.dataset.fontSize = String(size);
      el.dataset.overflow = String(over);
      if (over) onOverflow?.();
    };
    return afterFonts(fit);
  });

  return (
    <div
      ref={ref}
      className={styles.card}
      data-theme={card.theme}
      data-card="puzzle"
      style={{ width: card.w, height: card.h, padding: card.pad, gap: card.gap }}
    >
      <Brand date={card.date}>{card.spoiler && <span className={styles.stamp}>Contains answers</span>}</Brand>
      <div className={styles.heading}>
        <div className={styles.kicker}>{card.kicker}</div>
        {card.showTitle && (
          <div className={styles.ptitle} style={{ fontSize: card.titleSize }}>
            {card.ptitle}
          </div>
        )}
      </div>
      <div ref={textRef} className={styles.text} data-text="">
        {card.segs.map((s, i) => (
          <span key={i} className={styles.seg} data-state={s.state || undefined}>
            {s.t}
          </span>
        ))}
      </div>
      <Footer card={card} line1={card.pline} line2={card.pline2} cta="Play this puzzle" />
    </div>
  );
}
