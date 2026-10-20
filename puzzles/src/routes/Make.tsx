import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { PartnerNote } from '../components/PartnerNote';
import { SkeletonList, SkeletonPage } from '../components/Skeleton';
import { TextLink } from '../components/TextLink';
import { TopicIcon } from '../components/TopicIcon';
import { TOPIC_ICONS } from '../components/topicIcons';
import { useDelayedWaiting } from '../components/useDelayedWaiting';
import { Waiting } from '../components/Waiting';
import { pick } from '../copy';
import { checkDraft, MAKE, splitWords, type WordState } from '../engine/make';
import { readBox, surprise } from '../engine/makeBox';
import { iconForTopic } from '../engine/topicIcon';
import { fetchCustomGame, getGenerateJob, myPuzzles, publishPuzzle, runGenerateJob, startGenerate, type GenerateJobResult, type MyPuzzle } from '../lib/api';
import { useAuth } from '../lib/auth';
import { clearMakeJob, loadMakeJob, saveMakeJob, type MakeJob } from '../lib/makeJob';
import styles from './Make.module.css';

const WHY: Record<WordState, string> = {
  hidden: 'Hidden',
  missing: 'Not in your paragraph',
  plain: 'In plain sight. It must run across two words',
  bad: 'Use 3 to 12 letters, no spaces',
  repeat: 'Typed twice',
};

const FAIL: Record<string, string> = {
  not_allowed: 'Some of that is not allowed here. Keep it family friendly.',
  not_hidden: 'Some words are not hidden yet. Check the list.',
  rate_limited: 'That is enough puzzles for now. Try again in an hour.',
  sign_in_required: 'Sign in again, then publish.',
};

/** "in 1 minute", "in 12 minutes", "in 1 hour". Rounded up, so it is never too early. */
function retryIn(secs: number | undefined): string {
  if (!secs) return 'a little while';
  const mins = Math.ceil(secs / 60);
  if (mins < 60) return mins === 1 ? '1 minute' : `${mins} minutes`;
  const hours = Math.ceil(mins / 60);
  return hours === 1 ? '1 hour' : `${hours} hours`;
}

const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/** The line for a draft that could not be written. */
function failLine(error: string, retryAfter?: number): string {
  if (error === 'rate_limited') return pick('genLimit', { t: retryIn(retryAfter) });
  if (error === 'sign_in_required' || error === 'bad_token' || error === 'unknown_job') return 'Sign in again, then try once more.';
  if (error === 'network' && offline()) return pick('genOffline');
  return pick('genFail');
}

/** What is being written, edited and published. `topic`: what a written draft was asked for, for "Another go". */
type Draft = { title: string; noun: string; text: string; raw: string; icon: string; topic?: string };
const emptyDraft = (): Draft => ({ title: '', noun: '', text: '', raw: '', icon: iconForTopic('') });

/** How long to wait between looks at a job nobody is working on. */
const POLL_MS = 5000;

/**
 * /make (BUILD_PLAN set 6): one box. Nothing typed: Surprise me. A topic or an emoji: the system writes a draft.
 * A paragraph: Hide some for me finds the words already hidden in it. Or Write it myself. Every road ends on the
 * same draft, checked word by word as it is edited, and Publish is always the player's tap.
 */
export function Make() {
  const auth = useAuth();
  const nav = useNavigate();
  const [box, setBox] = useState('');
  const [boxNote, setBoxNote] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [job, setJob] = useState<MakeJob | null>(() => loadMakeJob());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [mine, setMine] = useState<MyPuzzle[] | null>(null);
  const [made, setMade] = useState('');
  const waiting = useDelayedWaiting(busy);
  const flight = useRef<AbortController | null>(null);
  const me = auth.profile?.id;

  useEffect(() => {
    if (!me) return;
    let alive = true;
    myPuzzles()
      .then((r) => alive && setMine(r))
      .catch(() => alive && setMine([]));
    return () => {
      alive = false;
    };
  }, [me]);

  useEffect(() => {
    if (made && !waiting) nav(`/p/${made}`);
  }, [made, waiting, nav]);

  // Leaving the page stops waiting, never the job: it is picked up on return.
  useEffect(() => () => flight.current?.abort(), []);

  /** A job's answer: a draft to edit, a line to show, or wait on. */
  const settle = useCallback(async (r: GenerateJobResult, topic: string): Promise<'done' | 'wait'> => {
    if (!r.ok) {
      clearMakeJob();
      setJob(null);
      setBoxNote(failLine(r.error, r.retryAfter));
      return 'done';
    }
    if (r.job.state === 'waiting') return 'wait';
    clearMakeJob();
    setJob(null);
    if (r.job.state === 'failed' || !r.job.code) {
      setBoxNote(failLine(r.job.error ?? 'generate_failed'));
      return 'done';
    }
    const g = await fetchCustomGame(r.job.code);
    if (!g) {
      setBoxNote(failLine('generate_failed'));
      return 'done';
    }
    setDraft({ title: g.title, noun: g.noun, text: g.text, raw: g.dict.join(', '), icon: g.icon ?? iconForTopic(topic), topic });
    return 'done';
  }, []);

  /** Wait for a job: do the work if nobody is, else look again every few seconds. */
  const follow = useCallback(
    async (j: MakeJob) => {
      const ctl = new AbortController();
      flight.current?.abort();
      flight.current = ctl;
      setBusy(true);
      let r = await getGenerateJob(j.id);
      while (!ctl.signal.aborted) {
        if ((await settle(r, j.topic)) === 'done') break;
        if (r.ok && r.job.run) r = await runGenerateJob(j.id, ctl.signal);
        else {
          await new Promise((ok) => setTimeout(ok, POLL_MS));
          r = await getGenerateJob(j.id);
        }
        // A dropped connection while running: look again rather than give up.
        if (!r.ok && r.error === 'network' && !offline() && !ctl.signal.aborted) r = await getGenerateJob(j.id);
      }
      if (flight.current === ctl) {
        flight.current = null;
        setBusy(false);
      }
    },
    [settle],
  );

  // A wait left half way: pick it up.
  const resumed = useRef(false);
  useEffect(() => {
    if (!me || resumed.current || !job) return;
    resumed.current = true;
    void follow(job);
  }, [me, job, follow]);

  const ask = async (topic: string) => {
    if (busy) return;
    if (offline()) return setBoxNote(pick('genOffline'));
    setBoxNote('');
    setBusy(true);
    const r = await startGenerate(topic);
    if (!r.ok) {
      setBusy(false);
      return setBoxNote(failLine(r.error, r.retryAfter));
    }
    const j = { id: r.job.id, topic };
    saveMakeJob(j);
    setJob(j);
    await follow(j);
  };

  const cancel = () => {
    flight.current?.abort();
    flight.current = null;
    clearMakeJob();
    setJob(null);
    setBusy(false);
  };

  const read = readBox(box);
  const hideSome = async (text: string) => {
    // The word list is large: it loads only when asked for.
    const { hideForMe } = await import('../engine/hideForMe');
    const words = hideForMe(text);
    if (words.length < MAKE.minWords) return setBoxNote('Fewer than 4 words hide in that. Write a little more, or try another topic.');
    setBoxNote('');
    setDraft({ ...emptyDraft(), text: text.slice(0, MAKE.maxText), raw: words.join(', ') });
  };

  const submitBox = (e: FormEvent) => {
    e.preventDefault();
    if (read.kind === 'empty') return void ask(surprise());
    if (read.kind === 'topic') return void ask(read.topic);
    if (read.kind === 'paragraph') return void hideSome(read.text);
    setBoxNote('We do not know that emoji yet. Add a word beside it.');
  };

  const words = useMemo(() => splitWords(draft?.raw ?? ''), [draft?.raw]);
  const check = useMemo(() => checkDraft(draft?.text ?? '', words), [draft?.text, words]);

  if (!auth.enabled) return <Navigate to="/play" replace />;
  if (auth.loading) return <SkeletonPage />;
  if (!auth.profile) return <Navigate to="/signin?next=%2Fmake" replace />;

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const short = (draft?.text.trim().length ?? 0) < MAKE.minText;
  const ready = !!draft && check.ok && draft.title.trim().length >= 2 && draft.noun.trim().length >= 2;
  const need = !draft
    ? ''
    : draft.title.trim().length < 2
      ? 'Give it a title.'
      : draft.noun.trim().length < 2
        ? 'Say what is hidden.'
        : short
          ? `Write a little more. ${MAKE.minText} letters at least.`
          : check.hidden.length < MAKE.minWords
            ? `Hide at least ${MAKE.minWords} words. ${check.hidden.length} so far.`
            : !check.ok
              ? 'Fix or remove the words that are not hidden.'
              : `${check.hidden.length} words hidden. Ready.`;

  const publish = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft || busy || made) return;
    if (!ready) return setErr(need);
    setBusy(true);
    setErr('');
    const r = await publishPuzzle({ title: draft.title.trim(), noun: draft.noun.trim(), text: draft.text.trim(), words, icon: draft.icon });
    setBusy(false);
    if (r.ok) return setMade(r.code);
    setErr(FAIL[r.error] ?? 'We could not save that. Try again.');
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Make a puzzle.</h1>

      {!draft ? (
        <form className={styles.form} onSubmit={submitBox} noValidate data-make-box>
          <label className={styles.area}>
            <span className={styles.label}>What should we hide words in?</span>
            <textarea
              className={styles.text}
              rows={3}
              maxLength={MAKE.maxText}
              placeholder="Lagos, football, jollof, or a paragraph of your own"
              value={box}
              onChange={(e) => {
                setBox(e.target.value);
                setBoxNote('');
              }}
            />
          </label>
          <div className={styles.row}>
            <Button type="submit" variant="accent" disabled={busy}>
              {read.kind === 'empty' ? 'Surprise me' : read.kind === 'paragraph' ? 'Hide some for me' : 'Make it'}
            </Button>
            <TextLink onClick={() => setDraft(emptyDraft())}>Write it myself</TextLink>
          </div>
          {boxNote && (
            <p className={styles.note} role="alert">
              {boxNote}
            </p>
          )}
        </form>
      ) : (
        <form className={styles.form} onSubmit={publish} noValidate data-make-draft>
          <Field label="Title" maxLength={MAKE.titleMax} placeholder="Sunday at Mama's" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          <Field label="What is hidden" maxLength={MAKE.nounMax} placeholder="Lagos places" value={draft.noun} onChange={(e) => set({ noun: e.target.value })} />
          <label className={styles.area}>
            <span className={styles.label}>
              Paragraph
              <span className={styles.count}>
                {draft.text.length}/{MAKE.maxText}
              </span>
            </span>
            <textarea className={styles.text} rows={7} maxLength={MAKE.maxText} value={draft.text} onChange={(e) => set({ text: e.target.value })} />
          </label>
          <label className={styles.area}>
            <span className={styles.label}>Hidden words. Commas or new lines. Up to {MAKE.maxWords}</span>
            <textarea className={styles.text} rows={3} autoCapitalize="none" spellCheck={false} value={draft.raw} onChange={(e) => set({ raw: e.target.value })} />
          </label>

          {check.words.length > 0 && (
            <ul className={styles.words} aria-label="Word check">
              {check.words.map((w, i) => (
                <li key={`${w.word}-${i}`} className={styles.word} data-ok={w.state === 'hidden' || undefined}>
                  <Icon icon={w.state === 'hidden' ? Check : X} size={16} />
                  <span className={styles.wordText}>{w.word}</span>
                  <span className={styles.why}>{WHY[w.state]}</span>
                </li>
              ))}
            </ul>
          )}

          <fieldset className={styles.icons}>
            <legend className={styles.label}>Icon</legend>
            <div className={styles.iconGrid} role="radiogroup" aria-label="Icon">
              {Object.keys(TOPIC_ICONS).map((name) => (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={draft.icon === name}
                  aria-label={name}
                  className={styles.iconPick}
                  onClick={() => set({ icon: name })}
                >
                  <TopicIcon name={name} size={20} />
                </button>
              ))}
            </div>
          </fieldset>

          <div className={styles.row}>
            <Button type="submit" variant="accent" disabled={busy || !!made}>
              Publish puzzle
            </Button>
            {draft.topic && (
              <TextLink
                onClick={() => {
                  const topic = draft.topic!;
                  setDraft(null);
                  void ask(topic);
                }}
              >
                Another go
              </TextLink>
            )}
            <TextLink onClick={() => setDraft(null)}>Start again</TextLink>
          </div>
          <p className={styles.note} role="status">
            {err || need}
          </p>
        </form>
      )}

      {waiting && !draft && <Waiting size="full" pool="waitingMake" cover takeFocus onCancel={cancel} />}

      <section className={styles.section} aria-labelledby="mine-title">
        <h2 id="mine-title" className={styles.h2}>
          Your puzzles
        </h2>
        {mine == null ? (
          <SkeletonList rows={3} />
        ) : mine.length === 0 ? (
          <PartnerNote>
            <p className={styles.muted}>Nothing yet. Publish one and send the link to a friend.</p>
          </PartnerNote>
        ) : (
          <ul className={styles.list}>
            {mine.map((p) => (
              <li key={p.code}>
                <Link to={`/p/${p.code}`} className={styles.item}>
                  <span className={styles.itemTitle}>
                    <TopicIcon name={p.icon} size={16} />
                    {p.title}
                  </span>
                  <span className={styles.itemMeta}>
                    {p.words} words · {p.plays} {p.plays === 1 ? 'play' : 'plays'} · {p.ups} liked it
                    {p.downs > 0 ? ` · ${p.downs} did not` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
