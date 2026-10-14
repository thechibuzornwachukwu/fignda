// Builds data/words.json: the short English words the Worker uses to tell a real word from a fragment
// (worker/src/realWords.ts). Source: the ENABLE word list, public domain.
//   node scripts/gen-words.mjs path/to/enable1.txt
// Only words of 7 letters or fewer are kept: fragments made by splitting a word are short, and the full
// list would triple the Worker's size.

import { readFileSync, writeFileSync } from 'node:fs';

const MAX = 7;
// Not in ENABLE: one-letter words, British spellings and a few newer everyday words.
const EXTRA = `a i o colour favour honour labour harbour rumour humour flavour vapour armour odour parlour saviour tumour
  centre theatre metre litre fibre sombre grey tyre kerb cheque plough jewelry storey pyjamas mum
  email online blog app wifi selfie emoji laptop website okay ok tv dvd`.split(/\s+/);

const src = readFileSync(process.argv[2], 'utf8').split(/\r?\n/).map((w) => w.trim().toLowerCase());
const words = [...new Set([...src, ...EXTRA])].filter((w) => /^[a-z]+$/.test(w) && w.length <= MAX).sort();
writeFileSync('data/words.json', JSON.stringify({ source: 'ENABLE word list (public domain), 7 letters or fewer, plus a few extras. Built by scripts/gen-words.mjs.', words: words.join(' ') }) + '\n');
console.log(`${words.length} words`);
