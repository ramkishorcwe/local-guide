import { useEffect, type RefObject } from 'react';
export function useDialog(ref: RefObject<HTMLElement>, onClose: () => void, busy = false) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const focusables = () => Array.from(root?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea, select, a[href], [tabindex="0"]') || []);
    focusables()[0]?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose();
      if (event.key === 'Tab') {
        const items = focusables(); const first = items[0]; const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = originalOverflow; document.removeEventListener('keydown', key); previous?.focus(); };
  }, [ref, onClose, busy]);
}
