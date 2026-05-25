import { check } from '@tauri-apps/plugin-updater';
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

  const checkUpdate = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setStatus('checking');

    try {
      const update = await check();
      if (update) {
        setUpdateInfo({
          version: update.version,
          date: update.date,
          body: update.body,
        });
        setStatus('available');
      } else {
        setStatus('idle');
      }
    } catch (e) {
      console.error('检查更新失败:', e);
      setStatus('idle');
    } finally {
      checkingRef.current = false;
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!updateInfo) return;

    setStatus('downloading');
    setProgress(0);

    try {
      const update = await check();
      if (update) {
        let lastProgress = 0;
        await update.downloadAndInstall((event) => {
          if (event.event === 'Started') {
            setProgress(0);
          } else if (event.event === 'Progress') {
            lastProgress += event.data.chunkLength;
            setProgress(Math.min(lastProgress, 99));
          } else if (event.event === 'Finished') {
            setProgress(100);
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
