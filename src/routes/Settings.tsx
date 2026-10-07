import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { Field } from '../components/Field';
import { Segmented } from '../components/Segmented';
import { Toggle } from '../components/Toggle';
import { saveProfile } from '../lib/api';
import { useAuth } from '../lib/auth';
import { checkProfile } from '../lib/streak';
import { setSound, soundOn, subscribeSound } from '../lib/sound';
import { currentTheme, setTheme, type Theme } from '../lib/theme';
import { AvatarDesigner } from './AvatarDesigner';
import styles from './Settings.module.css';

/** /settings. Private account housekeeping. The public side of a player lives on /u/:handle. */
export function Settings() {
  const auth = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState(auth.profile?.name ?? '');
  const [handle, setHandle] = useState(auth.profile?.handle ?? '');
  const [synced, setSynced] = useState(auth.profile?.id ?? '');
  const [saveNote, setSaveNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [theme, setThemeState] = useState<Theme>(currentTheme);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // Set while signing out or deleting, so the signed-out redirect below does not race our own.
  const [leaving, setLeaving] = useState(false);

  // Fill the form once the profile arrives.
  if (auth.profile && synced !== auth.profile.id) {
    setSynced(auth.profile.id);
    setName(auth.profile.name);
    setHandle(auth.profile.handle);
  }

  if (leaving) return <div className={styles.page} aria-busy="true" />;
  if (!auth.enabled) return <Navigate to="/signin" replace />;
  if (auth.loading) return <div className={styles.page} aria-busy="true" />;
  if (!auth.session || !auth.profile) return <Navigate to="/signin?next=%2Fsettings" replace />;
  const p = auth.profile;
  const changed = name.trim() !== p.name || handle.trim().toLowerCase() !== p.handle;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const c = checkProfile(name, handle);
    if ('error' in c) return setSaveNote(c.error);
    setSaving(true);
    const r = await saveProfile({ id: p.id, ...c }, true);
    setSaving(false);
    if (r === 'taken') return setSaveNote('That handle is taken. Try another.');
    if (r) return setSaveNote('We could not save that. Try again.');
    await auth.refreshProfile();
    setSaveNote('Saved.');
  };

  const onDelete = async () => {
    setBusy(true);
    setErr('');
    try {
      setLeaving(true);
      await auth.deleteAccount();
      nav('/', { replace: true });
    } catch {
      setLeaving(false);
      setBusy(false);
      setErr('We could not delete your account. Try again.');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Settings.</h1>
        <Link to={`/u/${p.handle}`} className={styles.back}>
          View your profile
        </Link>
      </div>

      <section className={styles.section} aria-labelledby="s-profile">
        <h2 id="s-profile" className={styles.h2}>
          Profile
        </h2>
        <p className={styles.help}>Your name and handle show on your profile, on shared cards and next to verified scores.</p>
        <form className={styles.form} onSubmit={save} noValidate>
          <Field
            label="Name"
            autoComplete="name"
            maxLength={40}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaveNote('');
            }}
          />
          <Field
            label="Handle"
            prefix="@"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={20}
            value={handle}
            onChange={(e) => {
              setHandle(e.target.value.replace(/^@/, ''));
              setSaveNote('');
            }}
          />
          <div className={styles.row}>
            <Button type="submit" variant="primary" disabled={!changed || saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <span className={styles.note} role="status">
              {saveNote}
            </span>
          </div>
        </form>
      </section>

      <section className={styles.section} aria-labelledby="s-avatar">
        <h2 id="s-avatar" className={styles.h2}>
          Your character
        </h2>
        <AvatarDesigner id={auth.profile.id} handle={auth.profile.handle} code={auth.profile.avatar} onSaved={() => void auth.refreshProfile()} />
      </section>

      <section className={styles.section} aria-labelledby="s-account">
        <h2 id="s-account" className={styles.h2}>
          Account
        </h2>
        <dl className={styles.facts}>
          <div>
            <dt>Email</dt>
            <dd>{auth.email}</dd>
          </div>
          <div>
            <dt>Sign in</dt>
            <dd>Email code{auth.session.user.app_metadata?.provider === 'google' ? ' and Google' : ''}</dd>
          </div>
        </dl>
        <p className={styles.help}>Only you see your email. It is never shown to other players.</p>
      </section>

      <section className={styles.section} aria-labelledby="s-look">
        <h2 id="s-look" className={styles.h2}>
          Appearance
        </h2>
        <div className={styles.narrow}>
          <Segmented
            label="Theme"
            options={[
              ['dark', 'Dark'],
              ['light', 'Light'],
            ]}
            value={theme}
            onChange={(t) => {
              setTheme(t);
              setThemeState(t);
            }}
          />
          <SoundSetting />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="s-session">
        <h2 id="s-session" className={styles.h2}>
          Session
        </h2>
        <div className={styles.row}>
          <Button
            variant="secondary"
            onClick={async () => {
              setLeaving(true);
              await auth.signOut();
              nav('/', { replace: true });
            }}
          >
            Sign out
          </Button>
          <span className={styles.help}>Also clears Fignda data from this browser.</span>
        </div>
      </section>

      <section className={styles.danger} aria-labelledby="s-danger">
        <h2 id="s-danger" className={styles.h2}>
          Delete account
        </h2>
        <p className={styles.help}>
          Removes your profile, plays, shared cards and custom puzzles at once. It cannot be undone.{' '}
          <Link to="/privacy" className={styles.inline}>
            What we keep
          </Link>
          .
        </p>
        <div>
          <Button variant="secondary" onClick={() => setConfirm(true)}>
            Delete account
          </Button>
        </div>
      </section>

      <Dialog open={confirm} onClose={() => !busy && setConfirm(false)} label="Delete account">
        <div className={styles.confirm}>
          <h2 className={styles.confirmTitle}>Delete your account?</h2>
          <p className={styles.help}>This removes your profile, scores and shared cards. It cannot be undone.</p>
          <p className={styles.note} role="alert">
            {err}
          </p>
          <div className={styles.row}>
            <Button variant="secondary" onClick={() => setConfirm(false)} disabled={busy}>
              Keep my account
            </Button>
            <Button variant="primary" onClick={onDelete} disabled={busy}>
              Delete account
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function SoundSetting() {
  const on = useSyncExternalStore(subscribeSound, soundOn, () => true);
  return <Toggle label="Sounds" note="A soft tick per letter as you select, a chime when you find a word." checked={on} onChange={setSound} />;
}
