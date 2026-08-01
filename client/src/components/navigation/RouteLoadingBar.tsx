'use client';

import { Box } from '@mui/material';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const START_EVENT = 'domobmen:route-loading-start';

export function startRouteLoading() {
  window.dispatchEvent(new Event(START_EVENT));
}

export function RouteLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const activeRef = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const fallbackRef = useRef<number | null>(null);
  const hideRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    if (fallbackRef.current !== null) window.clearTimeout(fallbackRef.current);
    intervalRef.current = null;
    fallbackRef.current = null;
    if (hideRef.current !== null) window.clearTimeout(hideRef.current);
    hideRef.current = null;
  };

  const finish = () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearTimers();
    setProgress(100);
    hideRef.current = window.setTimeout(() => { setVisible(false); setProgress(0); hideRef.current = null; }, 220);
  };

  useEffect(() => {
    const start = () => {
      clearTimers();
      activeRef.current = true;
      setVisible(true);
      setProgress(12);
      window.requestAnimationFrame(() => setProgress(38));
      intervalRef.current = window.setInterval(() => {
        setProgress((current) => current >= 90 ? current : current + Math.max(1, (90 - current) * 0.12));
      }, 240);
      fallbackRef.current = window.setTimeout(finish, 12_000);
    };

    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement).closest('a');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const target = new URL(anchor.href, window.location.href);
      if (target.origin !== window.location.origin) return;
      const current = new URL(window.location.href);
      if (target.pathname === current.pathname && target.search === current.search) return;
      start();
    };

    window.addEventListener(START_EVENT, start);
    window.addEventListener('popstate', start);
    document.addEventListener('click', click, true);
    return () => {
      clearTimers();
      window.removeEventListener(START_EVENT, start);
      window.removeEventListener('popstate', start);
      document.removeEventListener('click', click, true);
    };
  }, []);

  useEffect(() => { finish(); }, [pathname, searchParams]);

  if (!visible) return null;
  return <Box aria-hidden sx={{ position: 'fixed', zIndex: 20000, top: 0, left: 0, width: `${progress}%`, height: 3, pointerEvents: 'none', bgcolor: 'primary.main', boxShadow: '0 0 10px rgba(18, 117, 99, .7)', transition: progress === 100 ? 'width 120ms ease-out, opacity 180ms ease 100ms' : 'width 260ms ease-out', opacity: progress === 100 ? 0 : 1, '&::after': { content: '""', position: 'absolute', right: 0, width: 90, height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.8))' } }} />;
}
