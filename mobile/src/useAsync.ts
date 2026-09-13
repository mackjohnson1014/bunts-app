import { useCallback, useEffect, useState } from 'react';

type State<T> = { data: T | null; error: string | null; loading: boolean };

/** Minimal data-fetching hook. Swap for TanStack Query if this app ever grows. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });

  const run = useCallback(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((e: unknown) =>
        !cancelled &&
        setState({ data: null, error: e instanceof Error ? e.message : String(e), loading: false }),
      );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => run(), [run]);

  return { ...state, reload: run };
}
