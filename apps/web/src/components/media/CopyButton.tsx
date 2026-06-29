import { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';

interface CopyButtonProps {
  value: string;
  label: string;
  copiedLabel: string;
  icon: React.ReactElement;
}

/** Copies `value` to the clipboard, flipping its tooltip to a confirmation for a moment. */
export const CopyButton: React.FC<CopyButtonProps> = ({ value, label, copiedLabel, icon }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (e.g. insecure context) — silently ignore */
    }
  };
  return (
    <Tooltip title={copied ? copiedLabel : label}>
      <IconButton size="small" aria-label={label} onClick={handleCopy}>{icon}</IconButton>
    </Tooltip>
  );
};
