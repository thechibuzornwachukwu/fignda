import { BANNED_CLAIMS } from '../copy/claims';
import { MAKE } from '../engine/make';
import { PARTNER_POINTS } from '../engine/partners';
import { FIND_POINTS, TIP_OFF_COST } from '../engine/score';
import { GUEST_GAMES } from '../lib/guestLimit';
import { CLEAN_BONUS, RARE_BONUS } from '../lib/profileStats';
import { HELP_ARTICLES, helpArticle, helpByGroup, searchHelp } from './articles';
import { HELP_GROUPS } from './types';

const text = (slug: string) => {
  const a = helpArticle(slug)!;
  return [a.title, a.answer, ...(a.steps ?? []), ...(a.facts ?? [])].join(' ');
};

describe('help articles', () => {
  it('each is 1 question, with a unique address and a known group', () => {
    const slugs = HELP_ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const a of HELP_ARTICLES) {
      expect(a.slug, a.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(a.title, a.slug).toMatch(/\?$/);
      expect(a.title.length, a.slug).toBeLessThanOrEqual(60);
      expect(HELP_GROUPS).toContain(a.group);
    }
  });

  it('the answer comes first, in 2 sentences at most', () => {
    for (const a of HELP_ARTICLES) expect(a.answer.split(/(?<=[.?])\s+(?=[A-Z0-9])/).length, a.slug).toBeLessThanOrEqual(2);
  });

  it('follows the copy rules: no em dash, no exclamation, no promised result', () => {
    for (const a of HELP_ARTICLES) {
      const t = text(a.slug);
      expect(t, a.slug).not.toMatch(/\u2014|!/);
      expect(t, a.slug).not.toMatch(BANNED_CLAIMS);
      expect(t, a.slug).not.toMatch(/\bdaily\b(?! goal)|\bcase\b|\bclue\b|detective/i);
    }
  });

  it('every related article exists, and none points at itself', () => {
    for (const a of HELP_ARTICLES) for (const r of a.related ?? []) {
      expect(helpArticle(r), `${a.slug} -> ${r}`).toBeDefined();
      expect(r).not.toBe(a.slug);
    }
  });

  it('the numbers are the ones the game runs', () => {
    expect(text('points')).toContain(`worth ${FIND_POINTS} points`);
    expect(text('points')).toContain(`costs ${TIP_OFF_COST}`);
    expect(text('points')).toContain(`adds ${CLEAN_BONUS} once a puzzle`);
    expect(text('points')).toContain(`adds ${RARE_BONUS} once a word`);
    expect(text('tip-offs')).toContain(`costs ${TIP_OFF_COST} points`);
    expect(text('playing-as-a-guest')).toContain(`plays ${GUEST_GAMES} puzzles`);
    expect(text('pets')).toContain(PARTNER_POINTS[1].toLocaleString('en-US'));
    expect(text('make-a-puzzle')).toContain(`Up to ${MAKE.perHour}`);
    expect(text('ranks')).toContain('Keen: from 3,720 points.');
  });

  it('groups come in order, and search needs every word typed', () => {
    expect(helpByGroup().map((g) => g.group)).toEqual(HELP_GROUPS.filter((g) => HELP_ARTICLES.some((a) => a.group === g)));
    expect(searchHelp('tip-off cost').map((a) => a.slug)).toContain('tip-offs');
    expect(searchHelp('league week')).toEqual([helpArticle('leagues')]);
    expect(searchHelp('zzzz')).toEqual([]);
    expect(searchHelp('  ')).toHaveLength(HELP_ARTICLES.length);
  });
});
