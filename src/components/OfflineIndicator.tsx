import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../utils/pwa';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="no-print fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>অফলাইন মোড — ইন্টারনেট সংযোগ বিচ্ছিন্ন আছে</span>
    </div>
  );
}
