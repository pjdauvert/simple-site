import { Box, Stack, TextField } from '@mui/material';

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
}

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * A color input: a free-text field (so `rgba(...)` / named colors are allowed)
 * paired with a native swatch that writes a hex value back. The swatch falls back
 * to black when the current value isn't a plain hex it can represent; when the
 * value is empty it shows the standard "no colour" swatch (grey with a red
 * diagonal) instead, since a native color input can only render a solid colour.
 */
export const ColorField: React.FC<ColorFieldProps> = ({ label, value, onChange, required, error, helperText }) => {
  const isEmpty = value.trim().length === 0;
  const swatch = HEX.test(value) ? value : '#000000';
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Box sx={{ position: 'relative', mt: 0.25, width: 40, height: 40, flexShrink: 0 }}>
        <Box
          component="input"
          type="color"
          aria-label={label}
          value={swatch}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            p: 0,
            m: 0,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'transparent',
            cursor: 'pointer',
          }}
        />
        {isEmpty && (
          <Box
            aria-hidden
            sx={(theme) => ({
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              boxSizing: 'border-box',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: theme.palette.grey[300],
              backgroundImage: `linear-gradient(to bottom right, transparent 0 calc(50% - 1px), ${theme.palette.error.main} calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px) 100%)`,
            })}
          />
        )}
      </Box>
      <TextField
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        error={error}
        helperText={helperText ?? ' '}
        size="small"
        fullWidth
      />
    </Stack>
  );
};
