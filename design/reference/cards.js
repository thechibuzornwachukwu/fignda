// Fignda share cards: pure data builders shared by the game and the Share Card page.
(function () {
  const RATIOS = {
    '1:1':  { w: 1080, h: 1080, pad: '80px', title: 92, score: 230, cellH: 26, unit: 9,  gap: '40px', pgap: '32px', cellGap: '10px', text: 38, first: 400, next: 470, ptitle: 0.6 },
    '4:5':  { w: 1080, h: 1350, pad: '88px', title: 104, score: 290, cellH: 32, unit: 10, gap: '56px', pgap: '48px', cellGap: '12px', text: 40, first: 480, next: 580, ptitle: 0.68 },
    '9:16': { w: 1080, h: 1920, pad: '240px 96px 260px', title: 116, score: 300, cellH: 40, unit: 11, gap: '72px', pgap: '56px', cellGap: '14px', text: 42, first: 520, next: 660, ptitle: 0.7 }
  };
  const fmt = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };

  function prep(text) {
    const CH = []; let n = 0;
    for (const ch of text) { if (/[a-z]/i.test(ch)) CH.push({ ch, li: n++ }); else CH.push({ ch, li: -1 }); }
    let l = -1; CH.forEach(c => { if (c.li >= 0) l = c.li; else c.prev = l; });
    let nx = -1; for (let i = CH.length - 1; i >= 0; i--) { if (CH[i].li >= 0) nx = CH[i].li; else CH[i].next = nx; }
    const sents = []; const re = /[^.?!]+[.?!]+["')\]]*\s*|[^.?!]+$/g; let m;
    while ((m = re.exec(text))) {
      const cs = m.index, ce = m.index + m[0].length;
      let ls = -1, le = -1;
      for (let i = cs; i < ce && i < CH.length; i++) if (CH[i].li >= 0) { if (ls < 0) ls = CH[i].li; le = CH[i].li; }
      sents.push({ cs, ce, ls, le, len: m[0].trim().length });
    }
    return { CH, sents };
  }

  function answersFrom(text, keys) {
    const S = text.toLowerCase().replace(/[^a-z]/g, '');
    return keys.map(k => { const i = S.indexOf(k); return { key: k, span: [i, i + k.length - 1] }; }).filter(a => a.span[0] >= 0);
  }

  function base(o, r, scale) {
    const guest = !o.name;
    return {
      theme: o.theme || 'dark', label: o.label || '', caption: o.caption || '',
      pw: Math.round(r.w * scale) + 'px', ph: Math.round(r.h * scale) + 'px', w: r.w + 'px', h: r.h + 'px', scale,
      pad: r.pad, date: o.date || '', kicker: o.kicker || '', url: o.url || 'fignda.com',
      initial: guest ? 'f' : o.name.trim().charAt(0).toUpperCase(),
      avBg: guest ? 'var(--line-2)' : 'var(--fg)', avFg: guest ? 'var(--subtle)' : 'var(--bg)',
      guest, first: guest ? 'A guest' : o.name.trim().split(/\s+/)[0]
    };
  }

  function resultCard(o) {
    const r = RATIOS[o.ratio]; const scale = (o.previewW || 324) / r.w;
    const answers = o.answers; const total = answers.length;
    let fcount = 0, hints = 0;
    const cells = (o.hideCount ? answers.filter(a => a.found) : answers).map(a => {
      if (a.found) fcount++;
      if (a.hinted) hints++;
      const hint = a.hinted && a.found;
      return { w: ((a.span[1] - a.span[0] + 1) * r.unit + 16) + 'px', bg: !a.found ? 'var(--line-3)' : hint ? 'transparent' : 'var(--cell)', ring: hint ? 'inset 0 0 0 4px var(--cell)' : 'none' };
    });
    if (o.hints != null) hints = o.hints;
    if (o.hideCount) fcount = answers.filter(a => a.found).length;
    const perfect = fcount === total && hints === 0;
    const score = o.score != null ? o.score : Math.max(0, fcount * 100 - hints * 25 + (fcount === total ? Math.max(0, 600 - o.secs) : 0));
    const title = o.title || '';
    const b = base(o, r, scale);
    return Object.assign(b, {
      isResult: true, isPuzzle: false,
      gap: r.gap, cellGap: r.cellGap, cellH: r.cellH + 'px',
      titleSize: (title.length > 22 ? Math.round(r.title * 0.72) : r.title) + 'px',
      scoreSize: r.score + 'px', title,
      score: score.toLocaleString('en-US'),
      badge: perfect ? 'Perfect' : fcount === 0 ? 'Gave up' : '',
      badgeBg: perfect ? 'var(--accent)' : 'transparent',
      badgeFg: perfect ? 'var(--on-accent)' : 'var(--muted)',
      badgeRing: perfect ? 'none' : 'inset 0 0 0 2px var(--line-3)',
      found: o.hideCount ? fcount + ' found' : fcount + '/' + total + ' found', time: fmt(o.secs),
      hints: hints === 0 ? 'No hints' : hints === 1 ? '1 hint' : hints + ' hints',
      cells,
      name: b.guest ? 'Guest player' : o.name, handle: b.guest ? 'Not signed in' : (o.handle || ''),
      cta: fcount === 0 ? 'Can you find them?' : 'Can you beat it?'
    });
  }

  // Pages of whole sentences. Excerpt: the one window with the most target answers. Full: every sentence, paged.
  function puzzleCards(o) {
    const r = RATIOS[o.ratio]; const scale = (o.previewW || 324) / r.w;
    const { CH, sents } = prep(o.text);
    const answers = o.answers; const total = answers.length;
    const fcount = answers.filter(a => a.found).length;
    const show = !!o.show;
    const inside = (a, s0, s1) => a.span[0] >= sents[s0].ls && a.span[1] <= sents[s1].le;
    const target = a => show ? a.found : true;
    let ranges = [];
    if (o.mode === 'full') {
      let i = 0, budget = r.first;
      while (i < sents.length) {
        let j = i, len = sents[i].len;
        while (j + 1 < sents.length && len + 1 + sents[j + 1].len <= budget) { j++; len += 1 + sents[j].len; }
        ranges.push([i, j]); i = j + 1; budget = r.next;
      }
    } else {
      let best = null;
      for (let i = 0; i < sents.length; i++) {
        let j = i, len = sents[i].len;
        while (j + 1 < sents.length && len + 1 + sents[j + 1].len <= r.first) { j++; len += 1 + sents[j].len; }
        const n = answers.filter(a => target(a) && inside(a, i, j)).length;
        if (!best || n > best.n) best = { i, j, n };
      }
      ranges = [[best.i, best.j]];
    }
    const pages = ranges.length;
    const whole = o.mode === 'full' || (ranges[0][0] === 0 && ranges[0][1] === sents.length - 1);
    const own = new Int8Array(CH.length + 1);
    const lit = {};
    if (show) answers.forEach(a => { if (a.found) for (let k = a.span[0]; k <= a.span[1]; k++) lit[k] = a.hinted ? 2 : 1; });
    const stOf = c => c.li >= 0 ? (lit[c.li] || 0) : (c.prev >= 0 && c.next >= 0 && lit[c.prev] && lit[c.prev] === lit[c.next] ? lit[c.prev] : 0);
    const b0 = base(o, r, scale);
    const noun = o.noun || 'words';
    return ranges.map(([s0, s1], p) => {
      const cs = sents[s0].cs, ce = sents[s1].ce;
      const segs = []; let cur = null;
      if (!whole && s0 > 0) segs.push({ st: 0, t: '\u2026' });
      for (let i = cs; i < ce; i++) { const c = CH[i]; const st = stOf(c); if (!cur || cur.st !== st) { cur = { st, t: '' }; segs.push(cur); } cur.t += c.ch; }
      if (!whole && s1 < sents.length - 1) { segs.push({ st: 0, t: ' \u2026' }); }
      const here = answers.filter(a => inside(a, s0, s1)).length;
      const firstPage = p === 0;
      let pline2;
      if (show) pline2 = 'Highlighted words are answers';
      else if (o.hideCount) pline2 = whole ? 'How many can you find?' : 'Some hide here. More inside.';
      else if (o.mode === 'full') pline2 = pages > 1 ? 'Swipe for the rest' : 'Words hide across spaces';
      else pline2 = whole ? total + ' hiding in here' : here + ' hiding here. ' + (total - here) + ' more inside.';
      if (o.mode === 'full' && p === pages - 1 && pages > 1 && !show) pline2 = 'Now go find them';
      return Object.assign({}, b0, {
        isPuzzle: true, isResult: false,
        spoiler: show, clean: !show,
        date: pages > 1 ? (p + 1) + ' / ' + pages : b0.date,
        gap: r.pgap, textSize: r.text + 'px',
        showTitle: firstPage, showCont: !firstPage,
        titleSize: Math.round(r.title * r.ptitle) + 'px',
        kicker: firstPage ? b0.kicker : 'Continued',
        ptitle: show ? 'I found ' + fcount + (o.hideCount ? ' ' : ' of ' + total + ' ') + noun + '.' : (o.hideCount ? 'How many ' + noun + ' can you find?' : 'Can you find ' + total + ' ' + noun + '?'),
        segs: segs.map(s => ({ t: s.t, bg: s.st ? 'var(--accent)' : 'transparent', fg: s.st ? 'var(--on-accent)' : 'inherit', ring: s.st === 2 ? 'inset 0 -4px 0 var(--on-accent)' : 'none' })),
        pline: show ? b0.first + ' \u00b7 ' + fcount + (o.hideCount ? ' found' : '/' + total) + ' in ' + fmt(o.secs) : b0.first + ' found ' + fcount + ' in ' + fmt(o.secs),
        pline2
      });
    });
  }

  window.FigndaCards = { RATIOS, fmt, answersFrom, resultCard, puzzleCards };
})();
