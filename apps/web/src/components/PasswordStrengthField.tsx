import { useState } from 'react';
import { Box, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useTheme, lighten, darken } from '@mui/material/styles';
import { useIntl } from 'react-intl';

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function computeStrength(pwd: string): StrengthLevel {
  if (!pwd.length) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(4, score) as StrengthLevel;
}

const STRENGTH_KEYS = [
  '',
  'password.strength.weak',
  'password.strength.fair',
  'password.strength.good',
  'password.strength.strong',
] as const;

// Minimum strength level (≥ 2 = at least 8 chars) to allow submission
const MIN_STRENGTH: StrengthLevel = 2;

export interface PasswordStrengthFieldProps {
  label: string;
  onChange: (password: string, isValid: boolean) => void;
  disabled?: boolean;
}

export const PasswordStrengthField: React.FC<PasswordStrengthFieldProps> = ({
  label,
  onChange,
  disabled = false,
}) => {
  const intl = useIntl();
  const theme = useTheme();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const strength = computeStrength(password);
  const passwordsMatch = password === confirm;

  const secondaryColor = theme.palette.secondary.main;
  const strengthColors: Record<StrengthLevel, string> = {
    0: lighten(secondaryColor, 0.9),  // tone  50 — unlit segments
    1: lighten(secondaryColor, 0.6),  // tone 200
    2: lighten(secondaryColor, 0.2),  // tone 400
    3: darken(secondaryColor, 0.1),   // tone 600
    4: darken(secondaryColor, 0.4),   // tone 800
  };
  const strengthColor = strengthColors[strength];

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    const s = computeStrength(val);
    onChange(val, s >= MIN_STRENGTH && val === confirm && val.length > 0);
  };

  const handleConfirmChange = (val: string) => {
    setConfirm(val);
    onChange(password, strength >= MIN_STRENGTH && password === val && password.length > 0);
  };

  const visibilityAdornment = (visible: boolean, onToggle: () => void) => (
    <InputAdornment position="end">
      <IconButton onClick={onToggle} edge="end" tabIndex={-1} size="small">
        {visible ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
      </IconButton>
    </InputAdornment>
  );

  const showMismatch = confirmTouched && confirm.length > 0 && !passwordsMatch;

  return (
    <>
      <TextField
        label={label}
        type={showPassword ? 'text' : 'password'}
        fullWidth
        size="medium"
        value={password}
        onChange={(e) => handlePasswordChange(e.target.value)}
        disabled={disabled}
        slotProps={{ input: { endAdornment: visibilityAdornment(showPassword, () => setShowPassword(v => !v)) } }}
        sx={{ mb: 1 }}
      />

      {/* Strength bar — always reserves space to prevent layout shift */}
      <Box sx={{ mb: 2, minHeight: 32 }}>
        {password.length > 0 && (
          <>
            <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
              {([1, 2, 3, 4] as StrengthLevel[]).map(level => (
                <Box
                  key={level}
                  sx={{
                    flex: 1,
                    height: 4,
                    borderRadius: 1,
                    bgcolor: level <= strength ? strengthColor : strengthColors[0],
                    transition: 'background-color 0.2s ease',
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                  }}
                />
              ))}
            </Box>
            <Typography variant="caption" sx={{ color: strengthColor, fontWeight: 500 }}>
              {intl.formatMessage({ id: STRENGTH_KEYS[strength] || STRENGTH_KEYS[1] })}
            </Typography>
          </>
        )}
      </Box>

      <TextField
        label={intl.formatMessage({ id: 'password.confirm' })}
        type={showConfirm ? 'text' : 'password'}
        fullWidth
        size="medium"
        value={confirm}
        onChange={(e) => handleConfirmChange(e.target.value)}
        onBlur={() => setConfirmTouched(true)}
        disabled={disabled}
        error={showMismatch}
        helperText={showMismatch ? intl.formatMessage({ id: 'password.mismatch' }) : ' '}
        slotProps={{ input: { endAdornment: visibilityAdornment(showConfirm, () => setShowConfirm(v => !v)) } }}
        sx={{ mb: 3 }}
      />
    </>
  );
};
