import { useEffect, useState } from 'react';
import { useAppStore } from './useAppStore';

/** True once the persisted store has loaded from AsyncStorage. */
export function useHasHydrated() {
  const [hydrated, setHydrated] = useState(() => useAppStore.persist.hasHydrated());

  useEffect(() => {
    const unsubscribe = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useAppStore.persist.hasHydrated());
    return unsubscribe;
  }, []);

  return hydrated;
}
