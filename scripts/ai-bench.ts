// How well does a free model hide words? Runs real topics through the same check the Worker uses
// (worker/src/app.ts draft: valid JSON, clean, at least 4 words the engine finds across word boundaries).
//
//   npm run ai:bench                              list the Gemini models this key can use, then test the default
//   npm run ai:bench -- MODEL [MODEL]             test these Gemini models
//   npm run ai:bench -- openrouter:VENDOR/MODEL   test an OpenRouter model (free ones end in ":free")
//   npm run ai:bench -- groq:MODEL                test a Groq model
//
// Keys come from the environment or worker/.dev.vars (gitignored): GEMINI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY.
// They are never printed. Mind the free limits: Gemini allows 20 requests a day on gemini-3.5-flash.

import { existsSync, readFileSync } from 'node:fs';
import { DEFAULT_MODELS, gemini, groq, openrouter, type AiGenerate } from '../worker/src/ai';
import { draft } from '../worker/src/app';

const TOPICS = ['Fruits', 'Football', 'Countries in Africa', 'Musical instruments', 'Animals', 'Colours', 'Planets', 'Nigerian food', 'Car brands', 'Jobs'];
/** Free tiers allow only a few requests a minute. */
const GAP_MS = 7000;

function readKey(name: string): string {
  if (process.env[name]) return process.env[name]!;
  const file = 'worker/.dev.vars';
  const line = existsSync(file) ? readFileSync(file, 'utf8').split(/\r?\n/).find((l) => l.startsWith(`${name}=`)) : undefined;
  const key = line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, '');
  if (!key) throw new Error(`No key. Put ${name}=... in worker/.dev.vars`);
  return key;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function listModels(): Promise<string[]> {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': readKey('GEMINI_API_KEY') } });
  if (!res.ok) throw new Error(`Listing models failed: ${res.status}`);
  const out = (await res.json()) as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> };
  return (out.models ?? []).filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => m.name.replace(/^models\//, ''));
}

async function bench(model: string, ai: AiGenerate) {
  let passed = 0;
  let words = 0;
  const errors = new Map<string, number>();
  for (const topic of TOPICS) {
    // One attempt per topic, so the number is the model's own pass rate. The Worker allows itself 2.
    const made = await draft(async (t) => {
      try {
        return await ai(t);
      } catch (e) {
        const name = e instanceof Error ? e.message : 'error';
        errors.set(name, (errors.get(name) ?? 0) + 1);
        throw e;
      }
    }, topic);
    if (made) {
      passed++;
      words += made.dict.length;
    }
    console.log(`  ${made ? 'pass' : 'fail'}  ${topic}${made ? `: ${made.dict.length} hidden (${made.dict.join(', ')})` : ''}`);
    await sleep(GAP_MS);
  }
  const errs = [...errors].map(([k, n]) => `${k} x${n}`).join(', ');
  console.log(`${model}: ${passed}/${TOPICS.length} passed, ${passed ? (words / passed).toFixed(1) : 0} hidden words a puzzle${errs ? `, errors: ${errs}` : ''}\n`);
}

const asked = process.argv.slice(2);
const other = (m: string) => m.startsWith('openrouter:') || m.startsWith('groq:');
const needsGemini = !asked.length || asked.some((m) => !other(m));
const available = needsGemini ? await listModels() : [];
if (!asked.length) console.log(`Models this key can use:\n  ${available.join('\n  ')}\n`);
for (const model of asked.length ? asked : [DEFAULT_MODELS.gemini]) {
  if (other(model)) {
    console.log(model);
    const id = model.slice(model.indexOf(':') + 1);
    await bench(model, model.startsWith('groq:') ? groq(readKey('GROQ_API_KEY'), id) : openrouter(readKey('OPENROUTER_API_KEY'), id));
    continue;
  }
  if (!available.includes(model)) {
    console.log(`${model}: not available to this key, skipped\n`);
    continue;
  }
  console.log(model);
  await bench(model, gemini(readKey('GEMINI_API_KEY'), model));
}
