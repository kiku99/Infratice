/**
 * Module-level snapshot cache for deduplicating async fetches across renders.
 * Returns cached data on subsequent calls; retries on failure.
 */
export function createSnapshot<T>(fetcher: () => Promise<T>) {
  let snapshot: { value: T } | undefined;
  let request: Promise<T> | null = null;

  async function loadOnce(): Promise<T> {
    if (snapshot !== undefined) return snapshot.value;

    if (!request) {
      request = fetcher()
        .then((value) => {
          snapshot = { value };
          return value;
        })
        .catch((error) => {
          request = null;
          throw error;
        });
    }

    return request;
  }

  function getSnapshot(): T | undefined {
    return snapshot?.value;
  }

  function hasSnapshot(): boolean {
    return snapshot !== undefined;
  }

  return { loadOnce, getSnapshot, hasSnapshot };
}
