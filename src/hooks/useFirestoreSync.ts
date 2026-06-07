import { useState, useEffect, DependencyList, Dispatch, SetStateAction, useRef } from 'react';

export function useFirestoreSync<T>(
  syncFn: (onData: (data: T[]) => void) => () => void,
  initialData: T[],
  deps: DependencyList = []
): [T[], Dispatch<SetStateAction<T[]>>, boolean] {
  const [data, setData] = useState<T[]>(initialData);
  const [isLoaded, setIsLoaded] = useState(false);
  const syncFnRef = useRef(syncFn);

  useEffect(() => {
    syncFnRef.current = syncFn;
  }, [syncFn]);

  useEffect(() => {
    const unsubscribe = syncFnRef.current((newData) => {
      setData(newData);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, deps);

  return [data, setData, isLoaded];
}
