import { check, type DownloadEvent } from '@tauri-apps/plugin-updater';
import { useEffect, useState, useCallback, useRef } from 'react';

interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
}

export function useAutoUpdate() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const checkingRef = useRef(false);
  const updateRef = useRef<any>(null);

  const checkUpdate = useCallback(async (onUpToDate?: () => void, onError?: () => void) => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setStatus('checking');

    try {
      const update = await check();
      if (update) {
        updateRef.current = update;
        setUpdateInfo({
          version: update.version,
          date: update.date,
          body: update.body,
        });
        setStatus('available');
      } else {
        setStatus('idle');
        onUpToDate?.();
      }
    } catch (e) {
      console.error('检查更新失败:', e);
      setStatus('idle');
      onError?.();
    } finally {
      checkingRef.current = false;
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!updateInfo) return;

    setStatus('downloading');
    setProgress(0);

    try {
      const update = updateRef.current;
      if (update) {
        let lastProgress = 0;
        await update.downloadAndInstall((event: DownloadEvent) => {
          switch (event.event) {
            case 'Started':
              setProgress(0);
              break;
            case 'Progress':
              lastProgress += event.data.chunkLength;
              setProgress(Math.min(lastProgress, 99));
              break;
            case 'Finished':
              setProgress(100);
              break;
          }
        });
        setStatus('ready');
      }
    } catch (e) {
      console.error('下载更新失败:', e);
      setStatus('error');
    }
  }, [updateInfo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkUpdate();
    }, 5000);
    return () => clearTimeout(timer);
  }, [checkUpdate]);

  return {
    updateInfo,
    status,
    progress,
    checkUpdate,
    downloadAndInstall,
  };
}
