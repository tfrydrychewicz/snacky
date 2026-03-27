import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export const useAppState = (onChange: (state: AppStateStatus) => void) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      onChangeRef.current(nextState);
    });

    return () => subscription.remove();
  }, []);
};
