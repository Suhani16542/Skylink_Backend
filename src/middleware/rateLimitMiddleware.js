/**
 * Lightweight In-Memory Rate Limiter for Form Submissions
 * Prevents automated spam and denial-of-service on public endpoints.
 */

class InMemoryRateLimiter {
  constructor(windowMs = 15 * 60 * 1000, maxRequests = 15) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.hits = new Map();

    // Periodically clean expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.hits.entries()) {
      if (now - record.startTime > this.windowMs) {
        this.hits.delete(key);
      }
    }
  }

  middleware() {
    return (req, res, next) => {
      // Extract client IP address safely
      const ip =
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        req.ip ||
        'unknown_ip';

      const now = Date.now();
      const record = this.hits.get(ip);

      if (!record) {
        this.hits.set(ip, { count: 1, startTime: now });
        return next();
      }

      // Check if window has expired
      if (now - record.startTime > this.windowMs) {
        this.hits.set(ip, { count: 1, startTime: now });
        return next();
      }

      // Increment hit count
      record.count += 1;

      if (record.count > this.maxRequests) {
        const retryAfterSeconds = Math.ceil((record.startTime + this.windowMs - now) / 1000);
        res.setHeader('Retry-After', retryAfterSeconds);
        return res.status(429).json({
          status: 'fail',
          message: 'Too many submissions from this IP address. Please wait a few minutes before trying again.',
        });
      }

      return next();
    };
  }
}

// 15 submissions per 15 minutes per IP
export const formRateLimiter = new InMemoryRateLimiter(15 * 60 * 1000, 15).middleware();

export default formRateLimiter;
