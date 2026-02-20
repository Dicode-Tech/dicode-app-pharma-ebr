import { WifiOff } from 'lucide-react';
import { useOffline } from '../hooks/useOffline';

export function OfflineIndicator() {
  const isOffline = useOffline();
  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-sm font-medium py-2 px-4 flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4" />
      You are offline. Changes will not be saved until connection is restored.
    </div>
  );
}
