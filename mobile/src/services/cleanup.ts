const callbacks = new Set<() => void>();
export const registerCleanup = (fn: () => void) => {
  callbacks.add(fn);
};
export function cleanup() {
  for (const fn of callbacks) fn();
}
