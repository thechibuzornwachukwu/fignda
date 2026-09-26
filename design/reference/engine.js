// Reference engine. Pure. Port to src/engine/*.ts verbatim in behaviour.
// Tests: every game in data/games.json must yield exactly expectedAnswers (same order).

export const norm = s => String(s).toLowerCase().replace(/[^a-z]/g, '');

export function buildHiddenWords(def) {
  const chars = []; let S = '';
  for (const ch of def.text) {
    if (/[a-z]/i.test(ch)) { chars.push({ ch, li: S.length }); S += ch.toLowerCase(); }
    else chars.push({ ch, li: -1 });
  }
  let last = -1;
  chars.forEach(c => { if (c.li >= 0) last = c.li; else c.prev = last; });
  let next = -1;
  for (let i = chars.length - 1; i >= 0; i--) { const c = chars[i]; if (c.li >= 0) next = c.li; else c.next = next; }
  const seen = new Set(), answers = [];
  def.dict.forEach(w => {
    const k = norm(w); if (k.length < 3 || seen.has(k)) return;
    const spans = []; let i = S.indexOf(k);
    while (i >= 0) { spans.push([i, i + k.length - 1]); i = S.indexOf(k, i + 1); }
    if (spans.length) { seen.add(k); answers.push({ key: k, label: w.charAt(0).toUpperCase() + w.slice(1), spans }); }
  });
  answers.sort((a, b) => a.spans[0][0] - b.spans[0][0]);
  const n = answers.length, L = def.text.length;
  const difficulty = n >= 20 || L >= 900 ? 'Hard' : n <= 9 && L < 260 ? 'Easy' : 'Medium';
  return Object.assign({}, def, { chars, S, answers, difficulty });
}

// Selection: indices are positions in the letter stream S (either direction).
export function check(puzzle, a, b, found) {
  if (a > b) [a, b] = [b, a];
  const str = puzzle.S.slice(a, b + 1);
  const hit = puzzle.answers.find(x => x.key === str);
  if (hit) return found[hit.key] ? { kind: 'already', answer: hit } : { kind: 'hit', answer: hit };
  if (b - a < 2) return { kind: 'ignore' };
  return { kind: 'wrong', str };
}

// Score. misses count only on the daily. Floor 0.
export function score({ found, total, hints, misses, secs }) {
  return Math.max(0, found * 100 - hints * 25 - misses * 10 + (found === total ? Math.max(0, 600 - secs) : 0));
}

// Daily. Server is authoritative; client uses this only for display.
export const DAY0 = Date.UTC(2026, 0, 1);
export function dayNo(d = new Date()) {
  return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - DAY0) / 864e5) + 1;
}
export const dailyGameId = (n, pool) => pool[n % pool.length];
