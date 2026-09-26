import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UsersRound } from 'lucide-react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import type { Peer } from '../lib/room';
import { copyText } from '../lib/share';
import styles from './RoomBar.module.css';

type Props = { code: string; peers: Peer[]; path: string };

/** Who is in the room, the invite, and the way out. Room games are not ranked. */
export function RoomBar({ code, peers, path }: Props) {
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
  const names = ['You', ...peers.map((p) => p.name)];
  return (
    <section className={styles.room} aria-label="Playing together">
      <div className={styles.info}>
        <span className={styles.title}>
          <Icon icon={UsersRound} size={18} />
          Playing together
        </span>
        <span className={styles.who} data-peers={peers.length}>
          {peers.length ? names.join(', ') : 'Waiting for a friend. Send the invite.'}
        </span>
        <span className={styles.note}>Room {code}. Not ranked. Finds show for everyone.</span>
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
