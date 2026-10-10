import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { PartnerNote } from '../components/PartnerNote';
import { SkeletonList } from '../components/Skeleton';
import { useDelayedWaiting } from '../components/useDelayedWaiting';
import { Waiting } from '../components/Waiting';
import { checkDraft, MAKE, splitWords, type WordState } from '../engine/make';
import { myPuzzles, publishPuzzle, type MyPuzzle } from '../lib/api';
import { useAuth } from '../lib/auth';
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

/** /make. Hide words in your own paragraph. The engine checks every word as you type, and again on the server. */
export function Make() {
  const auth = useAuth();
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [noun, setNoun] = useState('');
  const [text, setText] = useState('');
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [mine, setMine] = useState<MyPuzzle[] | null>(null);
  /** Published: the code to open, held until the waiting line has had its minimum time. */
  const [made, setMade] = useState('');
  // Publishing usually answers in under a second. Past that, the waiting line shows beside the button.
  const waiting = useDelayedWaiting(busy);
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

  const words = useMemo(() => splitWords(raw), [raw]);
  const draft = useMemo(() => checkDraft(text, words), [text, words]);

  if (!auth.enabled) return <Navigate to="/play" replace />;
  if (auth.loading) return <div className={styles.page} aria-busy="true" />;
  if (!auth.profile) return <Navigate to="/signin?next=%2Fmake" replace />;

  const short = text.trim().length < MAKE.minText;
  const ready = draft.ok && title.trim().length >= 2 && noun.trim().length >= 2;
  const need =
    title.trim().length < 2
      ? 'Give it a title.'
      : noun.trim().length < 2
        ? 'Say what is hidden.'
        : short
          ? `Write a little more. ${MAKE.minText} letters at least.`
          : draft.hidden.length < MAKE.minWords
            ? `Hide at least ${MAKE.minWords} words. ${draft.hidden.length} so far.`
            : !draft.ok
              ? 'Fix or remove the words that are not hidden.'
              : `${draft.hidden.length} words hidden. Ready.`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || made) return;
    if (!ready) return setErr(need);
    setBusy(true);
    setErr('');
    const r = await publishPuzzle({ title: title.trim(), noun: noun.trim(), text: text.trim(), words });
    setBusy(false);
    if (r.ok) return setMade(r.code);
    setErr(FAIL[r.error] ?? 'We could not save that. Try again.');
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>
        Make a puzzle.
        <br />
        <span className={styles.sub}>Hide your own words.</span>
      </h1>
      <p className={styles.lead}>
        Write a paragraph about anything. Hide words across the gaps between words: "Pat omitted" hides ATOM. Every word is checked as you type.
      </p>

      <form className={styles.form} onSubmit={submit} noValidate>
        <Field label="Title" maxLength={MAKE.titleMax} placeholder="Sunday at Mama's" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Field label="What is hidden" maxLength={MAKE.nounMax} placeholder="Lagos places" value={noun} onChange={(e) => setNoun(e.target.value)} />
        <label className={styles.area}>
          <span className={styles.label}>
            Paragraph
            <span className={styles.count}>
              {text.length}/{MAKE.maxText}
            </span>
          </span>
          <textarea className={styles.text} rows={7} maxLength={MAKE.maxText} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <label className={styles.area}>
          <span className={styles.label}>Hidden words. Commas or new lines. Up to {MAKE.maxWords}</span>
          <textarea className={styles.text} rows={3} autoCapitalize="none" spellCheck={false} value={raw} onChange={(e) => setRaw(e.target.value)} />
        </label>

        {draft.words.length > 0 && (
          <ul className={styles.words} aria-label="Word check">
            {draft.words.map((w, i) => (
              <li key={`${w.word}-${i}`} className={styles.word} data-ok={w.state === 'hidden' || undefined}>
                <Icon icon={w.state === 'hidden' ? Check : X} size={16} />
                <span className={styles.wordText}>{w.word}</span>
                <span className={styles.why}>{WHY[w.state]}</span>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.row}>
          <Button type="submit" variant="accent" disabled={busy || !!made}>
            Publish puzzle
          </Button>
          {waiting ? (
            <Waiting size="inline" />
          ) : (
            <span className={styles.note} role="status">
              {err || need}
            </span>
          )}
        </div>
      </form>

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
                  <span className={styles.itemTitle}>{p.title}</span>
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
