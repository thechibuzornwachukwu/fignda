import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Field } from '../components/Field';
import { PageHeader } from '../components/PageHeader';
import { Segmented } from '../components/Segmented';
import { follow, isFollowing, newPlayers, searchPlayers, suggestedPlayers, topPlayers, unfollow, type PlayerRef, type Suggested } from '../lib/api';
import { useStreak } from '../lib/useStreak';
import { keepUnlocked, useUnlocks } from '../lib/useUnlocks';
import { useAuth } from '../lib/auth';
import { Avatar } from '../components/Avatar';
import { FriendStreaks } from './FriendStreaks';
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

/** A list that is loading (null), that did not load, or that is here. */
type Rows = Row[] | null | 'failed';

/** Only rows with a handle and a name are shown, so a broken reply never prints "undefined". */
const clean = <T extends PlayerRef>(r: unknown): T[] => (Array.isArray(r) ? (r as T[]).filter((p) => p && typeof p.handle === 'string' && p.handle !== '') : []);
const count = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/** `me` (your user id) adds a Follow button to every row but your own. */
function List({ rows, empty, me, myHandle, check = false }: { rows: Rows; empty: ReactNode; me?: string; myHandle?: string; check?: boolean }) {
  if (rows == null) return <div className={styles.loading} aria-busy="true" />;
  // A list that failed says so. It never claims to be empty.
  if (rows === 'failed') return <p className={styles.muted}>This list did not load. Try again in a moment.</p>;
  if (rows.length === 0) return <p className={styles.muted}>{empty}</p>;
  return (
    <ul className={styles.list}>
      {rows.map((p) => (
        <li key={p.handle} className={styles.item}>
          <Link to={`/u/${p.handle}`} className={styles.row}>
            <Avatar handle={p.handle} size={40} />
            <span className={styles.who}>
              <span className={styles.name}>{p.name || `@${p.handle}`}</span>
              <span className={styles.handle}>@{p.handle}</span>
            </span>
            {p.stat && <span className={styles.stat}>{p.stat}</span>}
          </Link>
          {me && p.handle !== myHandle && <FollowButton me={me} handle={p.handle} name={p.name || p.handle} check={check} />}
        </li>
      ))}
    </ul>
  );
}

const TOPS = ['streak', 'perfect', 'new', 'points'] as const;
type Top = (typeof TOPS)[number];
const TOP_LABEL: Record<Top, string> = { streak: 'Streaks', perfect: 'Perfect', new: 'New', points: 'Points' };
const TOP_EMPTY: Record<Top, string> = {
  streak: "No streaks yet. Play today's daily to start one.",
  perfect: 'Nobody has found every word yet.',
  new: 'No new players this week.',
  points: 'No points yet. Every word you find adds to yours.',
};

async function loadTop(kind: Top): Promise<Row[]> {
  if (kind === 'new') return clean<Row>(await newPlayers());
  const rows = clean<PlayerRef & { value: number }>(await topPlayers(kind));
  return rows.map((p) => {
    const v = count(p.value);
    const stat = kind === 'streak' ? `${v} ${v === 1 ? 'day' : 'days'}` : kind === 'points' ? `${v.toLocaleString('en-US')} pts` : `${v} perfect`;
    return { handle: p.handle, name: p.name, stat };
  });
}

/** One section where there were 4: the best players, one list at a time. Points joins once the viewer has some to compare. */
function TopPlayers({ points }: { points: boolean }) {
  const [kind, setKind] = useState<Top>('streak');
  const [lists, setLists] = useState<Partial<Record<Top, Rows>>>({});
  const loaded = lists[kind] !== undefined;
  useEffect(() => {
    if (loaded) return;
    let alive = true;
    loadTop(kind)
      .then((r) => alive && setLists((l) => ({ ...l, [kind]: r })))
      .catch(() => alive && setLists((l) => ({ ...l, [kind]: 'failed' })));
    return () => {
      alive = false;
    };
  }, [kind, loaded]);
  const options = TOPS.filter((t) => t !== 'points' || points).map((t) => [t, TOP_LABEL[t]] as const);
  return (
    <section className={styles.section} aria-labelledby="top-title">
      <h2 id="top-title" className={styles.h2}>
        Top players
      </h2>
      <div className={styles.switch}>
        <Segmented label="List" hideLabel options={options} value={kind} onChange={setKind} />
      </div>
      <List rows={lists[kind] ?? null} empty={TOP_EMPTY[kind]} />
    </section>
  );
}

/** /players. Find people: search and people to follow lead, then friend streaks, then the top players. */
export function Players() {
  const auth = useAuth();
  const run = useStreak();
  const open = useUnlocks(run.played);
  const { hash } = useLocation();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Rows>([]);
  const [suggested, setSuggested] = useState<Rows>(null);
  const me = auth.profile?.id;
  const myHandle = auth.profile?.handle;
  // A direct link always works: /players#friend-streaks shows the section, and it stays from then on.
  const asked = hash === '#friend-streaks';
  useEffect(() => {
    if (asked) keepUnlocked(['friendStreaks']);
  }, [asked]);

  // Suggestions depend on who is asking: they leave out you and the people you already follow.
  useEffect(() => {
    let alive = true;
    suggestedPlayers()
      .then(
        (r) =>
          alive &&
          setSuggested(
            clean<Suggested>(r).map((s) => {
              const mutuals = count(s.mutuals);
              const plays = count(s.plays);
              return {
                handle: s.handle,
                name: s.name,
                stat: mutuals > 0 ? `Followed by ${mutuals} you follow` : plays > 0 ? `${plays} ${plays === 1 ? 'play' : 'plays'}` : 'New here',
              };
            }),
          ),
      )
      .catch(() => alive && setSuggested('failed'));
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
        .then((r) => alive && setHits(clean<Row>(r)))
        .catch(() => alive && setHits('failed'));
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [q]);

  if (!auth.enabled) return <Navigate to="/play" replace />;
  const searching = q.trim().length > 0;
  const signIn = (
    <Link to="/signin?next=%2Fplayers" className={styles.signin}>
      Sign in
    </Link>
  );

  return (
    <div className={styles.page}>
      <PageHeader title="Squad" />

      {/* Friend streaks appear after the third daily. A player already in one, or asked into one, sees it at once. */}
      {!searching && me && <FriendStreaks quiet={!open.friendStreaks && !asked} />}

      {!searching && <TopPlayers points={open.points} />}
      {/* Suggestions only when there is someone to suggest: an empty list is one more thing to read. */}
      {!searching && !(me && Array.isArray(suggested) && suggested.length === 0) && (
        <section className={styles.section} aria-labelledby="suggested-title">
          <h2 id="suggested-title" className={styles.h2}>
            People to follow
          </h2>
          <List
            rows={suggested}
            empty={me ? 'You follow everyone here. Invite a friend and they will show up.' : 'Nobody else has joined yet. Invite a friend and they will show up here.'}
            me={me}
            myHandle={myHandle}
          />
          {!me && !auth.loading && Array.isArray(suggested) && <p className={styles.note}>{signIn} to follow players and see them on your own leaderboard.</p>}
        </section>
      )}

      <section className={styles.section} aria-label="Search players">
        <Field
          label="Find a player by handle"
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

    </div>
  );
}
