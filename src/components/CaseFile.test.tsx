// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { avatarFor, drawAvatar, drawDisguise } from '../avatar/draw';
import { DISGUISE_STYLES } from '../avatar/parts/disguises';
import { POOLS } from '../copy';
import { caseFile, clueCount, culpritFor, doneClues, secretOf } from '../games/caseFile';
import { games } from '../games/catalog';
import { CaseClosed, CasePiece, Culprit, SecretSlots } from './CaseFile';

const fills = (pool: readonly string[], line: string) => pool.some((t) => new RegExp(`^${t.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '.+')}$`).test(line));
const id = games[0]!.id;

beforeEach(() => localStorage.clear());

describe('caseFile', () => {
  it('nothing done: every slot is empty', () => {
    const f = caseFile(id, new Set())!;
    expect(f.slots).toHaveLength(f.word.length);
    expect(f.slots.every((s) => s === '')).toBe(true);
    expect(f.closed).toBe(false);
  });

  it('each clue done fills its own piece, and the unmasking fills the last', () => {
    const n = clueCount(id);
    const done = new Set<string>();
    let filled = 0;
    for (let i = 1; i < n; i++) {
      done.add(`${id}~${i}`);
      const f = caseFile(id, done)!;
      const piece = f.piece(i);
      expect(piece.slots.map((s) => f.slots[s]).join('')).toBe(piece.text);
      filled += piece.text.length;
      expect(f.slots.filter(Boolean)).toHaveLength(filled);
      expect(f.closed).toBe(false);
    }
    const last = caseFile(id, done)!.piece(0);
    expect(last.text).not.toBe('');
    expect(last.slots.every((s) => caseFile(id, done)!.slots[s] === '')).toBe(true);
  });

  it('a whole puzzle done closes the case, pieces and all', () => {
    for (const g of games) {
      const f = caseFile(g.id, new Set([g.id]))!;
      expect(f.closed).toBe(true);
      expect(f.slots.join('')).toBe(secretOf(g.id)!.word);
    }
  });

  it('a squad: its finds give the passage pieces in order, the finish gives the last, and own clues stay held', () => {
    const none = caseFile(id, new Set(), { found: 0, total: 10, finished: false })!;
    expect(none.slots.every((s) => s === '')).toBe(true);
    const some = caseFile(id, new Set(), { found: 8, total: 10, finished: false })!;
    expect(some.closed).toBe(false);
    // Everything but the unmasking's piece.
    const lastPiece = some.piece(0);
    expect(some.slots.filter(Boolean)).toHaveLength(some.word.length - lastPiece.text.length);
    expect(lastPiece.slots.every((s) => some.slots[s] === '')).toBe(true);
    const done = caseFile(id, new Set(), { found: 10, total: 10, finished: true })!;
    expect(done.closed).toBe(true);
    expect(done.slots.join('')).toBe(done.word);
    // Finished with few words found: the last piece only, and the case is not closed.
    const short = caseFile(id, new Set(), { found: 1, total: 10, finished: true })!;
    expect(short.closed).toBe(false);
    expect(short.slots.filter(Boolean).join('')).toBe(lastPiece.text);
    // A clue the player did alone is theirs whatever the squad found.
    const n = clueCount(id) - 1;
    const mine = caseFile(id, new Set([`${id}~${n}`]), { found: 0, total: 10, finished: false })!;
    expect(mine.slots.filter(Boolean).join('')).toBe(mine.piece(n).text);
  });

  it('a puzzle that is not ours has no case, and a clue the case does not have gives nothing', () => {
    expect(caseFile('no-such-puzzle', new Set(['no-such-puzzle']))).toBeUndefined();
    expect(caseFile(id, new Set())!.piece(99)).toEqual({ text: '', slots: [] });
  });

  it('reads the clues done from this browser: finished puzzles and anything with stars', () => {
    localStorage.setItem('gazecraft-finished', JSON.stringify(['bible']));
    localStorage.setItem('gazecraft-stars', JSON.stringify({ 'ai~2': 2, 'ai~3': 0, science: 'x' }));
    expect([...doneClues()].sort()).toEqual(['ai~2', 'bible']);
    localStorage.setItem('gazecraft-stars', '{broken');
    expect([...doneClues()]).toEqual(['bible']);
  });
});

describe('SecretSlots', () => {
  it('one slot per letter, found ones filled, with one name that counts and does not spell', () => {
    const { container } = render(<SecretSlots slots={['', 'A', '', 'T', '']} fresh={[1]} />);
    const row = screen.getByRole('img', { name: 'The secret: 2 of 5 letters found.' });
    expect(row.getAttribute('data-secret')).toBe('part');
    expect([...container.querySelectorAll('[data-slot]')].map((s) => s.getAttribute('data-slot'))).toEqual(['off', 'on', 'off', 'on', 'off']);
    expect(container.querySelectorAll('[data-fresh]')).toHaveLength(1);
    expect(container.textContent).toBe('AT');
  });

  it('whole: the name says the word. Empty slots are never fresh', () => {
    const { container } = render(<SecretSlots slots={[...'BELL']} fresh={[0, 9]} />);
    expect(screen.getByRole('img', { name: 'The secret: BELL.' }).getAttribute('data-secret')).toBe('whole');
    expect(container.querySelectorAll('[data-fresh]')).toHaveLength(1);
    render(<SecretSlots slots={[]} />);
    expect(screen.getByRole('img', { name: 'The secret: 0 of 0 letters found.' })).toBeInTheDocument();
  });
});

describe('Culprit', () => {
  it('an ordinary avatar with the disguise in a layer of its own, gone once unmasked', () => {
    const masked = render(<Culprit id={id} state="masked" />);
    expect(masked.container.querySelectorAll('svg')).toHaveLength(2);
    expect(masked.container.querySelector('[data-culprit="masked"] svg + svg')!.children.length).toBeGreaterThan(0);
    for (const svg of masked.container.querySelectorAll('svg')) expect(svg.getAttribute('aria-hidden')).toBe('true');
    masked.unmount();
    const off = render(<Culprit id={id} state="unmasked" />);
    expect(off.container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('the same culprit every time, and not the same for every case', () => {
    const html = (caseId: string) => {
      const r = render(<Culprit id={caseId} state="masked" />);
      const out = r.container.innerHTML;
      r.unmount();
      return out;
    };
    expect(html(id)).toBe(html(id));
    expect(new Set(games.map((g) => html(g.id))).size).toBeGreaterThan(10);
  });

  it('every disguise draws on any avatar, and is not part of the avatar itself', () => {
    expect(DISGUISE_STYLES.length).toBeGreaterThanOrEqual(6);
    expect(new Set(DISGUISE_STYLES.map((d) => d.name)).size).toBe(DISGUISE_STYLES.length);
    for (const seed of ['ada', 'chidi', 'culprit-bible']) {
      const a = avatarFor(seed);
      const base = drawAvatar(a).length;
      DISGUISE_STYLES.forEach((_, i) => {
        const shapes = drawDisguise({ ...a, back: 1 }, i);
        expect(shapes.length).toBeGreaterThan(0);
        expect(JSON.stringify(shapes)).not.toMatch(/NaN|undefined/);
      });
      expect(drawAvatar(a)).toHaveLength(base);
    }
    expect(drawDisguise(avatarFor('ada'), 99)).toEqual([]);
    expect(drawDisguise(avatarFor('ada'), -1)).toEqual([]);
  });
});

describe('CasePiece and CaseClosed', () => {
  it('a piece: the slots, and one line from the pool naming it', () => {
    const { container } = render(<CasePiece slots={['', '', 'O', 'P', '', '']} fresh={[2, 3]} piece="OP" />);
    expect(container.querySelectorAll('[data-fresh]')).toHaveLength(2);
    const line = container.querySelector('p')!.textContent!;
    expect(fills(POOLS.pieceFound, line)).toBe(true);
    expect(line).toContain('OP');
  });

  it('a squad that fell short is told how far it read, in place of the line about a piece', () => {
    const { container } = render(<CasePiece slots={['A', '', '']} fresh={[]} piece="" say="The squad read 1 of 3 letters." />);
    expect(container.querySelector('p')!.textContent).toBe('The squad read 1 of 3 letters.');
    for (const t of [...POOLS.squadShort, ...POOLS.squadSecret]) expect(t).not.toMatch(/minute|second|\bfast/i);
    for (const t of POOLS.squadShort) expect(t).toMatch(/\{n\}.*\{t\}/);
  });

  it('a clue with no piece to give says nothing', () => {
    const { container } = render(<CasePiece slots={['', 'A']} fresh={[]} piece="" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('the unmasking: the mask lifting, the stamp, the whole secret, a confession and the calling card', () => {
    const word = secretOf(id)!.word;
    const { container } = render(<CaseClosed id={id} secret={word} />);
    expect(container.querySelector('[data-culprit="unmasking"]')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 3, name: 'Case closed' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: `The secret: ${word}.` })).toBeInTheDocument();
    const [confession, card] = [...container.querySelectorAll('p')].map((p) => p.textContent!);
    expect(fills(POOLS.confession, confession!)).toBe(true);
    expect(confession).toContain(culpritFor(id).name);
    expect(confession!.toLowerCase()).toContain(`the ${word.toLowerCase()}`);
    expect(POOLS.callingCard).toContain(card);
    expect(container.querySelector('svg.lucide-eye')).not.toBeNull();
  });

  it('every confession names who and what, and stays within the tone', () => {
    for (const t of POOLS.confession) {
      expect(t).toContain('{who}');
      expect(t).toMatch(/[Tt]he \{secret\}/);
    }
    const all = [...POOLS.confession, ...POOLS.caseOpen, ...POOLS.callingCard, ...POOLS.culpritWho, ...POOLS.pieceFound].join(' ');
    expect(all).not.toMatch(/steal|stole|thief|rob|kill|gun|knife|gang|blood|weapon|crime|criminal|arrest|jail|prison/i);
    for (const who of POOLS.culpritWho) expect(who).toMatch(/^the [a-z0-9 ]+$/);
  });
});

describe('CaseFile styles', () => {
  const css = readFileSync(join(__dirname, 'CaseFile.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const tokens = readFileSync(join(__dirname, '..', 'styles', 'tokens.css'), 'utf8');

  it('uses tokens only: no hex, no ms, no px radius, and no lime', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/\d+m?s\b/);
    expect(css).not.toMatch(/border-radius:\s*\d+px/);
    expect(css).not.toMatch(/--accent/);
  });

  it('the stamp is Bungee in a heading ink, never --fg-strong', () => {
    expect(css).toMatch(/\.stamp\s*\{[^}]*composes:\s*h3 from/);
    expect(css).toMatch(/\.stamp\s*\{[^}]*color:\s*var\(--ink-heading\)/);
    expect(css).not.toMatch(/--fg-strong|--font-display/);
  });

  it('only transform and opacity move, nothing grows from scale 0, and it all stops under reduced motion', () => {
    const frames = css.match(/@keyframes[\s\S]*?\n\}/g) ?? [];
    expect(frames).toHaveLength(3);
    for (const f of frames) for (const prop of f.match(/[a-z-]+(?=\s*:)/g) ?? []) expect(['transform', 'opacity']).toContain(prop);
    expect(css).not.toMatch(/scale\(0(\.[0-7]\d*)?\)/);
    const reduced = css.slice(css.indexOf('prefers-reduced-motion: reduce'));
    expect(reduced.match(/animation:\s*none/g)).toHaveLength(2);
    expect(reduced).toMatch(/\.mask\s*\{[^}]*opacity:\s*0/);
  });

  it('the tokens exist and are 0 under reduced motion', () => {
    const [base, reduced] = tokens.split('@media (prefers-reduced-motion: reduce)') as [string, string];
    for (const t of ['--dur-unmask', '--dur-stamp']) {
      expect(base).toMatch(new RegExp(`${t}: \\d+ms`));
      expect(reduced.slice(0, reduced.indexOf('html, body'))).toContain(`${t}: 0ms`);
    }
  });
});
