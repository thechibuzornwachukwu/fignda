import { askedCrowd, defaultCrowd } from './crowd';

describe('crowd', () => {
  it('opens on the people you follow, then everyone', () => {
    expect(defaultCrowd(9)).toBe('following');
    expect(defaultCrowd(1)).toBe('following');
    expect(defaultCrowd(0)).toBe('everyone');
  });

  it.each([[undefined], [null], [NaN], ['2'], [-1]])('a lookup that gave nothing (%j) lands on everyone', (f) => {
    expect(defaultCrowd(f)).toBe('everyone');
  });

  it('reads the board from the address and ignores anything else, the old circle board too', () => {
    expect(askedCrowd('following')).toBe('following');
    expect(askedCrowd('everyone')).toBe('everyone');
    expect(askedCrowd('circle')).toBeNull();
    expect(askedCrowd('together')).toBeNull();
    expect(askedCrowd(null)).toBeNull();
    expect(askedCrowd('')).toBeNull();
  });
});
