import { useEffect } from 'react';

export function useBrowserRestrictions() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        window.getSelection()?.toString()
      ) {
        return;
      }
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) {
        if (['F5', 'F12'].includes(e.key)) {
          e.preventDefault();
        }
        return;
      }
      const key = e.key.toLowerCase();
      if (['r', 'f', 'h', 'p'].includes(key)) {
        e.preventDefault();
      }
      if (e.shiftKey && ['r', 'i', 'j'].includes(key)) {
        e.preventDefault();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('wheel', handleWheel);
    };
  }, []);
}
