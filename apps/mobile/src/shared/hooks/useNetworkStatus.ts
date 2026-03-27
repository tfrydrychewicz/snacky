import { useEffect, useState } from 'react';
import { onlineManager } from '@tanstack/react-query';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(onlineManager.isOnline());

  useEffect(() => {
    const unsubscribe = onlineManager.subscribe((online) => {
      setIsOnline(online);
    });

    return () => unsubscribe();
  }, []);

  return { isOnline };
};
