import { Box, TextField } from '@mui/material';
import { useIntl } from 'react-intl';
import { ColorField } from './ColorField';
import { COLOR_FIELDS, type ThemeDraft } from './themeFields';

interface ThemeEditorProps {
  draft: ThemeDraft;
  /** When true, required fields left blank are highlighted (set after a failed save). */
  showErrors: boolean;
  onChange: (draft: ThemeDraft) => void;
}

/** The editable fields for a single theme: its name plus every color. */
export const ThemeEditor: React.FC<ThemeEditorProps> = ({ draft, showErrors, onChange }) => {
  const intl = useIntl();
  const set = (key: string, value: string) => onChange({ ...draft, [key]: value });
  const requiredMsg = intl.formatMessage({ id: 'page.manage.themes.field.required' });
  const nameEmpty = showErrors && !draft.themeName.trim();

  return (
    <Box>
      <TextField
        label={intl.formatMessage({ id: 'page.manage.themes.field.themeName' })}
        value={draft.themeName}
        onChange={(e) => set('themeName', e.target.value)}
        required
        error={nameEmpty}
        helperText={nameEmpty ? requiredMsg : ' '}
        size="small"
        fullWidth
        sx={{ mb: 1, maxWidth: 320 }}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
        {COLOR_FIELDS.map(({ key, required }) => {
          const empty = showErrors && required && !(draft[key] ?? '').trim();
          return (
            <ColorField
              key={key}
              label={intl.formatMessage({ id: `page.manage.themes.field.${key}` })}
              value={draft[key] ?? ''}
              onChange={(v) => set(key, v)}
              required={required}
              error={empty}
              helperText={empty ? requiredMsg : ' '}
            />
          );
        })}
      </Box>
    </Box>
  );
};
