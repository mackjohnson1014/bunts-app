import { useCallback, useEffect, useState } from 'react';

type State<T> = { data: T | null; error: unknown; loading: boolean };

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });

  const run = useCallback(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => { if (!cancelled) setState({ data, error: null, loading: false }); })
      .catch((e: unknown) => {
        // Keep the error object, not its message -- screens branch on its code.
        if (!cancelled) setState({ data: null, error: e, loading: false });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => run(), [run]);

  return { ...state, reload: run };
}
