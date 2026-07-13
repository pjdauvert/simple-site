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
 * to black when the current value isn't a plain hex it can represent.
 */
export const ColorField: React.FC<ColorFieldProps> = ({ label, value, onChange, required, error, helperText }) => {
  const swatch = HEX.test(value) ? value : '#000000';
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Box
        component="input"
        type="color"
        aria-label={label}
        value={swatch}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)}
        sx={{
          mt: 0.25,
          width: 40,
          height: 40,
          p: 0,
          flexShrink: 0,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'transparent',
          cursor: 'pointer',
        }}
      />
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
