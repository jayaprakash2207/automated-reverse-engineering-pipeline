type Listener = () => void;

const listeners: Record<string, Set<Listener>> = {};

/** Minimal pub/sub so the axios layer (outside React) can notify the auth
 * provider (inside React) without a circular import between the two. */
export const authEvents = {
  on(event: string, callback: Listener): () => void {
    (listeners[event] ??= new Set()).add(callback);
    return () => listeners[event]?.delete(callback);
  },
  emit(event: string): void {
    listeners[event]?.forEach((callback) => callback());
  },
};
