import { useEffect, useState } from 'react';

/**
 * Dead-simple hash routing. The test UI doesn't need a real router — we just
 * watch `location.hash` and let consumers branch on the path.
 *
 * Conventions:
 *   ""           → main app
 *   "#/admin"    → admin dashboard
 *   "#/admin/x"  → admin sub-section x
 */

export function getHashPath(): string {
  // strip the leading "#" but keep the leading "/"
  return window.location.hash.replace(/^#/, '') || '/';
}

export function navigate(path: string): void {
  // setting location.hash fires the hashchange event automatically
  window.location.hash = path.startsWith('#') ? path : `#${path}`;
}

export function useHashPath(): string {
  const [path, setPath] = useState(getHashPath());
  useEffect(() => {
    const sync = () => setPath(getHashPath());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  return path;
}
