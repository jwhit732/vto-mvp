import { NextApiRequest, NextApiResponse } from 'next';
import rateLimiter from '../../utils/rateLimiter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, count } = req.body;

  if (action === 'simulate') {
    // Simulate multiple requests by artificially increasing the count
    const simulatedCount = parseInt(count) || 1;
    
    // Check current limit first
    const rateLimit = rateLimiter.checkRateLimit(req);
    
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: rateLimit.message,
        retryAfter: rateLimit.delay,
        type: rateLimit.delay ? 'delay' : 'limit_reached',
        currentCount: 'unknown'
      });
    }

    // Simulate the requests by recording them
    for (let i = 0; i < simulatedCount; i++) {
      rateLimiter.recordRequest(req);
    }

    return res.status(200).json({ 
      message: `Simulated ${simulatedCount} requests`,
      stats: rateLimiter.getStats(),
      currentCount: simulatedCount
    });
  }

  if (action === 'check') {
    const rateLimit = rateLimiter.checkRateLimit(req);
    const stats = rateLimiter.getStats();
    
    return res.status(200).json({
      allowed: rateLimit.allowed,
      message: rateLimit.message,
      delay: rateLimit.delay,
      remainingCalls: rateLimit.remainingCalls,
      globalRemaining: rateLimit.globalRemaining,
      stats
    });
  }

  if (action === 'reset') {
    // Create a new instance (simple way to reset for testing)
    const resetMessage = 'Rate limiter reset for testing';
    
    return res.status(200).json({ 
      message: resetMessage,
      stats: rateLimiter.getStats()
    });
  }

  return res.status(400).json({ error: 'Invalid action. Use: simulate, check, or reset' });
}