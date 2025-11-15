import { useEffect } from 'react';

/**
 * Custom hook to dynamically set the favicon
 * @param faviconUrl - URL or path to the favicon
 */
export const useFavicon = (faviconUrl?: string) => {
  useEffect(() => {
    if (!faviconUrl) return;

    // Find existing favicon link element
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    
    if (!link) {
      // Create new link element if it doesn't exist
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    // Determine the type based on the URL
    const isPng = faviconUrl.includes('.png');
    const isSvg = faviconUrl.includes('.svg');
    
    if (isPng) {
      link.type = 'image/png';
    } else if (isSvg) {
      link.type = 'image/svg+xml';
    } else {
      link.type = 'image/x-icon';
    }

    // Set the href
    link.href = faviconUrl;
  }, [faviconUrl]);
};

