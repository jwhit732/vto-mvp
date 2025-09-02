interface RateLimitData {
  count: number;
  firstRequest: number;
  lastRequest: number;
}

interface GlobalStats {
  dailyCount: number;
  resetTime: number;
}

class RateLimiter {
  private ipData: Map<string, RateLimitData> = new Map();
  private globalStats: GlobalStats = { dailyCount: 0, resetTime: 0 };
  
  private readonly PER_IP_LIMIT = 30;
  private readonly DELAY_THRESHOLD = 40;
  private readonly GLOBAL_DAILY_LIMIT = 400;
  private readonly DAY_MS = 24 * 60 * 60 * 1000;
  private readonly DELAY_SECONDS = 60;

  private getClientIP(req: any): string {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : 
               req.headers['x-real-ip'] || 
               req.connection?.remoteAddress ||
               req.socket?.remoteAddress ||
               '127.0.0.1';
    
    return ip.replace(/^::ffff:/, '');
  }

  private isNewDay(timestamp: number): boolean {
    const now = new Date();
    const requestDate = new Date(timestamp);
    return now.getDate() !== requestDate.getDate() || 
           now.getMonth() !== requestDate.getMonth() || 
           now.getFullYear() !== requestDate.getFullYear();
  }

  private resetIfNewDay(): void {
    const now = Date.now();
    
    if (this.globalStats.resetTime === 0 || this.isNewDay(this.globalStats.resetTime)) {
      this.globalStats = { dailyCount: 0, resetTime: now };
      
      const ipEntries = Array.from(this.ipData.entries());
      for (const [ip, data] of ipEntries) {
        if (this.isNewDay(data.firstRequest)) {
          this.ipData.delete(ip);
        }
      }
    }
  }

  checkRateLimit(req: any): { 
    allowed: boolean; 
    delay?: number; 
    message?: string;
    remainingCalls?: number;
    globalRemaining?: number;
  } {
    this.resetIfNewDay();
    
    const clientIP = this.getClientIP(req);
    const now = Date.now();
    
    if (this.globalStats.dailyCount >= this.GLOBAL_DAILY_LIMIT) {
      return {
        allowed: false,
        message: "Daily service limit reached. Please try again tomorrow!"
      };
    }

    const ipData = this.ipData.get(clientIP) || { 
      count: 0, 
      firstRequest: now, 
      lastRequest: now 
    };

    if (ipData.count >= this.DELAY_THRESHOLD) {
      return {
        allowed: false,
        message: "Daily limit reached. Thanks for using our service! Please try again tomorrow."
      };
    }

    if (ipData.count >= this.PER_IP_LIMIT) {
      const timeSinceLastRequest = now - ipData.lastRequest;
      const requiredDelay = this.DELAY_SECONDS * 1000;
      
      if (timeSinceLastRequest < requiredDelay) {
        const remainingDelay = Math.ceil((requiredDelay - timeSinceLastRequest) / 1000);
        return {
          allowed: false,
          delay: remainingDelay,
          message: `Please wait ${remainingDelay} seconds before your next try-on.`
        };
      }
    }

    return {
      allowed: true,
      remainingCalls: Math.max(0, this.PER_IP_LIMIT - ipData.count),
      globalRemaining: Math.max(0, this.GLOBAL_DAILY_LIMIT - this.globalStats.dailyCount)
    };
  }

  recordRequest(req: any): void {
    this.resetIfNewDay();
    
    const clientIP = this.getClientIP(req);
    const now = Date.now();
    
    const ipData = this.ipData.get(clientIP) || { 
      count: 0, 
      firstRequest: now, 
      lastRequest: now 
    };
    
    ipData.count += 1;
    ipData.lastRequest = now;
    
    this.ipData.set(clientIP, ipData);
    this.globalStats.dailyCount += 1;
  }

  getStats(): { 
    totalIPs: number; 
    globalDailyCount: number; 
    globalRemaining: number;
  } {
    this.resetIfNewDay();
    
    return {
      totalIPs: this.ipData.size,
      globalDailyCount: this.globalStats.dailyCount,
      globalRemaining: Math.max(0, this.GLOBAL_DAILY_LIMIT - this.globalStats.dailyCount)
    };
  }
}

const rateLimiter = new RateLimiter();
export default rateLimiter;