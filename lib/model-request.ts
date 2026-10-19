/** A cancelled or superseded completion must never commit, even if fetch ignores abort. */
export function createModelRequestSlot() {
  let current: AbortController | null = null;
  return {
    begin() {
      current?.abort();
      current = new AbortController();
      return current;
    },
    isCurrent(request: AbortController) { return current === request && !request.signal.aborted; },
    cancel() { current?.abort(); current = null; },
  };
}
