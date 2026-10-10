// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { levelFor } from '../engine/level';
import { LevelBadge } from './LevelBadge';
import { Stars } from './Stars';
import { clampStars, starsLabel } from './starsLabel';

const noComments = (file: string) => readFileSync(join(__dirname, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('Stars', () => {
  it.each([0, 1, 2, 3] as const)('%i: one name with the count, and that many filled shapes', (n) => {
    const { container } = render(<Stars value={n} />);
    expect(screen.getByRole('img', { name: `${n} of 3 stars` })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-star]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-star="on"]')).toHaveLength(n);
    // The icons are decoration: the row carries the name.
    for (const svg of container.querySelectorAll('svg')) expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it.each([
    [undefined, 0],
    [null, 0],
    [Number.NaN, 0],
    [-2, 0],
    [2.9, 2],
    [7, 3],
    [Infinity, 0],
    ['3', 0],
  ] as Array<[unknown, number]>)('%s reads as %i, never a broken label', (value, want) => {
    expect(clampStars(value)).toBe(want);
    expect(starsLabel(value)).toBe(`${want} of 3 stars`);
    render(<Stars value={value as number} />);
    expect(screen.getByRole('img')).toHaveAccessibleName(`${want} of 3 stars`);
  });

  it('pops only when asked', () => {
    const { container, rerender } = render(<Stars value={2} />);
    expect(container.firstElementChild!.hasAttribute('data-pop')).toBe(false);
    rerender(<Stars value={2} pop />);
    expect(container.firstElementChild!.hasAttribute('data-pop')).toBe(true);
    expect([...container.querySelectorAll<HTMLElement>('[data-star]')].map((s) => s.style.getPropertyValue('--i'))).toEqual(['0', '1', '2']);
  });

  it('earned and unearned differ by shape, not by lime, and motion is from tokens', () => {
    const css = noComments('Stars.module.css');
    expect(css).toMatch(/\.on svg\s*\{[^}]*fill:\s*currentColor/);
    expect(css).not.toMatch(/--accent|--bar|--cell/);
    expect(css).toMatch(/animation:\s*pop var\(--dur-star\) var\(--ease-out\)/);
    expect(css).toMatch(/animation-delay:\s*calc\(var\(--dur-star-step\) \* var\(--i\)\)/);
    expect(css).not.toMatch(/\d+m?s\b|#[0-9a-f]{3,8}\b/i);
    expect(css).toMatch(/scale\(0\.8\)/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{[^}]*\{\s*animation:\s*none/);
  });
});

describe('LevelBadge', () => {
  it('shows the level, the band and the points into the level', () => {
    const { container } = render(<LevelBadge points={620} />);
    expect(levelFor(620)).toMatchObject({ level: 2, into: 120, need: 600 });
    const ring = screen.getByRole('progressbar', { name: 'Level 2, Rookie. 120 of 600 points to level 3.' });
    expect(ring).toHaveAttribute('aria-valuenow', '20');
    expect(container.firstElementChild!.getAttribute('data-level')).toBe('2');
    expect(container.textContent).toBe('2Rookie120 / 600');
  });

  it.each([
    ['0', 0],
    ['null', null],
    ['undefined', undefined],
    ['NaN', Number.NaN],
    ['a negative number', -40],
  ] as Array<[string, number | null | undefined]>)('%s points: level 1 with an empty ring', (_, points) => {
    const { container } = render(<LevelBadge points={points} />);
    const ring = screen.getByRole('progressbar', { name: 'Level 1, Rookie. 0 of 500 points to level 2.' });
    expect(ring).toHaveAttribute('aria-valuenow', '0');
    expect(ring).toHaveAttribute('data-closed', 'false');
    expect(container.textContent).toBe('1Rookie0 / 500');
    expect(container.textContent).not.toMatch(/undefined|NaN|null/);
  });

  it('no points prop at all renders the same', () => {
    const { container } = render(<LevelBadge />);
    expect(container.textContent).toBe('1Rookie0 / 500');
  });

  it('small: the ring and the band, no points line', () => {
    const { container } = render(<LevelBadge points={620} size="sm" />);
    expect(container.textContent).toBe('2Rookie');
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('32');
  });

  it('a higher band is named', () => {
    const points = 500 + 600 + 720 + 860 + 1040;
    expect(levelFor(points).level).toBe(6);
    render(<LevelBadge points={points} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-label')).toMatch(/^Level 6, Detective\./);
  });

  it('level up: the ring starts where it was and fills to closed on the next frame', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<LevelBadge points={620} levelUp />);
      const ring = screen.getByRole('progressbar', { name: 'Level 2, Rookie. Level reached.' });
      expect(ring).toHaveAttribute('aria-valuenow', '20');
      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(ring).toHaveAttribute('aria-valuenow', '100');
      expect(ring).toHaveAttribute('data-closed', 'true');
      expect(container.firstElementChild!.hasAttribute('data-level-up')).toBe(true);
      expect(container.textContent).toMatch(/level 2\.$/i);
    } finally {
      vi.useRealTimers();
    }
  });

  it('the number is Manrope, and motion is from tokens and stops under reduced motion', () => {
    const css = noComments('LevelBadge.module.css');
    expect(css).toMatch(/\.number\s*\{[^}]*font-family:\s*var\(--font\)/);
    expect(css).toMatch(/\.number\s*\{[^}]*tabular-nums/);
    expect(css).not.toMatch(/--font-display|--accent/);
    expect(css).not.toMatch(/\d+m?s\b|#[0-9a-f]{3,8}\b/i);
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{[^}]*\{\s*animation:\s*none/);
  });
});
