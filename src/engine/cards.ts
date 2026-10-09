// Share card data builders. Pure. Port of design/reference/cards.js.
// Returns semantic view models; ShareCard (M7) maps states to tokens.

import tokens from '../styles/tokens.json';
import { excerptRange, inside, type SpanAnswer } from './excerpt';
import { paginate, type Range } from './paginate';
import { sentences, toChars } from './text';
import { formatTime } from './time';

export type Ratio = '1:1' | '4:5' | '9:16';

type Layout = {
  w: number;
  h: number;
  pad: string;
  title: number;
  score: number;
  cellH: number;
  unit: number;
  gap: number;
  pgap: number;
  cellGap: number;
  /** Base puzzle text size. Never under `shareCard.textMinPx`. */
  text: number;
  /** Char budgets from tokens.json `shareCard.charBudget`. */
  first: number;
  next: number;
  /** Puzzle title size as a share of `title`. */
  ptitle: number;
};

const SC = tokens.shareCard;
const layout = (ratio: Ratio, l: Omit<Layout, 'w' | 'h' | 'pad' | 'first' | 'next'>): Layout => ({
  w: SC.width,
  h: SC.ratios[ratio].h,
  pad: SC.ratios[ratio].pad,
  first: SC.charBudget[ratio].first,
  next: SC.charBudget[ratio].next,
  ...l,
});

export const RATIOS: Record<Ratio, Layout> = {
  '1:1': layout('1:1', { title: 92, score: 230, cellH: 26, unit: 9, gap: 40, pgap: 32, cellGap: 10, text: 38, ptitle: 0.6 }),
  '4:5': layout('4:5', { title: 104, score: 290, cellH: 32, unit: 10, gap: 56, pgap: 48, cellGap: 12, text: 40, ptitle: 0.68 }),
  '9:16': layout('9:16', { title: 116, score: 300, cellH: 40, unit: 11, gap: 72, pgap: 56, cellGap: 14, text: 42, ptitle: 0.7 }),
};

/** First occurrence of each key in the letter stream. Keys not present are dropped. */
export function answersFrom(text: string, keys: readonly string[]): SpanAnswer[] {
  const S = text.toLowerCase().replace(/[^a-z]/g, '');
  return keys
    .map((key): SpanAnswer => {
      const i = S.indexOf(key);
      return { key, span: [i, i + key.length - 1] };
    })
    .filter((a) => a.span[0] >= 0);
}

export type CardInput = {
  ratio: Ratio;
  answers: readonly SpanAnswer[];
  secs: number;
  theme?: 'dark' | 'light';
  label?: string;
  caption?: string;
  date?: string;
  kicker?: string;
  url?: string;
  /** Signed-in display name. Absent means guest. */
  name?: string;
  handle?: string;
  /** Preview width in px. Scale = previewW / 1080. */
  previewW?: number;
  /** Daily: hide the total. */
  hideCount?: boolean;
  /** A sponsored puzzle: the "With NAME" line, and the sponsor's site name beside it. */
  sponsor?: string;
  sponsorHost?: string;
};

function base(o: CardInput, r: Layout) {
  const scale = (o.previewW ?? 324) / r.w;
  const name = o.name?.trim() ?? '';
  const guest = !name;
  return {
    theme: o.theme ?? 'dark',
    label: o.label ?? '',
    caption: o.caption ?? '',
    w: r.w,
    h: r.h,
    pw: Math.round(r.w * scale),
    ph: Math.round(r.h * scale),
    scale,
    pad: r.pad,
    date: o.date ?? '',
    kicker: o.kicker ?? '',
    url: o.url ?? 'gazecraft.com',
    sponsor: o.sponsor?.trim() ?? '',
    // A site name with no mark beside it would read as ours.
    sponsorHost: o.sponsor?.trim() ? (o.sponsorHost?.trim() ?? '') : '',
    guest,
    initial: guest ? 'f' : name.charAt(0).toUpperCase(),
    first: guest ? 'A guest' : name.split(/\s+/)[0]!,
  };
}

export type CellKind = 'found' | 'hint' | 'missed';

export type ResultCardInput = CardInput & { title?: string; hints?: number; score?: number };

export function resultCard(o: ResultCardInput) {
  const r = RATIOS[o.ratio];
  const answers = o.answers;
  const total = answers.length;
  let fcount = 0;
  let hints = 0;
  const cells = (o.hideCount ? answers.filter((a) => a.found) : answers).map((a) => {
    if (a.found) fcount++;
    if (a.hinted) hints++;
    const kind: CellKind = !a.found ? 'missed' : a.hinted ? 'hint' : 'found';
    return { width: (a.span[1] - a.span[0] + 1) * r.unit + 16, kind };
  });
  if (o.hints != null) hints = o.hints;
  if (o.hideCount) fcount = answers.filter((a) => a.found).length;
  const perfect = fcount === total && hints === 0;
  const score =
    o.score ?? Math.max(0, fcount * 100 - hints * 25 + (fcount === total ? Math.max(0, 600 - o.secs) : 0));
  const title = o.title ?? '';
  const b = base(o, r);
  return {
    ...b,
    kind: 'result' as const,
    gap: r.gap,
    cellGap: r.cellGap,
    cellH: r.cellH,
    titleSize: title.length > 22 ? Math.round(r.title * 0.72) : r.title,
    scoreSize: r.score,
    title,
    score: score.toLocaleString('en-US'),
    badge: perfect ? ('Perfect' as const) : fcount === 0 ? ('Gave up' as const) : ('' as const),
    found: o.hideCount ? fcount + ' found' : fcount + '/' + total + ' found',
    time: formatTime(o.secs),
    hints: hints === 0 ? 'No hints' : hints === 1 ? '1 hint' : hints + ' hints',
    cells,
    name: b.guest ? 'Guest player' : o.name!.trim(),
    handle: b.guest ? 'Not signed in' : (o.handle ?? ''),
    cta: fcount === 0 ? 'Can you find them?' : 'Can you beat it?',
  };
}

/** 0 plain, 1 found, 2 found via hint. */
export type SegState = 0 | 1 | 2;

export type PuzzleCardInput = CardInput & {
  text: string;
  mode: 'excerpt' | 'full';
  /** Show my finds. */
  show?: boolean;
  noun?: string;
  /**
   * Multiplies the char budgets. The share card lowers it when text still overflows at the minimum
   * font size, so the text moves onto more pages instead of shrinking below 38px. Default 1.
   */
  budgetScale?: number;
};

/** Pages of whole sentences. Excerpt: the one window with the most target answers. Full: every sentence, paged. */
export function puzzleCards(o: PuzzleCardInput) {
  const r = RATIOS[o.ratio];
  const { chars } = toChars(o.text);
  const sents = sentences(o.text, chars);
  if (!sents.length) return [];
  const answers = o.answers;
  const total = answers.length;
  const fcount = answers.filter((a) => a.found).length;
  const show = !!o.show;
  const target = (a: SpanAnswer) => (show ? !!a.found : true);

  const k = Math.min(1, Math.max(0.3, o.budgetScale ?? 1));
  const first = Math.floor(r.first * k);
  const next = Math.floor(r.next * k);
  const ranges: Range[] =
    o.mode === 'full' ? paginate(sents, first, next) : [excerptRange(sents, answers, first, target)!];
  const pages = ranges.length;
  const [r0s, r0e] = ranges[0]!;
  const whole = o.mode === 'full' || (r0s === 0 && r0e === sents.length - 1);

  const lit: Record<number, 1 | 2> = {};
  if (show)
    for (const a of answers)
      if (a.found) for (let k = a.span[0]; k <= a.span[1]; k++) lit[k] = a.hinted ? 2 : 1;
  const stOf = (c: (typeof chars)[number]): SegState => {
    if (c.li >= 0) return lit[c.li] ?? 0;
    const p = c.prev ?? -1;
    const n = c.next ?? -1;
    return p >= 0 && n >= 0 && lit[p] && lit[p] === lit[n] ? lit[p]! : 0;
  };

  const b0 = base(o, r);
  const noun = o.noun ?? 'words';

  return ranges.map(([s0, s1], p) => {
    const cs = sents[s0]!.cs;
    const ce = sents[s1]!.ce;
    const segs: Array<{ t: string; state: SegState }> = [];
    let cur: { t: string; state: SegState } | null = null;
    if (!whole && s0 > 0) segs.push({ state: 0, t: '…' });
    for (let i = cs; i < ce; i++) {
      const c = chars[i]!;
      const st = stOf(c);
      if (!cur || cur.state !== st) {
        cur = { state: st, t: '' };
        segs.push(cur);
      }
      cur.t += c.ch;
    }
    if (!whole && s1 < sents.length - 1) segs.push({ state: 0, t: ' …' });

    const here = answers.filter((a) => inside(a, sents, s0, s1)).length;
    const firstPage = p === 0;
    let pline2: string;
    if (show) pline2 = 'Highlighted words are answers';
    else if (o.hideCount) pline2 = whole ? 'How many can you find?' : 'Some hide here. More inside.';
    else if (o.mode === 'full') pline2 = pages > 1 ? 'Swipe for the rest' : 'Words hide across spaces';
    else pline2 = whole ? total + ' hiding in here' : here + ' hiding here. ' + (total - here) + ' more inside.';
    if (o.mode === 'full' && p === pages - 1 && pages > 1 && !show) pline2 = 'Now go find them';

    return {
      ...b0,
      kind: 'puzzle' as const,
      range: [s0, s1] as Range,
      spoiler: show,
      date: pages > 1 ? p + 1 + ' / ' + pages : b0.date,
      gap: r.pgap,
      textSize: r.text,
      showTitle: firstPage,
      titleSize: Math.round(r.title * r.ptitle),
      kicker: firstPage ? b0.kicker : 'Continued',
      ptitle: show
        ? 'I found ' + fcount + (o.hideCount ? ' ' : ' of ' + total + ' ') + noun + '.'
        : o.hideCount
          ? 'How many ' + noun + ' can you find?'
          : 'Can you find ' + total + ' ' + noun + '?',
      segs,
      pline: show
        ? b0.first + ' · ' + fcount + (o.hideCount ? ' found' : '/' + total) + ' in ' + formatTime(o.secs)
        : b0.first + ' found ' + fcount + ' in ' + formatTime(o.secs),
      pline2,
    };
  });
}
