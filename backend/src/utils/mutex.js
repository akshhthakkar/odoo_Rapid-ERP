const queues = new Map();

/**
 * Runs a function serialized per key (e.g. per tenant + prefix).
 * This prevents concurrent transactions from generating duplicate sequence refs
 * and avoids connection pool starvation/deadlocks.
 */
export const runSerialized = (key, fn) => {
  if (!queues.has(key)) {
    queues.set(key, Promise.resolve());
  }
  const next = queues.get(key).then(fn).catch((err) => {
    throw err;
  });
  queues.set(key, next.catch(() => {}));
  return next;
};
