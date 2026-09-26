import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Landing } from './routes/Landing';
import { prefersReducedMotion } from './lib/media';
import styles from './App.module.css';

// Landing loads first and alone; every other screen is fetched when visited.
const Games = lazy(() => import('./routes/Games').then((m) => ({ default: m.Games })));
const GameById = lazy(() => import('./routes/Game').then((m) => ({ default: m.GameById })));
const DailyGame = lazy(() => import('./routes/Game').then((m) => ({ default: m.DailyGame })));
const GameByCode = lazy(() => import('./routes/Game').then((m) => ({ default: m.GameByCode })));
const SignIn = lazy(() => import('./routes/SignIn').then((m) => ({ default: m.SignIn })));
const Account = lazy(() => import('./routes/Account').then((m) => ({ default: m.Account })));
const Profile = lazy(() => import('./routes/Profile').then((m) => ({ default: m.Profile })));
const Settings = lazy(() => import('./routes/Settings').then((m) => ({ default: m.Settings })));
const Leaderboard = lazy(() => import('./routes/Leaderboard').then((m) => ({ default: m.Leaderboard })));
const GameLeaderboard = lazy(() => import('./routes/Leaderboard').then((m) => ({ default: m.GameLeaderboard })));
const Privacy = lazy(() => import('./routes/Privacy').then((m) => ({ default: m.Privacy })));

// Test-only card harness. VITE_E2E is set only by the e2e build, so production compiles this away.
const CardsHarness = import.meta.env.VITE_E2E === '1' ? lazy(() => import('./routes/CardsHarness').then((m) => ({ default: m.CardsHarness }))) : null;
const OgHarness = import.meta.env.VITE_E2E === '1' ? lazy(() => import('./routes/CardsHarness').then((m) => ({ default: m.OgHarness }))) : null;

function Layout() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    el?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }, [pathname, hash]);

  return (
    <>
      <Header />
      <main className={pathname === '/' ? styles.bleed : styles.main}>
        <Suspense fallback={<div className={styles.loading} aria-busy="true" />}>
          <Outlet />
        </Suspense>
      </main>
      {pathname === '/' && <Footer />}
    </>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="play" element={<Games />} />
        <Route path="play/:id" element={<GameById />} />
        <Route path="d/:n" element={<DailyGame />} />
        <Route path="p/:code" element={<GameByCode />} />
        <Route path="signin" element={<SignIn />} />
        <Route path="account" element={<Account />} />
        <Route path="u/:handle" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="leaderboard/:id" element={<GameLeaderboard />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      {OgHarness && (
        <Route
          path="__og"
          element={
            <Suspense>
              <OgHarness />
            </Suspense>
          }
        />
      )}
      {CardsHarness && (
        <Route
          path="__cards"
          element={
            <Suspense>
              <CardsHarness />
            </Suspense>
          }
        />
      )}
    </Routes>
  );
}
