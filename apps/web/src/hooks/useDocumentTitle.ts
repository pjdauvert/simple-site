import { useEffect } from 'react';

/**
 * Sets `document.title` while the calling component is mounted, restoring the
 * previous title on unmount. Pass `undefined` to leave the title untouched
 * (e.g. while data is still loading).
 */
export const useDocumentTitle = (title: string | undefined): void => {
  useEffect(() => {
    if (title === undefined) return;
    const previous = document.title;
    document.title = title;
    return () => { document.title = previous; };
  }, [title]);
};
