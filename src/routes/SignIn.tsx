import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { TextLink } from '../components/TextLink';
import { saveProfile } from '../lib/api';
import { useAuth } from '../lib/auth';
import { checkProfile, handleFromName, safeNext } from '../lib/streak';
import { getSupabase } from '../lib/supabase';
import styles from './SignIn.module.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_AFTER = 30;
/** Google sign in shows only when the provider is configured. */
const GOOGLE = import.meta.env.VITE_GOOGLE_AUTH === '1';

type Step = 'start' | 'code' | 'profile';

function authError(e: { status?: number; message?: string } | null): string {
  if (!e) return '';
  if (e.status === 429) return 'Too many tries. Wait a few minutes and try again.';
  return '';
}

export function SignIn() {
  const auth = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const editing = params.get('edit') === '1';

  const [step, setStep] = useState<Step>('start');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [handleEdited, setHandleEdited] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  const signedIn = !!auth.session;
  const needsProfile = signedIn && (!auth.profile || editing);

  // Prefill when editing an existing profile.
  const [prefilled, setPrefilled] = useState(false);
  if (editing && auth.profile && !prefilled) {
    setPrefilled(true);
    setName(auth.profile.name);
    setHandle(auth.profile.handle);
    setHandleEdited(true);
  }

  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(id);
  }, [wait]);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  if (!auth.enabled) {
    return (
      <div className={styles.screen}>
        <h1 className={styles.title}>Sign in is not set up yet.</h1>
        <p className={styles.lead}>You can play every game as a guest.</p>
        <TextLink to={next}>Keep playing as a guest</TextLink>
      </div>
    );
  }
  if (auth.loading) return <div className={styles.screen} aria-busy="true" />;
  if (signedIn && auth.profile && !editing) return <Navigate to={next} replace />;

  const current: Step = needsProfile ? 'profile' : step;

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    const addr = email.trim();
    if (!EMAIL_RE.test(addr)) return setErr('That email looks off. Check it and try again.');
    setBusy(true);
    setErr('');
    // The email carries a code; until custom SMTP is set up it may carry a link instead, which lands back here.
    const { error } = await (await getSupabase())!.auth.signInWithOtp({
      email: addr,
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/signin?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    if (error) return setErr(authError(error) || 'We could not send a code. Try again in a moment.');
    setCode('');
    setWait(RESEND_AFTER);
    setStep('code');
  };

  const verify = async (value: string) => {
    setBusy(true);
    setErr('');
    const { error } = await (await getSupabase())!.auth.verifyOtp({ email: email.trim(), token: value, type: 'email' });
    setBusy(false);
    if (error) {
      setCode('');
      codeRef.current?.focus();
      return setErr(authError(error) || 'That code did not work. Check it or send a new one.');
    }
    // The auth listener loads the profile; with none, this screen moves to the profile step.
  };

  const onCode = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setErr('');
    if (digits.length === 6 && !busy) void verify(digits);
  };

  const google = async () => {
    setErr('');
    const { error } = await (await getSupabase())!.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/signin?next=${encodeURIComponent(next)}` },
    });
    if (error) setErr(authError(error) || 'Google sign in is not available right now.');
  };

  const onName = (v: string) => {
    setName(v);
    if (!handleEdited) setHandle(handleFromName(v));
    setErr('');
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const c = checkProfile(name, handle);
    if ('error' in c) return setErr(c.error);
    const { name: n, handle: h } = c;
    setBusy(true);
    const res = await saveProfile({ id: auth.session!.user.id, name: n, handle: h }, !!auth.profile);
    setBusy(false);
    if (res === 'taken') return setErr('That handle is taken. Try another.');
    if (res) return setErr('We could not save that. Try again.');
    await auth.refreshProfile();
    nav(editing ? '/settings' : next, { replace: true });
  };

  if (current === 'profile') {
    return (
      <form className={styles.screen} onSubmit={save} noValidate>
        <div className={styles.head}>
          <h1 className={styles.title}>
            What should
            <br />
            we call you?
          </h1>
          <p className={styles.lead}>This shows on cards you share. Change it any time.</p>
        </div>
        <div className={styles.fields}>
          <Field
            label="Name"
            autoComplete="name"
            placeholder="Ada Obi"
            value={name}
            maxLength={40}
            onChange={(e) => onName(e.target.value)}
          />
          <Field
            label="Handle"
            prefix="@"
            placeholder="ada"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={20}
            value={handle}
            onChange={(e) => {
              setHandle(e.target.value.replace(/^@/, ''));
              setHandleEdited(true);
              setErr('');
            }}
          />
          <p className={styles.err} role="alert">
            {err}
          </p>
        </div>
        <Button type="submit" variant="accent" disabled={busy} className={styles.full}>
          {editing ? 'Save' : 'Start finding'}
        </Button>
      </form>
    );
  }

  if (current === 'code') {
    return (
      <div className={styles.screen}>
        <div className={styles.head}>
          <h1 className={styles.title}>Check your inbox.</h1>
          <p className={styles.lead}>
            We sent an email to <strong className={styles.strong}>{email.trim()}</strong>. Open the link in it on this
            device, or type the 6 digit code if it has one.
          </p>
        </div>
        <div className={styles.fields}>
          <Field
            ref={codeRef}
            label="Code"
            size="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            value={code}
            disabled={busy}
            onChange={(e) => onCode(e.target.value)}
          />
          <p className={styles.err} role="alert">
            {err}
          </p>
        </div>
        <div className={styles.links}>
          <TextLink onClick={() => (wait > 0 || busy ? undefined : void sendCode())}>
            {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
          </TextLink>
          <TextLink
            onClick={() => {
              setStep('start');
              setCode('');
              setErr('');
            }}
          >
            Use a different email
          </TextLink>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <h1 className={styles.title}>
          Sign in.
          <br />
          <span className={styles.sub}>Keep your streak.</span>
        </h1>
        <p className={styles.lead}>
          Save scores, keep daily streaks and put your name on shared cards. See what we keep in{' '}
          <Link to="/privacy" className={styles.inline}>
            Privacy
          </Link>
          .
        </p>
      </div>
      <form className={styles.fields} onSubmit={sendCode} noValidate>
        {GOOGLE && (
          <>
            <Button variant="secondary" onClick={google} className={styles.tall}>
              Continue with Google
            </Button>
            <div className={styles.or}>
              <span />
              or
              <span />
            </div>
          </>
        )}
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErr('');
          }}
        />
        <Button type="submit" variant="primary" disabled={busy} className={styles.tall}>
          Email me a code
        </Button>
        <p className={styles.err} role="alert">
          {err}
        </p>
      </form>
      <Link to={next} className={styles.guest}>
        Keep playing as a guest
      </Link>
    </div>
  );
}
