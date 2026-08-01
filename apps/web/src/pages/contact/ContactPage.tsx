import React, { useState } from 'react';
import { Alert, Box, Button, Container, TextField, Typography } from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import { CONTACT_MESSAGE_MAX_LENGTH } from '@simple-site/interfaces';
import { NotFoundPage } from '../error/NotFoundPage';
import { Loading } from '../../components';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { isValidEmail } from '../../features/auth/auth.utils';
import { sendContactMessage } from '../../services/contactService';

/**
 * Public /contact form. The route is always registered; the page gates itself
 * on the runtime `contact` flag (flag off → 404, matching the server's
 * behavior) so a direct navigation never flashes the catch-all while flags
 * load. The form posts the visitor's email + message to the public
 * `/api/contact` endpoint, which relays them to the site owner by email.
 */
export const ContactPage: React.FC = () => {
  const flags = useFeatureFlags();
  const intl = useIntl();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [messageError, setMessageError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (flags === null) return <Loading />;
  if (!flags.contact) return <NotFoundPage />;

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const emailInvalid = !isValidEmail(email);
    const messageInvalid = message.trim() === '';
    setEmailError(emailInvalid);
    setMessageError(messageInvalid);
    if (emailInvalid || messageInvalid) return;
    setSending(true);
    setError(null);
    setSent(false);
    try {
      await sendContactMessage({ email, message: message.trim() });
      setSent(true);
      setEmail('');
      setMessage('');
    } catch {
      setError(intl.formatMessage({ id: 'page.contact.error.generic' }));
    } finally {
      setSending(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
      <Typography variant="h3" component="h1" gutterBottom sx={{ mb: { xs: 3, md: 5 } }}>
        <FormattedMessage id="page.contact.title" />
      </Typography>
      {sent && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <FormattedMessage id="page.contact.success" />
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {/* noValidate: the form's own localized validation replaces the browser's
          native email tooltip, which can't be translated. */}
      <Box component="form" noValidate onSubmit={handleSubmit}>
        <TextField
          label={intl.formatMessage({ id: 'page.contact.email' })}
          type="email"
          fullWidth
          size="medium"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmailError(email !== '' && !isValidEmail(email))}
          error={emailError}
          helperText={emailError ? <FormattedMessage id="page.contact.email.invalid" /> : ' '}
          sx={{ mb: 2, minHeight: 44 }}
        />
        <TextField
          label={intl.formatMessage({ id: 'page.contact.message' })}
          fullWidth
          multiline
          minRows={6}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (messageError) setMessageError(false);
          }}
          error={messageError}
          helperText={
            messageError ? (
              <FormattedMessage id="page.contact.message.required" />
            ) : (
              `${message.length}/${CONTACT_MESSAGE_MAX_LENGTH}`
            )
          }
          slotProps={{ htmlInput: { maxLength: CONTACT_MESSAGE_MAX_LENGTH } }}
          sx={{ mb: 2 }}
        />
        <Button type="submit" variant="contained" fullWidth disabled={sending} sx={{ minHeight: 44 }}>
          <FormattedMessage id="page.contact.submit" />
        </Button>
      </Box>
    </Container>
  );
};
