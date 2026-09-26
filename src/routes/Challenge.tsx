import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swords } from 'lucide-react';
import { Icon } from '../components/Icon';
import { formatTime } from '../engine/time';
import { fetchChallenger, type Challenger } from '../lib/api';
import styles from './Challenge.module.css';

type Props = {
  /** Handle from `?vs=`. */
  vs: string;
  game: { id: string } | { day: number };
  /** Your score once you finish. */
  mine: number | null;
};

const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * Head-to-head from a shared link. Their best verified score (server replayed, not typed in a URL), then
 * the verdict when you finish. Dailies show the score only, never how many they found, until you are done.
 */
export function Challenge({ vs, game, mine }: Props) {
  const [them, setThem] = useState<Challenger | null>(null);
  const key = 'day' in game ? `d${game.day}` : game.id;
  useEffect(() => {
    let alive = true;
    fetchChallenger(vs, 'day' in game ? { day: game.day } : { id: game.id })
      .then((c) => alive && setThem(c))
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vs, key]);

  if (!them) return null;
  const who = (
    <Link to={`/u/${them.handle}`} className={styles.who}>
      @{them.handle}
    </Link>
  );
  let line;
  if (mine == null) {
    line = (
      <>
        {who} scored {fmt(them.score)}
        {'day' in game ? '' : ` with ${them.found} found in ${formatTime(them.secs)}`}. Beat it.
      </>
    );
  } else if (mine > them.score) {
    line = (
      <>
        You beat {who} by {fmt(mine - them.score)}. Send it back.
      </>
    );
  } else if (mine < them.score) {
    line = (
      <>
        {who} wins by {fmt(them.score - mine)}. {'day' in game ? 'Tomorrow is another day.' : 'Play again and take it.'}
      </>
    );
  } else {
    line = <>Dead level with {who}.</>;
  }
  return (
    <p className={styles.challenge} role="status" data-challenge={mine == null ? 'open' : mine > them.score ? 'won' : mine < them.score ? 'lost' : 'tie'}>
      <Icon icon={Swords} size={18} />
      <span>{line}</span>
    </p>
  );
}
