import { dayNo } from '../engine/daily';
import { storage } from '../lib/storage';
import { dailyIdFor, getGameDef, holidayFor, type GameDef } from './catalog';
import type { SavedSession } from './session';

export type DailyInfo = { n: number; def: GameDef; date: string; /** Holiday name when the day is one: "Christmas". */ holiday?: string };

/** "Christmas daily" on a holiday, else "Daily". */
export function dailyLabel(n: number): string {
  const h = holidayFor(n);
  return h ? `${h.name} daily` : 'Daily';
}

/** Display date for a day number, in UTC to match `dayNo`. */
export function dailyDate(n: number): string {
  const d = new Date(Date.UTC(2026, 0, n));
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function dailyInfo(n: number): DailyInfo | null {
  const def = getGameDef(dailyIdFor(n));
  return def ? { n, def, date: dailyDate(n), holiday: holidayFor(n)?.name } : null;
}

export const today = (): DailyInfo => dailyInfo(dayNo())!;

const key = (n: number) => `fignda-daily-${n}`;

export function loadDaily(n: number): SavedSession | null {
  return storage.getJSON<SavedSession>(key(n));
}

export function saveDaily(n: number, s: SavedSession): void {
  storage.setJSON(key(n), s);
}
