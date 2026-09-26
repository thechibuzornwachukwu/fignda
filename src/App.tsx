import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Landing } from './routes/Landing';
import { Games } from './routes/Games';
import { DailyGame, GameByCode, GameById } from './routes/Game';
import { SignIn } from './routes/SignIn';
import { Account } from './routes/Account';
import { Privacy } from './routes/Privacy';
import { prefersReducedMotion } from './lib/media';
import styles from './App.module.css';

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
        <Outlet />
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
