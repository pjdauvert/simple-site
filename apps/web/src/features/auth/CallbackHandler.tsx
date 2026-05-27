import { useEffect, useState } from 'react';
import { handleAuthCallback, hydrateSession } from '@netlify/identity';
import { Loading } from '../../components/Loading';

const AUTH_HASH_PATTERN =
  /^#(confirmation_token|recovery_token|invite_token|email_change_token|access_token)=/;

export function CallbackHandler({ children }: { children: React.ReactNode }) {
  const [processing, setProcessing] = useState(() =>
    typeof window !== 'undefined'
      ? AUTH_HASH_PATTERN.test(window.location.hash)
      : false,
  );

  useEffect(() => {
    if (!AUTH_HASH_PATTERN.test(window.location.hash)) {
      hydrateSession();
      return;
    }
    handleAuthCallback().then(() => {
      setProcessing(false);
      window.location.href = '/admin';
    });
  }, []);

  if (processing) return <Loading message="Confirming…" />;

  return <>{children}</>;
}
