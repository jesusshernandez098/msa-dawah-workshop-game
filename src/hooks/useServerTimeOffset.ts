import { useEffect, useState } from 'react';
import { rtdb, ref, onValue } from '../lib/firebase';

let cachedOffset = 0;

export function useServerTimeOffset(): number {
  const [offset, setOffset] = useState<number>(cachedOffset);

  useEffect(() => {
    const offsetRef = ref(rtdb, '.info/serverTimeOffset');
    const unsubscribe = onValue(offsetRef, (snapshot) => {
      const val = snapshot.val();
      if (typeof val === 'number') {
        cachedOffset = val;
        setOffset(val);
      }
    });

    return () => unsubscribe();
  }, []);

  return offset;
}
