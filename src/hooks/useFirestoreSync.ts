import { useState, useEffect, DependencyList, Dispatch, SetStateAction, useRef } from 'react';

export function useFirestoreSync<T>(
  syncFn: (onData: (data: T[]) => void) => () => void,
  initialData: T[],
  deps: DependencyList = []
): [T[], Dispatch<SetStateAction<T[]>>] {
  const [data, setData] = useState<T[]>(initialData);
  const syncFnRef = useRef(syncFn);

  useEffect(() => {
    syncFnRef.current = syncFn;
  }, [syncFn]);

  useEffect(() => {
    const unsubscribe = syncFnRef.current((newData) => {
      setData(newData);
    });
    return () => unsubscribe();
  }, deps);

  return [data, setData];
}
