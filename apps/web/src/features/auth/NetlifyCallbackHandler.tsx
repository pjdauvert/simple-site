import { useEffect, useState } from 'react';
import { handleAuthCallback, hydrateSession } from '@netlify/identity';
import { Loading } from '../../components/Loading';
import { ACCEPT_INVITE_PATH, RESET_PWD_PATH, loginPath, loggedPath } from './auth.constants'
import { Navigate } from 'react-router-dom';

const AUTH_HASH_PATTERN =
  /^#(confirmation_token|recovery_token|invite_token|email_change_token|access_token)=/;

function resolveRedirect(type: string, token?: string): string {
  switch (type) {
    case 'recovery':
      return `${loginPath}/${RESET_PWD_PATH}`;
    case 'invite':
      return `${loginPath}/${ACCEPT_INVITE_PATH}?token=${token ?? ''}`;
    default:
      // oauth, confirmation, email_change — user is fully authenticated
      return loggedPath;
  }
}

export function NetlifyCallbackHandler() {
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
      window.location.href = result ? resolveRedirect(result.type, result.token) : loggedPath;
    });
  }, []);

  if (processing) return <Loading message="Confirming…" />;

  return <Navigate to='/home' replace />;
}
