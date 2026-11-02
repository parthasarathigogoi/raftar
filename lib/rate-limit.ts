const attempts = new Map<string, { count: number; resetAt: number }>();
export function rateLimit(key: string, limit = 5, windowMs = 60_000) { const now = Date.now(); const record = attempts.get(key); if (!record || record.resetAt < now) { attempts.set(key, { count: 1, resetAt: now + windowMs }); return true; } if (record.count >= limit) return false; record.count++; return true; }
