import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { pick } from '../copy';
import { generateAvailable, generatePuzzle } from '../lib/api';
import styles from './CustomTopic.module.css';

/** "Or any topic". Only shown when the API has an AI provider switched on. */
export function CustomTopic() {
  const nav = useNavigate();
  const [on, setOn] = useState(false);
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    generateAvailable().then((v) => alive && setOn(v));
    return () => {
      alive = false;
    };
  }, []);

  if (!on) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return setErr('Give us something to hide words in first.');
    setBusy(true);
    setErr('');
    const r = await generatePuzzle(topic);
    setBusy(false);
    if (r.ok) return nav(`/p/${r.code}`);
    setErr(r.error === 'empty_topic' ? 'Give us something to hide words in first.' : pick('genFail'));
  };

  return (
    <form id="custom" className={styles.custom} onSubmit={submit} noValidate>
      <label htmlFor="topic" className={styles.label}>
        Or any topic
      </label>
      <div className={styles.row}>
        <input
          id="topic"
          className={styles.input}
          value={topic}
          maxLength={60}
          placeholder="Football, space, cooking"
          onChange={(e) => {
            setTopic(e.target.value);
            setErr('');
          }}
        />
        <button type="submit" className={styles.go} disabled={busy}>
          {busy ? 'Creating...' : 'Create puzzle'}
        </button>
      </div>
      <p className={styles.err} role="alert">
        {err}
      </p>
    </form>
  );
}
