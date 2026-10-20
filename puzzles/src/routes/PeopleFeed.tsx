import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, Gamepad2, Heart, UserCheck, UserPlus } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { MedalFace } from '../components/Medals';
import { Segmented } from '../components/Segmented';
import { Skeleton, SkeletonGroup } from '../components/Skeleton';
import { cheer, fetchNotifications, follow, inviteToRoom, markNotificationsRead, squadFeed, unfollow, type FeedItem, type PlayerRef } from '../lib/api';
import { games } from '../games/catalog';
import { nextClueTo } from '../games/path';
import { newRoomCode } from '../lib/room';
import { useOnline } from '../lib/useOnline';
import { medalsOf } from '../lib/medals';
import { ago, describe, type Note } from '../lib/notifications';
import { announceRead } from '../lib/useUnread';
import styles from './PeopleFeed.module.css';

type Scope = 'friends' | 'world';

/** The medal a badge code is a tier of, or null for a code this build does not know. */
const medalOf = (code: string) => medalsOf([code]).find((m) => m.tier >= 0 && m.key !== 'first') ?? null;

/** One card of the feed: a medal someone won, or something that happened to you. Newest first. */
type Entry = { at: string; medal: FeedItem } | { at: string; note: Note };

const isPlayer = (r: unknown): r is PlayerRef => !!r && typeof (r as PlayerRef).handle === 'string' && (r as PlayerRef).handle !== '';

/** Follow, or follow back: an icon that fills once it is done. */
export function FollowIcon({ me, handle, name, initial = false }: { me: string; handle: string; name: string; initial?: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
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

/** A medal's cheers. Yours: the count. Anyone else's: a heart to press. */
function Cheer({ item, me }: { item: FeedItem; me?: string }) {
  const [on, setOn] = useState(item.cheered);
  const [n, setN] = useState(item.cheers);
  const [busy, setBusy] = useState(false);
  const label = `${n} ${n === 1 ? 'cheer' : 'cheers'}`;
  if (item.mine || !me) {
    return (
      <span className={styles.cheers} aria-label={label} data-none={n === 0 || undefined}>
        <Icon icon={Heart} size={18} />
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
      <Icon icon={Heart} size={20} />
      <span>{n}</span>
    </button>
  );
}

/** Who and when, at the top of every card. */
function Byline({ handle, name, at, to }: { handle: string | null; name: string; at: string; to: string }) {
  return (
    <Link to={to} className={styles.byline}>
      {handle ? <Avatar handle={handle} size={40} /> : <span className={styles.avatarGap} />}
      <span className={styles.who}>
        <span className={styles.name}>{name}</span>
        <time className={styles.when} dateTime={at}>
          {ago(at)}
        </time>
      </span>
    </Link>
  );
}

/** A medal won: the medal large, its name, and the cheers. */
function MedalCard({ f, me }: { f: FeedItem; me?: string }) {
  const medal = medalOf(f.code)!;
  return (
    <article className={styles.card} data-metal={medal.metal}>
      <Byline handle={f.handle} name={f.mine ? 'You' : f.name || `@${f.handle}`} at={f.earned_at} to={f.mine ? '/me#badges' : `/u/${f.handle}`} />
      <div className={styles.won}>
        <MedalFace medal={medal} size="lg" />
        <p className={styles.medalName}>{medal.name}</p>
      </div>
      <div className={styles.foot}>
        <Cheer item={f} me={me} />
      </div>
    </article>
  );
}

/** Something that happened to you: one line, and the thing to do about it, as an icon. */
function NoteCard({ n, me }: { n: Note; me?: string }) {
  const d = describe(n);
  let act: ReactNode = null;
  if (n.kind === 'follow' && me && n.handle) act = <FollowIcon me={me} handle={n.handle} name={n.name ?? n.handle} />;
  else if (n.kind === 'streak_ask')
    act = (
      <Link to="/players#friend-streaks" className={styles.follow} aria-label={`Answer ${n.name ?? 'the'} streak ask`}>
        <Icon icon={Flame} size={18} />
      </Link>
    );
  return (
    <article className={styles.note} data-unread={n.unread || undefined}>
      <Link to={d.to} className={styles.noteMain}>
        {n.handle ? <Avatar handle={n.handle} size={40} /> : <span className={styles.avatarGap} />}
        <span className={styles.who}>
          <span className={styles.told}>
            {d.text}
            {n.unread && <span className={styles.srOnly}> New.</span>}
          </span>
          <time className={styles.when} dateTime={n.created_at}>
            {ago(n.created_at)}
          </time>
        </span>
      </Link>
      {act}
    </article>
  );
}

/** The puzzle a room is opened on: the one the player is on, or the first. A room takes a whole puzzle. */
const roomGame = (): string => nextClueTo()?.split('/')[2] ?? games[0]!.id;

/**
 * Play together, in one tap: follow them if you do not yet (an invite goes only to someone you follow), open a room
 * on your next puzzle, ask them in, and go there to wait. They see it on their games screen.
 */
function InviteIcon({ me, p }: { me: string; p: PlayerRef }) {
  const navigate = useNavigate();
  const [state, setState] = useState<'idle' | 'sending' | 'failed'>('idle');
  const who = p.name || p.handle;
  const go = async () => {
    setState('sending');
    const game = roomGame();
    const room = newRoomCode();
    await follow(me, p.handle).catch(() => false);
    const r = await inviteToRoom(p.handle, game, room).catch(() => ({ ok: false }));
    if (!r.ok) return setState('failed');
    navigate(`/play/${game}?room=${room}`);
  };
  return (
    <button
      type="button"
      className={styles.invite}
      aria-label={state === 'failed' ? `Invite ${who} again` : `Play a puzzle with ${who}`}
      data-failed={state === 'failed' || undefined}
      disabled={state === 'sending'}
      onClick={() => void go()}
    >
      <Icon icon={Gamepad2} size={18} />
    </button>
  );
}

/**
 * People to follow, as a strip of small cards inside the feed, the way a feed suggests friends. Anyone on the game
 * can be here: whoever is online now comes first, with a green dot, and the count of players online heads it.
 */
function FollowStrip({ people, me, myHandle }: { people: PlayerRef[]; me?: string; myHandle?: string }) {
  const online = useOnline();
  const known = new Set(people.map((p) => p.handle));
  const list = [...[...online.values()].filter((p) => !known.has(p.handle) && p.handle !== myHandle), ...people]
    .map((p, i) => ({ ...p, on: online.has(p.handle), i }))
    .sort((a, b) => Number(b.on) - Number(a.on) || a.i - b.i)
    .slice(0, 20);
  if (list.length === 0) return null;
  return (
    <section className={styles.strip} aria-labelledby="strip-title">
      <div className={styles.stripHead}>
        <h2 id="strip-title" className={styles.stripTitle}>
          People to follow
        </h2>
        {online.size > 0 && (
          <span className={styles.online}>
            <span className={styles.liveDot} aria-hidden="true" />
            {online.size} online
          </span>
        )}
      </div>
      <ul className={styles.stripList}>
        {list.map((p) => (
          <li key={p.handle} className={styles.person}>
            <Link to={`/u/${p.handle}`} className={styles.personLink}>
              <span className={styles.face}>
                <Avatar handle={p.handle} size={56} />
                {p.on && <span className={styles.onDot} role="img" aria-label="Online now" />}
              </span>
              <span className={styles.personName}>{p.name || `@${p.handle}`}</span>
            </Link>
            {me ? (
              <span className={styles.actions}>
                <FollowIcon me={me} handle={p.handle} name={p.name || p.handle} />
                <InviteIcon me={me} p={p} />
              </span>
            ) : (
              <Link to={`/signin?next=${encodeURIComponent(`/u/${p.handle}`)}`} className={styles.follow} aria-label={`Sign in to follow ${p.name || p.handle}`}>
                <Icon icon={UserPlus} size={18} />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function FeedSkeleton() {
  return (
    <SkeletonGroup className={styles.cards}>
      {[0, 1].map((i) => (
        <div key={i} className={styles.card}>
          <div className={styles.byline}>
            <Skeleton width={40} height={40} round />
            <Skeleton width="40%" />
          </div>
          <div className={styles.won}>
            <Skeleton width={72} height={88} />
            <Skeleton width="30%" height={20} />
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}

/** Where the strip sits: after the third card, or alone when there are no cards. */
const STRIP_AT = 3;

/**
 * The feed (SPEC section 6, Your People): medals lately won by you, the people you follow, or the top players,
 * each as a card that can be cheered, with what happened to you in among them. Opening it reads your notifications.
 */
export function PeopleFeed({ me, myHandle, suggested }: { me?: string; myHandle?: string; suggested: PlayerRef[] }) {
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
        const won: Entry[] = (Array.isArray(medals) ? medals : [])
          .filter((f) => isPlayer(f) && typeof f.code === 'string' && medalOf(f.code))
          .map((f) => ({ at: f.earned_at, medal: f }));
        // Your own medals are already cards; the note that you won one would say it twice.
        const told: Entry[] = (Array.isArray(ns) ? ns : []).filter((n) => n && n.kind !== 'badge').map((n) => ({ at: n.created_at, note: n }));
        setLists((l) => ({ ...l, [scope]: [...won, ...told].sort((a, b) => b.at.localeCompare(a.at)) }));
        if (ns.some((n) => n.unread)) void markNotificationsRead().then(announceRead);
      })
      .catch(() => alive && setLists((l) => ({ ...l, [scope]: 'failed' })));
    return () => {
      alive = false;
    };
  }, [scope, list, me]);
  const strip = <FollowStrip people={suggested} me={me} myHandle={myHandle} />;
  return (
    <section className={styles.feed} aria-label="Feed">
      {me && (
        <div className={styles.switch}>
          <Segmented label="Whose news" hideLabel options={[['friends', 'Your people'], ['world', 'Top players']] as const} value={scope} onChange={setScope} />
        </div>
      )}
      {/* People to follow never wait on the feed: whoever is on the game can be found while it loads. */}
      {list === undefined ? (
        <>
          <FeedSkeleton />
          {strip}
        </>
      ) : list === 'failed' ? (
        <>
          <p className={styles.muted}>The feed did not load. Try again in a moment.</p>
          {strip}
        </>
      ) : list.length === 0 ? (
        <>
          <p className={styles.muted}>{scope === 'friends' ? 'Quiet this month. Follow a few players and their medals land here.' : 'No medals won this month yet.'}</p>
          {strip}
        </>
      ) : (
        <div className={styles.cards}>
          {list.map((e, i) => (
            <Fragment key={'note' in e ? `n${e.note.id}` : `m${e.medal.handle}-${e.medal.code}`}>
              {'note' in e ? <NoteCard n={e.note} me={me} /> : <MedalCard f={e.medal} me={me} />}
              {i === Math.min(STRIP_AT, list.length) - 1 && strip}
            </Fragment>
          ))}
        </div>
      )}
    </section>
  );
}
