import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Field } from '../components/Field';
import { follow, isFollowing, newPlayers, searchPlayers, suggestedPlayers, topPlayers, unfollow, type PlayerRef } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Avatar } from '../components/Avatar';
import styles from './Players.module.css';

type Row = PlayerRef & { stat?: string };

/** Follow or unfollow from a row, without opening the profile. */
function FollowButton({ me, handle, name, check }: { me: string; handle: string; name: string; check: boolean }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  // Suggestions never include people you follow; search results can, so those rows ask.
  useEffect(() => {
    if (!check) return;
    let alive = true;
    isFollowing(me, handle)
      .then((f) => alive && setOn(f))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [check, me, handle]);
  const toggle = async () => {
    setBusy(true);
    const ok = await (on ? unfollow(me, handle) : follow(me, handle)).catch(() => false);
    setBusy(false);
    if (ok) setOn(!on);
  };
  return (
    <button type="button" className={styles.follow} aria-pressed={on} aria-label={`${on ? 'Following' : 'Follow'} ${name}`} disabled={busy} onClick={() => void toggle()}>
      {on ? 'Following' : 'Follow'}
    </button>
  );
}

/** `me` (your user id) adds a Follow button to every row but your own. */
function List({ rows, empty, me, myHandle, check = false }: { rows: Row[] | null; empty: string; me?: string; myHandle?: string; check?: boolean }) {
  if (rows == null) return <div className={styles.loading} aria-busy="true" />;
  if (rows.length === 0) return <p className={styles.muted}>{empty}</p>;
  return (
    <ul className={styles.list}>
      {rows.map((p) => (
        <li key={p.handle} className={styles.item}>
          <Link to={`/u/${p.handle}`} className={styles.row}>
            <Avatar handle={p.handle} size={40} />
            <span className={styles.who}>
              <span className={styles.name}>{p.name}</span>
              <span className={styles.handle}>@{p.handle}</span>
            </span>
            {p.stat && <span className={styles.stat}>{p.stat}</span>}
          </Link>
          {me && p.handle !== myHandle && <FollowButton me={me} handle={p.handle} name={p.name} check={check} />}
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
  const [suggested, setSuggested] = useState<Row[] | null>(null);
  const me = auth.profile?.id;
  const myHandle = auth.profile?.handle;

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

  // Suggestions depend on who is asking: they leave out you and the people you already follow.
  useEffect(() => {
    let alive = true;
    suggestedPlayers()
      .then(
        (r) =>
          alive &&
          setSuggested(
            r.map((s) => ({
              handle: s.handle,
              name: s.name,
              stat: s.mutuals > 0 ? `Followed by ${s.mutuals} you follow` : s.plays > 0 ? `${s.plays} ${s.plays === 1 ? 'play' : 'plays'}` : 'New here',
            })),
          ),
      )
      .catch(() => alive && setSuggested([]));
    return () => {
      alive = false;
    };
  }, [me]);

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
        {searching && <List rows={hits} empty={`No handle starts with @${q.trim().toLowerCase()}.`} me={me} myHandle={myHandle} check />}
      </section>

      {!searching && (
        <section className={styles.section} aria-labelledby="suggested-title">
          <h2 id="suggested-title" className={styles.h2}>
            People to follow
          </h2>
          <List rows={suggested} empty="Nobody else has joined yet. Invite a friend and they will show up here." me={me} myHandle={myHandle} />
          {!me && !auth.loading && !!suggested?.length && (
            <p className={styles.muted}>
              <Link to="/signin?next=%2Fplayers" className={styles.signin}>
                Sign in
              </Link>{' '}
              to follow players and see them on your own leaderboard.
            </p>
          )}
        </section>
      )}

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
