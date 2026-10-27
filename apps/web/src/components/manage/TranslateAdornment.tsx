import { InputAdornment } from '@mui/material';
import { TranslateShortcut } from './TranslateShortcut';

/**
 * `TranslateShortcut` as a TextField end adornment — the recurring pairing of
 * every translation-default field across the manage editors.
 */
export const TranslateAdornment: React.FC<{ i18nKey: string; label: string }> = ({ i18nKey, label }) => (
  <InputAdornment position="end">
    <TranslateShortcut i18nKey={i18nKey} label={label} />
  </InputAdornment>
);
