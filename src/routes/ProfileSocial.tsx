import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import {
  askFriendStreak,
  fetchFollowers,
  fetchFollowing,
  follow,
  isFollowing,
  removeFollower,
  unfollow,
  type PlayerRef,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { copyText } from '../lib/share';
import { Avatar } from '../components/Avatar';
import { useFriendStreaks } from './FriendStreaks';
import styles from './Profile.module.css';

export type Social = {
  followers: PlayerRef[];
  following: PlayerRef[];
  iFollow: boolean;
  ready: boolean;
};

/** Follow state and lists for one profile. */
// eslint-disable-next-line react-refresh/only-export-components
export function useSocial(handle: string) {
  const auth = useAuth();
  const me = auth.session?.user.id;
  const [s, setS] = useState<Social>({ followers: [], following: [], iFollow: false, ready: false });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchFollowers(handle).catch(() => []),
      fetchFollowing(handle).catch(() => []),
      me ? isFollowing(me, handle).catch(() => false) : Promise.resolve(false),
    ]).then(([followers, following, iFollow]) => alive && setS({ followers, following, iFollow, ready: true }));
    return () => {
      alive = false;
    };
  }, [handle, me, tick]);

  return { ...s, reload, me };
}

/** Follow or Following, plus Share. Guests are sent to sign in first. */
export function SocialActions({
  handle,
  name,
  own,
  social,
  onNote,
}: {
  handle: string;
  name: string;
  own: boolean;
  social: ReturnType<typeof useSocial>;
  onNote: (s: string) => void;
}) {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  // A streak the two of you share. Asked from here, kept on /players.
  const friends = useFriendStreaks(!!auth.profile && !own);
  const mine = friends.rows?.find((f) => f.handle === handle);
  const askStreak = async () => {
    setBusy(true);
    const r = await askFriendStreak(handle).catch(() => 'failed' as const);
    setBusy(false);
    onNote(
      r === 'asked'
        ? `Asked. The streak starts when ${name} says yes.`
        : r === 'started'
          ? 'Streak started. It grows each day you both play the daily.'
          : r === 'limit'
            ? 'You can keep 5 friend streaks at once. End one to start another.'
            : r === 'exists'
              ? ''
              : 'That did not work. Try again.',
    );
    friends.reload();
  };

  const share = async () => {
    const url = window.location.href;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await nav.share({ title: `${name} on Gazecraft`, text: `Find hidden words with @${handle} on Gazecraft.`, url });
        return;
      } catch {
        /* cancelled: fall back to copy */
      }
    }
    onNote((await copyText(url)) ? 'Link copied.' : url);
  };

  const toggle = async () => {
    if (!social.me) return;
    setBusy(true);
    const ok = social.iFollow ? await unfollow(social.me, handle) : await follow(social.me, handle);
    setBusy(false);
    if (!ok) return onNote('That did not work. Try again.');
    social.reload();
  };

  return (
    <div className={styles.ownActions}>
      {/* Your own page: Settings is the one action in the page header. */}
      {own ? null : !auth.profile ? (
        <Button variant="primary" size="sm" to={`/signin?next=${encodeURIComponent(`/u/${handle}`)}`}>
          Follow
        </Button>
      ) : (
        <Button
          variant={social.iFollow ? 'secondary' : 'primary'}
          size="sm"
          onClick={toggle}
          disabled={busy || !social.ready}
          aria-pressed={social.iFollow}
        >
          {social.iFollow ? 'Following' : 'Follow'}
        </Button>
      )}
      {!own &&
        auth.profile &&
        friends.rows &&
        (mine?.state === 'active' ? (
          <Button variant="secondary" size="sm" to="/players#friend-streaks">
            {mine.streak === 1 ? '1 day streak' : `${mine.streak} day streak`}
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={askStreak} disabled={busy || mine?.state === 'outgoing'}>
            {mine?.state === 'outgoing' ? 'Streak asked' : mine?.state === 'incoming' ? 'Accept streak' : 'Start a streak'}
          </Button>
        ))}
      <Button variant="secondary" size="sm" onClick={share}>
        Share
      </Button>
    </div>
  );
}

export function SocialCounts({ social }: { social: Social }) {
  return (
    <span className={styles.counts}>
      <a href="#followers">
        <strong>{social.followers.length}</strong> {social.followers.length === 1 ? 'follower' : 'followers'}
      </a>
      <a href="#following">
        <strong>{social.following.length}</strong> following
      </a>
    </span>
  );
}

/** Who follows this player and who they follow. On your own page you can remove a follower. */
export function SocialLists({ own, social }: { own: boolean; social: ReturnType<typeof useSocial> }) {
  const [removing, setRemoving] = useState('');
  const remove = async (h: string) => {
    if (!social.me) return;
    setRemoving(h);
    await removeFollower(social.me, h);
    setRemoving('');
    social.reload();
  };
  const list = (people: PlayerRef[], canRemove: boolean, empty: string) =>
    people.length === 0 ? (
      <p className={styles.muted}>{empty}</p>
    ) : (
      <ul className={styles.people}>
        {people.map((p) => (
          <li key={p.handle} className={styles.person}>
            <Link to={`/u/${p.handle}`} className={styles.personLink}>
              <Avatar handle={p.handle} size={32} />
              <span className={styles.personText}>
                <span className={styles.personName}>{p.name}</span>
                <span className={styles.personHandle}>@{p.handle}</span>
              </span>
            </Link>
            {canRemove && (
              <button
                type="button"
                className={styles.remove}
                onClick={() => remove(p.handle)}
                disabled={removing === p.handle}
                aria-label={`Remove @${p.handle} from your followers`}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
    );

  return (
    <div className={styles.socialGrid}>
      <section id="followers" className={styles.section} aria-labelledby="followers-title">
        <h2 id="followers-title" className={styles.h2}>
          Followers
        </h2>
        {list(social.followers, own, own ? 'Nobody yet. Share your profile to get followers.' : 'No followers yet.')}
      </section>
      <section id="following" className={styles.section} aria-labelledby="following-title">
        <h2 id="following-title" className={styles.h2}>
          Following
        </h2>
        {list(social.following, false, own ? 'You follow nobody yet. Find players on the leaderboard.' : 'Follows nobody yet.')}
      </section>
    </div>
  );
}
