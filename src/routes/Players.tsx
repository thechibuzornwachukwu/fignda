import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Field } from '../components/Field';
import { newPlayers, searchPlayers, topPlayers, type PlayerRef } from '../lib/api';
import { useAuth } from '../lib/auth';
import styles from './Players.module.css';

type Row = PlayerRef & { stat?: string };

function List({ rows, empty }: { rows: Row[] | null; empty: string }) {
  if (rows == null) return <div className={styles.loading} aria-busy="true" />;
  if (rows.length === 0) return <p className={styles.muted}>{empty}</p>;
  return (
    <ul className={styles.list}>
      {rows.map((p) => (
        <li key={p.handle}>
          <Link to={`/u/${p.handle}`} className={styles.row}>
            <span className={styles.avatar} aria-hidden="true">
              {p.name.charAt(0).toUpperCase()}
            </span>
            <span className={styles.who}>
              <span className={styles.name}>{p.name}</span>
              <span className={styles.handle}>@{p.handle}</span>
            </span>
            {p.stat && <span className={styles.stat}>{p.stat}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** /players. Find people to follow: search by handle, plus players worth following. */
export function Players() {
  const auth = useAuth();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Row[] | null>([]);
  const [streaks, setStreaks] = useState<Row[] | null>(null);
  const [perfect, setPerfect] = useState<Row[] | null>(null);
  const [fresh, setFresh] = useState<Row[] | null>(null);

  useEffect(() => {
    let alive = true;
    topPlayers('streak')
      .then((r) => alive && setStreaks(r.map((p) => ({ ...p, stat: `${p.value} ${p.value === 1 ? 'day' : 'days'}` }))))
      .catch(() => alive && setStreaks([]));
    topPlayers('perfect')
      .then((r) => alive && setPerfect(r.map((p) => ({ ...p, stat: `${p.value} perfect` }))))
      .catch(() => alive && setPerfect([]));
    newPlayers()
      .then((r) => alive && setFresh(r))
      .catch(() => alive && setFresh([]));
    return () => {
      alive = false;
    };
  }, []);

  // Search as you type, a beat after the last key.
  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    let alive = true;
    const id = window.setTimeout(() => {
      searchPlayers(term)
        .then((r) => alive && setHits(r))
        .catch(() => alive && setHits([]));
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [q]);

  if (!auth.enabled) return <Navigate to="/play" replace />;
  const searching = q.trim().length > 0;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>
        Players.
        <br />
        <span className={styles.sub}>Find your rivals.</span>
      </h1>

      <section className={styles.section} aria-label="Search players">
        <Field
          label="Search by handle"
          prefix="@"
          placeholder="ada"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={20}
          value={q}
          onChange={(e) => {
            setQ(e.target.value.replace(/^@/, ''));
            setHits(null);
          }}
        />
        {searching && <List rows={hits} empty={`No handle starts with @${q.trim().toLowerCase()}.`} />}
      </section>

      {!searching && (
        <div className={styles.grid}>
          <section className={styles.section} aria-labelledby="streaks-title">
            <h2 id="streaks-title" className={styles.h2}>
              Longest streaks
            </h2>
            <List rows={streaks} empty="No streaks yet. Play today's daily to start one." />
          </section>
          <section className={styles.section} aria-labelledby="perfect-title">
            <h2 id="perfect-title" className={styles.h2}>
              Most perfect dailies
            </h2>
            <List rows={perfect} empty="Nobody has found every word yet." />
          </section>
          <section className={styles.section} aria-labelledby="new-title">
            <h2 id="new-title" className={styles.h2}>
              New this week
            </h2>
            <List rows={fresh} empty="No new players this week." />
          </section>
        </div>
      )}
    </div>
  );
}
