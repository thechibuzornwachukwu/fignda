import { Link } from 'react-router-dom';
import styles from './Privacy.module.css';

/** Plain account of what Lantern Row keeps. Matches design/SECURITY.md and the database schema. */
export function Privacy() {
  return (
    <article className={styles.page}>
      <h1 className={styles.title}>Privacy.</h1>
      <p className={styles.lead}>Lantern Row keeps as little as it can. This page says what, why and where.</p>

      <section className={styles.section}>
        <h2 className={styles.h2}>Playing as a guest</h2>
        <p>
          You can play without an account. Your theme, your pet, your stars and a step you left half done stay in this browser. We do not
          send them anywhere.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>If you sign in</h2>
        <p>We keep:</p>
        <ul className={styles.list}>
          <li>Your email address, to send sign in codes. Only you see it.</li>
          <li>Accounts are for players aged 13 and over. We do not ask for a date of birth.</li>
          <li>The name and handle you choose. They show on the board of a case.</li>
          <li>Your steps: which case, which step, your best stars and score. We use them for the board.</li>
        </ul>
        <p>Steps you played as a guest stay in this browser. They were never checked, so they do not go on the board.</p>
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
        <h2 className={styles.h2}>Who receives data</h2>
        <p>These companies and no others:</p>
        <ul className={styles.list}>
          <li>Supabase: your account and your steps. It also sends the sign in code to your email.</li>
          <li>Cloudflare: every request to the site and its API.</li>
          <li>Google: your sign in, only if you choose "Continue with Google". We get your email address and name back.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Deleting everything</h2>
        <p>
          Delete your account from <Link to="/settings">Settings</Link>. It removes your profile and your steps at once. It cannot be
          undone. Signing out also clears Lantern Row data from this browser.
        </p>
      </section>

      <p className={styles.updated}>Updated 14 Oct 2026.</p>
    </article>
  );
}
