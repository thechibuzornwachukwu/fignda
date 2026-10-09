import gamesFile from '../../data/games.json';
import { sponsorOf } from './sponsor';

describe('sponsorOf', () => {
  it('reads a name and an https link', () => {
    expect(sponsorOf({ name: 'Chi Farms', url: 'https://www.chifarms.example/shop?x=1' })).toEqual({
      name: 'Chi Farms',
      url: 'https://www.chifarms.example/shop?x=1',
      host: 'chifarms.example',
    });
  });

  it('a name alone is enough', () => {
    expect(sponsorOf({ name: 'Chi Farms' })).toEqual({ name: 'Chi Farms' });
  });

  it.each([undefined, null, '', 'Chi Farms', 7, [], {}, { name: 7 }, { name: '' }, { name: '   ' }, { name: 'A' }, { name: 'x'.repeat(41) }, { url: 'https://chifarms.example' }])(
    '%o is no sponsor',
    (raw) => {
      expect(sponsorOf(raw)).toBeUndefined();
    },
  );

  it('keeps a name at each end of the length rule', () => {
    expect(sponsorOf({ name: 'GT' })?.name).toBe('GT');
    expect(sponsorOf({ name: 'x'.repeat(40) })?.name).toHaveLength(40);
  });

  it('tidies space, line breaks and invisible characters in a name', () => {
    expect(sponsorOf({ name: '  Chi \n\t Farms​ ' })?.name).toBe('Chi Farms');
    expect(sponsorOf({ name: '‮Chi Farms' })?.name).toBe('Chi Farms');
  });

  it.each([
    'http://chifarms.example',
    'javascript:alert(1)',
    'data:text/html,hi',
    '//chifarms.example',
    'chifarms.example',
    'https://user:pass@chifarms.example',
    'https://bank.example@chifarms.example',
    'https://localhost',
    '',
    '   ',
    7,
    null,
  ])('a link of %o leaves the name with no link', (url) => {
    expect(sponsorOf({ name: 'Chi Farms', url })).toEqual({ name: 'Chi Farms' });
  });

  it('prints the host without www, and keeps other subdomains', () => {
    expect(sponsorOf({ name: 'Chi Farms', url: 'https://WWW.ChiFarms.example' })?.host).toBe('chifarms.example');
    expect(sponsorOf({ name: 'Chi Farms', url: 'https://shop.chifarms.example/' })?.host).toBe('shop.chifarms.example');
  });
});

describe('the catalogue', () => {
  it('every sponsor typed into data/games.json passes the rule, so none is dropped in silence', () => {
    const typed = (gamesFile.games as Array<{ id: string; sponsor?: unknown }>).filter((g) => g.sponsor !== undefined);
    for (const g of typed) expect(sponsorOf(g.sponsor), g.id).toBeDefined();
  });
});
