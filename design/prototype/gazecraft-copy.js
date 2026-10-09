// Gazecraft live copy. One source for every in-game line. Picks by context, never repeats back to back.
(function () {
  const P = {
    found: ['{w}. Nice.', '{w}. Got it.', 'There it is. {w}.', '{w}. Sharp.', 'Yes. {w}.', '{w}, spotted.', 'Clean find. {w}.'],
    foundLong: ['{w}. Big one.', '{w}. That took eyes.', 'Long one. {w}.'],
    foundQuick: ['{w}. Quick.', 'Fast. {w}.', '{w} already. Speedy.'],
    streak: ['{w}. On a roll.', '{w}. {n} in a row.', '{w}. Keep going.'],
    lastOne: ['{w}. One left.', '{w}. Just one more.'],
    firstFind: ['{w}. First one down.', '{w}. And we are off.'],
    wrong: ['Not that one', 'Not quite', 'Nope, keep looking', 'Not hiding there', 'Try another stretch'],
    wrongDaily: ['Not that one. 10 off.', 'Not quite. 10 off.', 'Nope. 10 off.'],
    close: ['So close. Check the edges.', 'Almost. One letter off.', 'Nearly. Nudge it.'],
    already: ['Already found', 'Got that one', 'That one is yours'],
    hint: ['One starts at the marked letter', 'Look at the marked letter', 'Start from the mark'],
    tapNext: ['Now tap the last letter', 'Now the last letter'],
    idle: ['Take your time', 'Read it slowly', 'Try the long words first'],
    titlePerfect: ['All found. Sharp eyes.', 'Every one. Clean sweep.', 'Nothing got past you.'],
    titleGood: ['Good run.', 'Solid finding.', 'Most of them. Nice.'],
    titleLow: ['Nice try.', 'They hid well today.', 'Tough one.'],
    titleZero: ['They all got away.', 'Next time.'],
    genFail: ['That topic hid too well. Even from us. Try again?', 'We looked everywhere. The words got away. One more go?', 'Nothing hiding there yet. Try a different angle.', 'Our monocle fogged up. Give it another try.']
  };
  const last = {};
  function pick(key, vars) {
    const pool = P[key] || [key];
    let i = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && i === last[key]) i = (i + 1) % pool.length;
    last[key] = i;
    return pool[i].replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : ''));
  }
  // ctx: { word, len, foundCount, total, streak, msSinceLast }
  function onFound(ctx) {
    const v = { w: ctx.word, n: ctx.streak };
    if (ctx.foundCount === 1) return pick('firstFind', v);
    if (ctx.total - ctx.foundCount === 1) return pick('lastOne', v);
    if (ctx.streak >= 3 && ctx.streak % 3 === 0) return pick('streak', v);
    if (ctx.msSinceLast != null && ctx.msSinceLast < 6000) return pick('foundQuick', v);
    if (ctx.len >= 8) return pick('foundLong', v);
    return pick('found', v);
  }
  // Near miss: same length with one letter off, or one letter short or long of an unfound answer.
  function isClose(sel, keys) {
    return keys.some(k => {
      if (Math.abs(k.length - sel.length) > 1 || k.length < 4) return false;
      if (k.length === sel.length) { let d = 0; for (let i = 0; i < k.length; i++) if (k[i] !== sel[i]) d++; return d === 1; }
      const [a, b] = k.length > sel.length ? [k, sel] : [sel, k];
      return a.slice(1) === b || a.slice(0, -1) === b;
    });
  }
  function resultTitle(found, total) {
    if (found === total) return pick('titlePerfect');
    if (found === 0) return pick('titleZero');
    return pick(found >= total / 2 ? 'titleGood' : 'titleLow');
  }
  window.GazecraftCopy = { POOLS: P, pick, onFound, isClose, resultTitle };
})();
