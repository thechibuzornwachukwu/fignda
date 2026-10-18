import { Link } from 'react-router-dom';
import styles from './Privacy.module.css';

/** Plain account of what Gazecraft keeps. Matches design/SECURITY.md and the database schema. */
export function Privacy() {
  return (
    <article className={styles.page}>
      <h1 className={styles.title}>Privacy.</h1>
      <p className={styles.lead}>Gazecraft keeps as little as it can. This page says what, why and where.</p>

      <section className={styles.section}>
        <h2 className={styles.h2}>Playing as a guest</h2>
        <p>
          You can play every puzzle without an account. Your theme, your daily results, a character you build and
          your answer about who we are dressing stay in this browser. We do not send them anywhere unless you sign in.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>If you sign in</h2>
        <p>We keep:</p>
        <ul className={styles.list}>
          <li>Your email address, to send sign in codes. Only you see it.</li>
          <li>Accounts are for players aged 13 and over. We do not ask for a date of birth.</li>
          <li>The name and handle you choose. They show on cards you share and next to verified scores.</li>
          <li>Your plays: which puzzle, what you found, tip-offs, time and score. We use them for your streak.</li>
          <li>Custom puzzles you create and cards you share.</li>
          <li>The character you design. It is saved as a short code of your choices, never a photo, and shows next to your name.</li>
          <li>
            Who we are dressing, only if you answer: a woman, a man, or you would rather not say. It is saved with your character and
            decides which hair and outfits you are shown first. Every style stays open to you. Nobody else sees it, and we never use it
            for ranking, matching or ads. Change it in the character editor.
          </li>
          <li>Who you follow, and the circles you join. Members of a circle see each other’s names and verified daily scores.</li>
          <li>
            Rooms: while you play together, the others in the room see your name and what you find. When the game ends, signed in players’ own
            finds are saved so the team can go on the Together board.
          </li>
          <li>Friend streaks: who you keep one with. You each see whether the other has played today.</li>
          <li>Invites into a room, kept for a day, and puzzles you make and the thumbs you give.</li>
          <li>Your notifications (the newest 100) and the badges you earn. Badges show on your profile.</li>
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
        <h2 className={styles.h2}>Drafts made for you</h2>
        <p>
          When you ask Make for a draft on a topic, the topic you type is sent to an AI service that writes the
          paragraph. We use 3: OpenRouter, Google and Groq. Only the topic goes. Your name, email and account do not.
          A draft is kept for a day, so the same topic can be answered at once. What you publish is yours.
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
          Both process data only to run Gazecraft.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Who receives data</h2>
        <p>These companies and no others:</p>
        <ul className={styles.list}>
          <li>Supabase: your account, your plays and everything else listed above. It also sends the sign in code to your email.</li>
          <li>Cloudflare: every request to the site and its API. A puzzle you make is also read there by a safety model before it gets a link.</li>
          <li>Google: your sign in, only if you choose "Continue with Google". We get your email address and name back.</li>
          <li>OpenRouter, Google and Groq: the topic you type for a puzzle, and nothing about you.</li>
          <li>
            The company behind your browser (Google, Apple or Mozilla): a reminder, only if you turn reminders on. It carries the
            notification to your device.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Getting a copy</h2>
        <p>
          Download everything we keep about you from <Link to="/settings">Settings</Link>, as 1 file. Other players in it
          are named by their handle only.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Deleting everything</h2>
        <p>
          Delete your account from <Link to="/settings">Settings</Link>. It removes your profile, plays,
          shared cards and custom puzzles at once. It cannot be undone. Signing out also clears Gazecraft data from this
          browser.
        </p>
      </section>

      <p className={styles.updated}>Updated 14 Oct 2026.</p>
    </article>
  );
}
