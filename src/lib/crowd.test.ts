import { askedCrowd, circleRows, defaultCrowd } from './crowd';

describe('crowd', () => {
  it('opens on your circle, then the people you follow, then everyone', () => {
    expect(defaultCrowd(2, 9)).toBe('circle');
    expect(defaultCrowd(1, 0)).toBe('circle');
    expect(defaultCrowd(0, 1)).toBe('following');
    expect(defaultCrowd(0, 0)).toBe('everyone');
  });

  it.each([
    [undefined, undefined],
    [null, null],
    [NaN, NaN],
    ['3', '2'],
    [-1, -1],
  ])('a lookup that gave nothing (%j, %j) lands on everyone', (c, f) => {
    expect(defaultCrowd(c, f)).toBe('everyone');
  });

  it('reads the board from the address and ignores anything else', () => {
    expect(askedCrowd('circle')).toBe('circle');
    expect(askedCrowd('following')).toBe('following');
    expect(askedCrowd('everyone')).toBe('everyone');
    expect(askedCrowd('together')).toBeNull();
    expect(askedCrowd(null)).toBeNull();
    expect(askedCrowd('')).toBeNull();
  });
});

describe('circleRows', () => {
  const played = { rank: 1, handle: 'ada', name: 'Ada', score: 700, secs: 80, found: 7, total: null };
  const waiting = { rank: null, handle: 'bisi', name: 'Bisi', score: null, secs: null, found: null, total: null };

  it('keeps members with a score and counts the rest as still to play', () => {
    expect(circleRows([waiting, played])).toEqual({
      rows: [{ rank: 1, handle: 'ada', score: 700, secs: 80, found: 7, total: null }],
      waiting: 1,
    });
  });

  it('a circle where nobody has played is an empty board, not a crash', () => {
    expect(circleRows([waiting])).toEqual({ rows: [], waiting: 1 });
    expect(circleRows([])).toEqual({ rows: [], waiting: 0 });
  });

  it.each([[null], [undefined], ['rows'], [{}], [[null, 4, {}]]])('a reply that is not a list of rows (%j) is an empty board', (raw) => {
    expect(circleRows(raw).rows).toEqual([]);
  });

  it('fills a missing time or count with 0, never undefined', () => {
    const [r] = circleRows([{ ...played, secs: null, found: null }]).rows;
    expect(r).toMatchObject({ secs: 0, found: 0 });
  });
});
