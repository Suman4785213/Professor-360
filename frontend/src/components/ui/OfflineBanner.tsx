import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showRestored, setShowRestored] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showRestored) return null;

  if (showRestored) {
    return (
      <aside
        aria-live="polite"
        className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition-all duration-300 z-50 sticky top-0"
      >
        <Wifi className="w-4 h-4 animate-bounce" />
        <span>Connection restored! You are back online.</span>
      </aside>
    );
  }

  return (
    <aside
      aria-live="assertive"
      role="alert"
      className="bg-amber-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-lg transition-all duration-300 z-50 sticky top-0"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>
          <strong>Offline Mode:</strong> Network disconnected. You can browse cached data, but submissions and uploads require an active connection.
        </span>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white text-[11px] font-bold transition-colors cursor-pointer shrink-0 focus-ring"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Retry</span>
      </button>
    </aside>
  );
};
