import { Check } from 'lucide-react';
import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { Partner } from '../components/Partner';
import { Segmented } from '../components/Segmented';
import { TextLink } from '../components/TextLink';
import { Toggle } from '../components/Toggle';
import { PARTNERS } from '../engine/partners';
import { saveProfile } from '../lib/api';
import { useAuth } from '../lib/auth';
import { checkProfile } from '../lib/handle';
import { choosePartner, usePartner } from '../lib/partner';
import { setSound, soundOn, subscribeSound } from '../lib/sound';
import { currentTheme, setTheme, type Theme } from '../lib/theme';
import styles from './Settings.module.css';

/**
 * /settings. The pet beside the player, the theme, and, signed in, the account. The player has no avatar: the
 * pet is the only face that is theirs.
 */
export function Settings() {
  const auth = useAuth();
  const pet = usePartner();
  const [theme, setThemeState] = useState<Theme>(currentTheme);

  return (
    <div className={styles.page}>
      <PageHeader title="Settings" />

      <section className={styles.section} aria-labelledby="s-pet">
        <h2 id="s-pet" className={styles.h2}>
          Your pet
        </h2>
        <ul className={styles.pets}>
          {PARTNERS.map((p) => (
            <li key={p.id}>
              <button type="button" className={styles.pet} aria-pressed={pet === p.id} onClick={() => choosePartner(p.id)} data-pet={p.id}>
                <Partner who={p.id} moment={pet === p.id ? 'done' : 'empty'} size={72} />
                <span className={styles.petName}>{p.name}</span>
                {pet === p.id && (
                  <span className={styles.tick}>
                    <Icon icon={Check} size={16} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
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

      {auth.enabled && !auth.loading && (auth.session && auth.profile ? <Account /> : <SignInRow />)}

      <p className={styles.privacy}>
        <TextLink to="/privacy">Privacy</TextLink>
      </p>
    </div>
  );
}

function SignInRow() {
  return (
    <section className={styles.section} aria-labelledby="s-account">
      <h2 id="s-account" className={styles.h2}>
        Account
      </h2>
      <div>
        <Button variant="secondary" to="/signin?next=%2Fsettings">
          Sign in
        </Button>
      </div>
    </section>
  );
}

/** Signed in: the name and handle on the case board, the email, sign out and delete. */
function Account() {
  const auth = useAuth();
  const nav = useNavigate();
  const p = auth.profile!;
  const [name, setName] = useState(p.name);
  const [handle, setHandle] = useState(p.handle);
  const [saveNote, setSaveNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
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
      await auth.deleteAccount();
      nav('/', { replace: true });
    } catch {
      setBusy(false);
      setErr('We could not delete your account. Try again.');
    }
  };

  return (
    <>
      <section className={styles.section} aria-labelledby="s-account">
        <h2 id="s-account" className={styles.h2}>
          Account
        </h2>
        <form className={styles.form} onSubmit={save} noValidate>
          <Field label="Name" autoComplete="name" maxLength={40} value={name} onChange={(e) => (setName(e.target.value), setSaveNote(''))} />
          <Field label="Handle" prefix="@" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={20} value={handle} onChange={(e) => (setHandle(e.target.value.replace(/^@/, '')), setSaveNote(''))} />
          <div className={styles.row}>
            <Button type="submit" variant="primary" disabled={!changed || saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <span className={styles.note} role="status">
              {saveNote}
            </span>
          </div>
        </form>
        <dl className={styles.facts}>
          <div>
            <dt>Email</dt>
            <dd>{auth.email}</dd>
          </div>
        </dl>
        <div className={styles.row}>
          <Button
            variant="secondary"
            onClick={async () => {
              await auth.signOut();
              nav('/', { replace: true });
            }}
          >
            Sign out
          </Button>
        </div>
      </section>

      <section className={styles.danger} aria-labelledby="s-danger">
        <h2 id="s-danger" className={styles.h2}>
          Delete account
        </h2>
        <p className={styles.help}>
          Removes your profile and every step you have played. It cannot be undone.{' '}
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
    </>
  );
}

function SoundSetting() {
  const on = useSyncExternalStore(subscribeSound, soundOn, () => true);
  return <Toggle label="Sounds" checked={on} onChange={setSound} />;
}

