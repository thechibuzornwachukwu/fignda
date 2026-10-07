import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { buttonClass } from '../components/buttonClass';
import { fetchFollowing, inviteToRoom, myGameInvites, type GameInvite, type PlayerRef } from '../lib/api';
import { useAuth } from '../lib/auth';
import styles from './GameInvites.module.css';

/** Where a game lives: curated puzzles by id, custom ones by their share code. */
const gamePath = (id: string) => (id.startsWith('c-') ? `/p/${id.slice(2).toUpperCase()}` : `/play/${id}`);

/** /play, signed in: rooms a player you know has asked you into in the last hour. Nothing shows when there are none. */
export function GameInvites() {
  const auth = useAuth();
  const me = auth.profile?.id;
  const [rows, setRows] = useState<GameInvite[]>([]);
  useEffect(() => {
    if (!me) return;
    let alive = true;
    myGameInvites()
      .then((r) => alive && setRows(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [me]);
  if (!me || rows.length === 0) return null;
  return (
    <section className={styles.invites} aria-label="Invites">
      {rows.map((i) => (
        <div key={`${i.handle}-${i.room_code}`} className={styles.invite}>
          <Avatar handle={i.handle} size={40} />
          <span className={styles.text}>
            <span className={styles.title}>{i.name} wants to play together</span>
            <span className={styles.sub}>{i.title}. They are in the room now.</span>
          </span>
          <Link to={`${gamePath(i.game_id)}?room=${i.room_code}`} className={buttonClass('primary', 'sm')}>
            Join
          </Link>
        </div>
      ))}
    </section>
  );
}

/** In a room: ask the people you follow to join, one tap each. They see it on their games screen. */
export function InviteFollowing({ gameId, room }: { gameId: string; room: string }) {
  const auth = useAuth();
  const handle = auth.profile?.handle;
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<PlayerRef[] | null>(null);
  const [sent, setSent] = useState<Record<string, 'sending' | 'sent' | 'failed'>>({});

  useEffect(() => {
    if (!open || !handle) return;
    let alive = true;
    fetchFollowing(handle)
      .then((p) => alive && setPeople(p))
      .catch(() => alive && setPeople([]));
    return () => {
      alive = false;
    };
  }, [open, handle]);

  if (!handle) return null;
  const ask = async (p: PlayerRef) => {
    setSent((s) => ({ ...s, [p.handle]: 'sending' }));
    const r = await inviteToRoom(p.handle, gameId, room);
    setSent((s) => ({ ...s, [p.handle]: r.ok ? 'sent' : 'failed' }));
  };

  return (
    <div className={styles.following}>
      <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Invite someone you follow
      </button>
      {open &&
        (people == null ? (
          <div aria-busy="true" />
        ) : people.length === 0 ? (
          <p className={styles.sub}>
            You follow nobody yet.{' '}
            <Link to="/players" className={styles.inline}>
              Find players
            </Link>
            , or send the invite link.
          </p>
        ) : (
          <ul className={styles.people} aria-label="People you follow">
            {people.slice(0, 12).map((p) => (
              <li key={p.handle} className={styles.person}>
                <Avatar handle={p.handle} size={24} />
                <span className={styles.personName}>{p.name}</span>
                <button
                  type="button"
                  className={styles.ask}
                  disabled={sent[p.handle] === 'sending' || sent[p.handle] === 'sent'}
                  aria-label={`Invite ${p.name}`}
                  onClick={() => void ask(p)}
                >
                  {sent[p.handle] === 'sent' ? 'Invited' : sent[p.handle] === 'failed' ? 'Try again' : 'Invite'}
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
