/** Instance-local sliding window. Use a shared store/WAF for a deployment-wide limit. */
export function createContactRateLimiter({
  now = Date.now,
  limit = 3,
  windowMs = 600000,
  maxEntries = 10000,
} = {}) {
  const clients = new Map<string, number[]>();
  let lastSweep = 0;
  return (ip: string): { allowed: boolean; retryAfter: number } => {
    const time = now();
    if (time - lastSweep >= 60000 || clients.size >= maxEntries) {
      for (const [key, stamps] of clients)
        if (stamps.at(-1)! <= time - windowMs) clients.delete(key);
      lastSweep = time;
    }
    const stamps = (clients.get(ip) ?? []).filter(
      (stamp) => stamp > time - windowMs,
    );
    if (stamps.length >= limit)
      return {
        allowed: false,
        retryAfter: Math.max(
          1,
          Math.ceil((stamps[0] + windowMs - time) / 1000),
        ),
      };
    if (!clients.has(ip) && clients.size >= maxEntries)
      return { allowed: false, retryAfter: 60 };
    clients.set(ip, [...stamps, time]);
    return { allowed: true, retryAfter: 0 };
  };
}
