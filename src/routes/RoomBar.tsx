import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UsersRound } from 'lucide-react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { rankRoom, type Peer, type RoomStats, type RoomStatus, type Row } from '../lib/room';
import { copyText } from '../lib/share';
import styles from './RoomBar.module.css';

type Props = { code: string; peers: Peer[]; path: string; status: RoomStatus; me: RoomStats };

const line = (r: Row) =>
  [`${r.finds ?? 0} ${r.finds === 1 ? 'word' : 'words'}`, r.finds ? `${r.pace ?? 0}s a word` : '', `${r.hints ?? 0} ${r.hints === 1 ? 'hint' : 'hints'}`]
    .filter(Boolean)
    .join(' · ');

const STATUS: Record<RoomStatus, string> = { connecting: 'Connecting', live: 'Live', offline: 'Reconnecting' };

/** Who is in the room, the invite, and the way out. Room games are not ranked. */
export function RoomBar({ code, peers, path, status, me }: Props) {
  const rows = rankRoom([{ id: 'you', name: 'You', you: true, ...me }, ...peers]);
  const [note, setNote] = useState('');
  const url = `${window.location.origin}${path}?room=${code}`;
  const invite = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Fignda', text: 'Find them with me on Fignda.', url });
        return;
      }
    } catch {
      /* closed the share sheet, fall through to copy */
    }
    setNote((await copyText(url)) ? 'Link copied.' : url);
  };
  return (
    <section className={styles.room} aria-label="Playing together">
      <div className={styles.info}>
        <span className={styles.title}>
          <Icon icon={UsersRound} size={18} />
          Playing together
          <span className={styles.live} data-status={status}>
            {STATUS[status]}
          </span>
        </span>
        {peers.length ? (
          <ol className={styles.players} data-peers={peers.length} aria-label="Room scoreboard">
            {rows.map((p, i) => (
              <li key={p.id} className={styles.player} data-away={p.away || undefined} data-you={p.you || undefined}>
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.dot} aria-hidden="true" />
                {p.handle ? (
                  <Link to={`/u/${p.handle}`} className={styles.name}>
                    {p.name}
                  </Link>
                ) : (
                  <span>{p.name}</span>
                )}
                <span className={styles.state}>
                  {line(p)}
                  {p.away ? ' · away' : ''}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <span className={styles.who} data-peers={0}>
            Waiting for a friend. Send the invite.
          </span>
        )}
        <span className={styles.note}>Room {code}. Most words wins, then time per word, then fewest hints. Not on the leaderboard.</span>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={invite}>
          Invite
        </Button>
        <Link to={path} className={styles.leave}>
          Leave
        </Link>
      </div>
      <span className={styles.status} role="status">
        {note}
      </span>
    </section>
  );
}
