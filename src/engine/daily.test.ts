import { calendar, dailyIdFor, dailyPool, getGameDef, holidayFor } from '../games/catalog';
import { pageFor, llmsTxt } from '../seo/pages';
import { dailyGameId, dayNo, holidayOn, isoDate, type Calendar } from './daily';

const day = (iso: string) => dayNo(new Date(`${iso}T12:00:00Z`));
const rotation = (n: number) => dailyGameId(n, dailyPool);

describe('holiday dailies', () => {
  it('every holiday points at a real puzzle and has a date rule', () => {
    expect(calendar.holidays.length).toBeGreaterThan(0);
    for (const h of calendar.holidays) {
      expect(getGameDef(h.game), h.id).toBeDefined();
      expect(!!h.date !== !!h.dates, h.id).toBe(true);
      if (h.date) expect(h.date).toMatch(/^\d{2}-\d{2}$/);
      for (const d of h.dates ?? []) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('a holiday date returns its puzzle, every year', () => {
    expect(dailyIdFor(day('2026-12-25'))).toBe('bible');
    expect(dailyIdFor(day('2027-12-25'))).toBe('bible');
    expect(dailyIdFor(day('2027-10-01'))).toBe('nigeria');
    expect(holidayFor(day('2027-10-01'))?.name).toBe('Independence Day');
  });

  it('a moving holiday only lands on its listed dates', () => {
    expect(holidayFor(day('2027-03-28'))?.id).toBe('easter');
    expect(holidayFor(day('2028-03-28'))).toBeUndefined();
    expect(holidayFor(day('2028-04-16'))?.id).toBe('easter');
  });

  it('a normal date is unchanged, and so are the days around a holiday', () => {
    const xmas = day('2026-12-25');
    for (const n of [xmas - 1, xmas + 1, day('2026-11-11'), day('2027-06-15')]) {
      expect(holidayFor(n)).toBeUndefined();
      expect(dailyIdFor(n)).toBe(rotation(n));
    }
  });

  it('days before `since` keep the puzzle they had', () => {
    // 1 October 2026 was played before holidays existed.
    const n = day('2026-10-01');
    expect(isoDate(n)).toBe('2026-10-01');
    expect(holidayFor(n)).toBeUndefined();
    expect(dailyIdFor(n)).toBe(rotation(n));
    const cal: Calendar = { since: '2026-01-01', holidays: calendar.holidays };
    expect(holidayOn(n, cal)?.game).toBe('nigeria');
  });

  it('link previews and llms.txt name the holiday, and only once the day is here', () => {
    const n = day('2026-12-25');
    const page = pageFor(`/d/${n}`, 'https://x.test', n);
    expect(page.title).toContain(`Christmas daily #${n}`);
    expect(page.title).toContain('books of the Bible');
    expect(llmsTxt('https://x.test', n)).toContain("Today's Christmas daily");
    // The day before, tomorrow's page says nothing.
    expect(pageFor(`/d/${n}`, 'https://x.test', n - 1).noindex).toBe(true);
    expect(pageFor(`/d/${n - 1}`, 'https://x.test', n - 1).title).toContain(`Daily #${n - 1}`);
  });
});
