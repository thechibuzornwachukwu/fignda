import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDelayedWaiting } from '../components/useDelayedWaiting';
import { Waiting } from '../components/Waiting';
import { fetchCustomGame } from '../lib/api';

/**
 * `/p/CODE`: holds the game screen back until the puzzle has arrived, and shows the waiting screen when that
 * takes longer than 1 second. The game screen asks for the same code and gets the same answer, so 1 request.
 */
export function OpenByCode({ children, blank }: { children: ReactNode; blank: ReactNode }) {
  const { code = '' } = useParams();
  const nav = useNavigate();
  const [loaded, setLoaded] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    // A failed or missing puzzle still ends the wait: the game screen shows its own not found state.
    const done = () => alive && setLoaded(code);
    void fetchCustomGame(code).then(done, done);
    return () => {
      alive = false;
    };
  }, [code]);

  const pending = loaded !== code;
  const waiting = useDelayedWaiting(pending);

  if (waiting) return <Waiting size="full" onCancel={() => nav('/play')} />;
  if (pending) return blank;
  return children;
}
