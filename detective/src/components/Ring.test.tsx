// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { Ring } from './Ring';

describe('Ring', () => {
  it('fills by its value and says so', () => {
    const { container } = render(<Ring value={12 / 30} label="Found" />);
    const ring = screen.getByRole('progressbar', { name: 'Found' });
    expect(ring).toHaveAttribute('aria-valuenow', '40');
    expect(ring).toHaveAttribute('data-closed', 'false');
    const [track, fill] = container.querySelectorAll('circle');
    expect(track!.getAttribute('stroke-dasharray')).toBeNull();
    expect(fill!.getAttribute('pathLength')).toBe('100');
    expect(fill!.style.strokeDashoffset).toBe('60');
  });

  it('clamps the value', () => {
    const { rerender } = render(<Ring value={-1} label="Found" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    rerender(<Ring value={3} label="Found" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    rerender(<Ring value={0 / 0} label="Found" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('is closed only when full', () => {
    const { rerender } = render(<Ring value={0.99} label="Found" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-closed', 'false');
    rerender(<Ring value={1} label="Found" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-closed', 'true');
  });

  it('draws one arc per part, rest days dashed and thinner', () => {
    const { container } = render(
      <Ring parts={['done', 'rest', 'empty', 'done', 'empty', 'empty', 'done']} label="Played 3 of the last 7 days." />,
    );
    expect(screen.getByRole('img', { name: 'Played 3 of the last 7 days.' })).toHaveAttribute('data-closed', 'false');
    const arcs = [...container.querySelectorAll('circle')];
    expect(arcs.map((c) => c.getAttribute('data-part'))).toEqual(['done', 'rest', 'empty', 'done', 'empty', 'empty', 'done']);
    const [done, rest, empty] = arcs;
    expect(done!.getAttribute('stroke-dasharray')!.split(' ')).toHaveLength(2);
    expect(rest!.getAttribute('stroke-dasharray')!.split(' ')).toHaveLength(6);
    expect(Number(rest!.getAttribute('stroke-width'))).toBeLessThan(Number(done!.getAttribute('stroke-width')));
    expect(empty!.getAttribute('stroke-dasharray')).toBe(done!.getAttribute('stroke-dasharray'));
    // Every part starts where the one before it ended.
    expect(new Set(arcs.map((c) => c.getAttribute('transform'))).size).toBe(7);
  });

  it('a week closes with rest days, never on rest days alone', () => {
    const { rerender } = render(<Ring parts={['done', 'done', 'rest', 'done', 'done', 'done', 'done']} label="Week" />);
    expect(screen.getByRole('img')).toHaveAttribute('data-closed', 'true');
    rerender(<Ring parts={['rest', 'rest']} label="Week" />);
    expect(screen.getByRole('img')).toHaveAttribute('data-closed', 'false');
    rerender(<Ring parts={[]} label="Week" />);
    expect(screen.getByRole('img')).toHaveAttribute('data-closed', 'false');
  });
});
