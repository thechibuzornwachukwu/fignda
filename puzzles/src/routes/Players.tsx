import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { PageHeader } from '../components/PageHeader';
import { PartnerNote } from '../components/PartnerNote';
import { Segmented } from '../components/Segmented';
import { SkeletonList } from '../components/Skeleton';
import { cheer, fetchNotifications, follow, isFollowing, markNotificationsRead, myCircles, newPlayers, searchPlayers, squadFeed, suggestedPlayers, topPlayers, unfollow, type FeedItem, type PlayerRef, type Suggested } from '../lib/api';
import { medalsOf } from '../lib/medals';
import { ago, describe, type Note } from '../lib/notifications';
import { announceRead } from '../lib/useUnread';
import { Heart, UserCheck, UserPlus } from 'lucide-react';
import { Icon } from '../components/Icon';
import { MedalFace } from '../components/Medals';
import { useStreak } from '../lib/useStreak';
import { keepUnlocked, useUnlocks } from '../lib/useUnlocks';
import { useAuth } from '../lib/auth';
import { Avatar } from '../components/Avatar';
import { FriendStreaks } from './FriendStreaks';
import circles from './Circles.module.css';
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
      <Icon icon={on ? UserCheck : UserPlus} size={18} />
    </button>
  );
}

/** A list that is loading (null), that did not load, or that is here. */
type Rows = Row[] | null | 'failed';

/** Only rows with a handle and a name are shown, so a broken reply never prints "undefined". */
const clean = <T extends PlayerRef>(r: unknown): T[] => (Array.isArray(r) ? (r as T[]).filter((p) => p && typeof p.handle === 'string' && p.handle !== '') : []);
const count = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/** `me` (your user id) adds a Follow button to every row but your own. */
function List({ rows, empty, me, myHandle, check = false, pet = false }: { rows: Rows; empty: ReactNode; me?: string; myHandle?: string; check?: boolean; /** This list carries the screen's one pet when it is empty or did not load. */ pet?: boolean }) {
  if (rows == null) return <SkeletonList rows={5} avatar={40} sub />;
  // A list that failed says so. It never claims to be empty.
  const none = rows === 'failed' ? 'This list did not load. Try again in a moment.' : rows.length === 0 ? empty : null;
  if (none != null) {
    const line = <p className={styles.muted}>{none}</p>;
    return pet ? <PartnerNote moment={rows === 'failed' ? 'error' : 'empty'}>{line}</PartnerNote> : line;
  }
  if (rows === 'failed') return null;
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
  streak: "No streaks yet. Finish a puzzle today to start one.",
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
      <List rows={lists[kind] ?? null} empty={TOP_EMPTY[kind]} pet />
    </section>
  );
}

type CircleRef = { code: string; name: string; members: number };

type Scope = 'friends' | 'world';

/** The medal a badge code is a tier of, or null for a code this build does not know. */
const medalOf = (code: string) => medalsOf([code]).find((m) => m.tier >= 0 && m.key !== 'first') ?? null;

/** One line of the feed: a medal someone won, or something that happened to you. Newest first. */
type Entry = { at: string; medal: FeedItem } | { at: string; note: Note };

/** A medal's cheers. Yours: the count. Anyone else's: a button, pressed once you have cheered. */
function Cheer({ item, me }: { item: FeedItem; me?: string }) {
  const [on, setOn] = useState(item.cheered);
  const [n, setN] = useState(item.cheers);
  const [busy, setBusy] = useState(false);
  const label = `${n} ${n === 1 ? 'cheer' : 'cheers'}`;
  if (item.mine || !me) {
    if (n === 0) return null;
    return (
      <span className={styles.cheers} aria-label={label}>
        <Icon icon={Heart} size={16} />
        {n}
      </span>
    );
  }
  const toggle = async () => {
    setBusy(true);
    setOn(!on);
    setN(n + (on ? -1 : 1));
    const next = await cheer(item.handle, item.code, !on).catch(() => null);
    setBusy(false);
    if (next == null) {
      setOn(on);
      setN(n);
    } else setN(next);
  };
  return (
    <button type="button" className={styles.cheer} aria-pressed={on} aria-label={`Cheer ${item.name || item.handle}, ${label}`} disabled={busy} onClick={() => void toggle()}>
      <Icon icon={Heart} size={18} />
      {n > 0 && <span className={styles.cheerCount}>{n}</span>}
    </button>
  );
}

/**
 * The feed: medals lately won by you, the people you follow, or the top players, with what happened to you
 * (follows, streak asks, nudges, invites, cheers) in among them. Opening it reads your notifications.
 */
function Feed({ me }: { me?: string }) {
  const [scope, setScope] = useState<Scope>(me ? 'friends' : 'world');
  const [lists, setLists] = useState<Partial<Record<Scope, Entry[] | 'failed'>>>({});
  const list = lists[scope];
  useEffect(() => {
    if (list !== undefined) return;
    let alive = true;
    const notes = scope === 'friends' && me ? fetchNotifications().catch(() => [] as Note[]) : Promise.resolve([] as Note[]);
    Promise.all([squadFeed(scope), notes])
      .then(([medals, ns]) => {
        if (!alive) return;
        const won: Entry[] = clean<FeedItem>(medals)
          .filter((f) => typeof f.code === 'string' && medalOf(f.code))
          .map((f) => ({ at: f.earned_at, medal: f }));
        // Your own medals are already in the feed; the note that you won one would say it twice.
        const told: Entry[] = (Array.isArray(ns) ? ns : []).filter((n) => n && n.kind !== 'badge').map((n) => ({ at: n.created_at, note: n }));
        setLists((l) => ({ ...l, [scope]: [...won, ...told].sort((a, b) => b.at.localeCompare(a.at)) }));
        if (ns.some((n) => n.unread)) void markNotificationsRead().then(announceRead);
      })
      .catch(() => alive && setLists((l) => ({ ...l, [scope]: 'failed' })));
    return () => {
      alive = false;
    };
  }, [scope, list, me]);
  const empty = scope === 'friends' ? 'Nothing from your people this month. Follow a few players and their medals show up here.' : 'No medals won this month yet.';
  return (
    <section className={styles.section} aria-labelledby="feed-title">
      <h2 id="feed-title" className={styles.h2}>
        Lately
      </h2>
      {me && (
        <div className={styles.switch}>
          <Segmented label="Whose news" hideLabel options={[['friends', 'Your people'], ['world', 'Top players']] as const} value={scope} onChange={setScope} />
        </div>
      )}
      {list === undefined ? (
        <SkeletonList rows={4} avatar={40} sub />
      ) : list === 'failed' || list.length === 0 ? (
        <p className={styles.muted}>{list === 'failed' ? 'This list did not load. Try again in a moment.' : empty}</p>
      ) : (
        <ul className={styles.list}>
          {list.map((e) => {
            if ('note' in e) {
              const n = e.note;
              const d = describe(n);
              return (
                <li key={`n${n.id}`} className={styles.item} data-unread={n.unread || undefined}>
                  <Link to={d.to} className={styles.row}>
                    {n.handle ? <Avatar handle={n.handle} size={40} /> : <span className={styles.avatarGap} />}
                    <span className={styles.who}>
                      <span className={styles.told}>
                        {d.text}
                        {n.unread && <span className={styles.srOnly}> New.</span>}
                      </span>
                      <time className={styles.handle} dateTime={n.created_at}>
                        {ago(n.created_at)}
                      </time>
                    </span>
                  </Link>
                </li>
              );
            }
            const f = e.medal;
            const medal = medalOf(f.code)!;
            return (
              <li key={`m${f.handle}-${f.code}`} className={styles.item}>
                <Link to={f.mine ? '/me#badges' : `/u/${f.handle}`} className={styles.row}>
                  <Avatar handle={f.handle} size={40} />
                  <span className={styles.who}>
                    <span className={styles.name}>{f.mine ? 'You' : f.name || `@${f.handle}`}</span>
                    <span className={styles.handle}>
                      {medal.name} · <time dateTime={f.earned_at}>{ago(f.earned_at)}</time>
                    </span>
                  </span>
                  <MedalFace medal={medal} />
                </Link>
                <Cheer item={f} me={me} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * Your circles: the private tables you sit at. They are people, so they live on Squad, and each circle's board is on the circle.
 * `quiet`: not offered yet, so it shows only for a player who is already in one.
 */
function YourCircles({ quiet }: { quiet: boolean }) {
  const [list, setList] = useState<CircleRef[] | null | 'failed'>(null);
  useEffect(() => {
    let alive = true;
    myCircles()
      .then((l) => {
        if (!alive) return;
        const rows = (Array.isArray(l) ? l : []).filter((c) => c && typeof c.code === 'string' && c.code !== '');
        setList(rows.map((c) => ({ code: c.code, name: c.name || 'Your circle', members: count(c.members) })));
      })
      .catch(() => alive && setList('failed'));
    return () => {
      alive = false;
    };
  }, []);
  const has = Array.isArray(list) && list.length > 0;
  if (quiet && !has) return null;
  return (
    <section id="circles" className={styles.section} aria-labelledby="circles-title">
      <div className={styles.sectionHead}>
        <h2 id="circles-title" className={styles.h2}>
          Circles
        </h2>
        <Button variant="secondary" size="sm" to="/circles">
          Start a circle
        </Button>
      </div>
      {list == null ? (
        <SkeletonList rows={2} stat={false} />
      ) : list === 'failed' ? (
        <p className={styles.muted}>This list did not load. Try again in a moment.</p>
      ) : list.length === 0 ? (
        <p className={styles.muted}>A circle is a private daily table for your family, class, church or office. Start one and send the link.</p>
      ) : (
        <ul className={circles.list}>
          {list.map((c) => (
            <li key={c.code}>
              <Link to={`/c/${c.code}`} className={circles.circle}>
                <span className={circles.circleName}>{c.name}</span>
                <span className={circles.circleMeta}>{c.members === 1 ? '1 player' : `${c.members} players`}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** /players, Your People. Search first, then what your people won lately, friend streaks, your circles, people to follow, the top players. */
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
  const askedCircles = hash === '#circles';
  useEffect(() => {
    if (asked) keepUnlocked(['friendStreaks']);
    if (askedCircles) keepUnlocked(['circles']);
  }, [asked, askedCircles]);

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
      <PageHeader title="Your People" />

      <section className={styles.section} aria-label="Search players">
        <Field
          label="Find people"
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
        {searching && <List rows={hits} empty={`No handle starts with @${q.trim().toLowerCase()}.`} me={me} myHandle={myHandle} check pet />}
      </section>

      {!searching && <Feed me={me} />}

      {/* Friend streaks appear after the first daily. A player already in one, or asked into one, sees it at once. */}
      {!searching && me && <FriendStreaks quiet={!open.friendStreaks && !asked} />}

      {/* Circles are offered after the first daily too. A player already in one sees them whatever the count says. */}
      {!searching && me && <YourCircles quiet={!open.circles && !askedCircles} />}

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
          {!me && !auth.loading && Array.isArray(suggested) && <p className={styles.note}>{signIn} to follow players.</p>}
        </section>
      )}

      {!searching && <TopPlayers points={open.points} />}


    </div>
  );
}
