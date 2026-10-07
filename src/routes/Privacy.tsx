import { Link } from 'react-router-dom';
import styles from './Privacy.module.css';

/** Plain account of what Fignda keeps. Matches design/SECURITY.md and the database schema. */
export function Privacy() {
  return (
    <article className={styles.page}>
      <h1 className={styles.title}>Privacy.</h1>
      <p className={styles.lead}>Fignda keeps as little as it can. This page says what, why and where.</p>

      <section className={styles.section}>
        <h2 className={styles.h2}>Playing as a guest</h2>
        <p>
          You can play every puzzle without an account. Your theme and your daily results stay in this browser. We do
          not send them anywhere unless you sign in.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>If you sign in</h2>
        <p>We keep:</p>
        <ul className={styles.list}>
          <li>Your email address, to send sign in codes. Only you see it.</li>
          <li>The name and handle you choose. They show on cards you share and next to verified scores.</li>
          <li>Your plays: which puzzle, what you found, hints, time and score. We use them for your streak.</li>
          <li>Custom puzzles you create and cards you share.</li>
          <li>The character you design. It is saved as a short code of your choices, never a photo, and shows next to your name.</li>
          <li>Who you follow, and the circles you join. Members of a circle see each other’s names and verified daily scores.</li>
          <li>
            Rooms: while you play together, the others in the room see your name and what you find. When the game ends, signed in players’ own
            finds are saved so the team can go on the Together board.
          </li>
          <li>Friend streaks: who you keep one with. You each see whether the other has played today.</li>
          <li>Invites into a room, kept for a day, and puzzles you make and the thumbs you give.</li>
          <li>
            Reminders, only if you turn them on: an address your browser gives us for notifications, your time zone and the hour you chose.
            Turning reminders off or signing out removes it.
          </li>
        </ul>
        <p>
          When you sign in, dailies you played as a guest in this browser move to your account. They are marked
          unverified.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>What we do not do</h2>
        <ul className={styles.list}>
          <li>No ads and no selling data.</li>
          <li>No tracking cookies. Sign in keeps a session in your browser so you stay signed in.</li>
          <li>We never show your email to other players.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Where it lives</h2>
        <p>
          Accounts and scores are stored with Supabase in Frankfurt, Germany. The site and its API run on Cloudflare.
          Both process data only to run Fignda.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Deleting everything</h2>
        <p>
          Delete your account from <Link to="/settings">Settings</Link>. It removes your profile, plays,
          shared cards and custom puzzles at once. It cannot be undone. Signing out also clears Fignda data from this
          browser.
        </p>
      </section>

      <p className={styles.updated}>Updated 7 Oct 2026.</p>
    </article>
  );
}
