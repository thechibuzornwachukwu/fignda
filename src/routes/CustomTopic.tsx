import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDelayedWaiting } from '../components/useDelayedWaiting';
import { Waiting } from '../components/Waiting';
import { pick } from '../copy';
import { generateAvailable, generatePuzzle, type GenerateResult } from '../lib/api';
import styles from './CustomTopic.module.css';

/** Nothing spins forever: after this the request is stopped and the failure line shows. */
const GENERATE_CAP_MS = 5 * 60 * 1000;

const EMPTY = 'Give us something to hide words in first.';

/** "in 1 minute", "in 12 minutes", "in 1 hour". Rounded up, so it is never too early. */
function retryIn(secs: number | undefined): string {
  if (!secs) return 'a little while';
  const mins = Math.ceil(secs / 60);
  if (mins < 60) return mins === 1 ? '1 minute' : `${mins} minutes`;
  const hours = Math.ceil(mins / 60);
  return hours === 1 ? '1 hour' : `${hours} hours`;
}

const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

function failLine(r: Extract<GenerateResult, { ok: false }>): string {
  if (r.error === 'empty_topic') return EMPTY;
  if (r.error === 'rate_limited') return pick('genLimit', { t: retryIn(r.retryAfter) });
  if (r.error === 'network' && offline()) return pick('genOffline');
  return pick('genFail');
}

/** "Or any topic". Only shown when the API has an AI provider switched on. */
export function CustomTopic() {
  const nav = useNavigate();
  const [on, setOn] = useState(false);
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  /** The answer, held until the waiting screen has had its minimum time: the puzzle to open, or the line to show. */
  const [done, setDone] = useState<{ code: string } | { line: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** The request in flight. Also the guard against a second tap or a second Enter. */
  const flight = useRef<AbortController | null>(null);
  const waiting = useDelayedWaiting(busy);
  // Cancel closes it at once. Otherwise it stays for its minimum time, holding the answer.
  const showing = waiting && (busy || !!done);
  const wasShowing = useRef(false);

  useEffect(() => {
    let alive = true;
    generateAvailable().then((v) => alive && setOn(v));
    return () => {
      alive = false;
    };
  }, []);

  // Leaving the page (back button, a link) stops the request, so nothing jumps to the puzzle afterwards.
  useEffect(
    () => () => {
      flight.current?.abort();
      flight.current = null;
    },
    [],
  );

  // The puzzle opens once the waiting screen is gone (or at once, if it never showed).
  const code = done && 'code' in done ? done.code : '';
  useEffect(() => {
    if (code && !waiting) nav(`/p/${code}`);
  }, [code, waiting, nav]);

  // Keyboard: when the waiting screen closes, focus is back in the input with the topic still there.
  useEffect(() => {
    if (wasShowing.current && !showing) inputRef.current?.focus();
    wasShowing.current = showing;
  }, [showing]);

  if (!on) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (flight.current || code) return;
    if (!topic.trim()) return setErr(EMPTY);
    if (offline()) return setErr(pick('genOffline'));
    const ctl = new AbortController();
    flight.current = ctl;
    setBusy(true);
    setErr('');
    setDone(null);
    const cap = setTimeout(() => ctl.abort('timeout'), GENERATE_CAP_MS);
    const r = await generatePuzzle(topic, ctl.signal);
    clearTimeout(cap);
    // Cancelled, or the page was left: this answer belongs to nobody.
    if (flight.current !== ctl) return;
    flight.current = null;
    setBusy(false);
    // Stopped by the 5 minute cap ("aborted" here): the player gets the failure line.
    setDone(r.ok ? { code: r.code } : { line: failLine(r) });
  };

  const cancel = () => {
    flight.current?.abort();
    flight.current = null;
    setBusy(false);
    setDone(null);
  };

  return (
    <>
      <form id="custom" className={styles.custom} onSubmit={submit} noValidate>
        <label htmlFor="topic" className={styles.label}>
          Or any topic
        </label>
        <div className={styles.row}>
          <input
            id="topic"
            ref={inputRef}
            className={styles.input}
            value={topic}
            maxLength={60}
            placeholder="Football, space, cooking"
            onChange={(e) => {
              setTopic(e.target.value);
              setErr('');
              if (!code) setDone(null);
            }}
          />
          <button type="submit" className={styles.go} disabled={busy || !!code}>
            Create puzzle
          </button>
        </div>
        <p className={styles.err} role="alert">
          {err || (done && 'line' in done && !waiting ? done.line : '')}
        </p>
      </form>
      {showing && <Waiting size="full" pool="waitingMake" cover takeFocus onCancel={cancel} />}
    </>
  );
}
