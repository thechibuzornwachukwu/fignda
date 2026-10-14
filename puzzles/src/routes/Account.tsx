import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

/** Old /account links: your profile when signed in, otherwise sign in. */
export function Account() {
  const auth = useAuth();
  if (auth.enabled && auth.loading) return null;
  if (auth.profile) return <Navigate to={`/u/${auth.profile.handle}`} replace />;
  return <Navigate to="/signin?next=%2Faccount" replace />;
}
