import { useEffect, useState } from 'react';
import { handleAuthCallback, hydrateSession } from '@netlify/identity';
import { Loading } from '../../components/Loading';

const AUTH_HASH_PATTERN =
  /^#(confirmation_token|recovery_token|invite_token|email_change_token|access_token)=/;

function resolveRedirect(type: string, token?: string): string {
  switch (type) {
    case 'recovery':
      return '/admin/reset-password';
    case 'invite':
      return `/admin/accept-invite?token=${token ?? ''}`;
    default:
      // oauth, confirmation, email_change — user is fully authenticated
      return '/admin';
  }
}

export function NetlifyCallbackHandler({ children }: { children: React.ReactNode }) {
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
    handleAuthCallback().then((result) => {
      setProcessing(false);
      window.location.href = result ? resolveRedirect(result.type, result.token) : '/admin';
    });
  }, []);

  if (processing) return <Loading message="Confirming…" />;

  return <>{children}</>;
}
