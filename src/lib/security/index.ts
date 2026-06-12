/**
 * Security hardening utilities for New Horizon
 * Applied at app initialization to enforce security policies
 */

class SecurityManager {
  /**
   * Apply Content Security Policy (CSP) headers
   * Prevents XSS, clickjacking, and other injection attacks
   */
  static applyCSP(): void {
    const cspHeader = [
      "default-src 'self'",
      "script-src 'self' 'wasm-unsafe-eval'", // Needed for React/Vite
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.supabase.net wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ');

    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = cspHeader;
    document.head.appendChild(meta);
  }

  /**
   * Sanitize user input to prevent XSS
   */
  static sanitizeHTML(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * Validate and sanitize URLs
   */
  static isSafeURL(url: string): boolean {
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Get secure headers for API requests
   */
  static getSecureHeaders(): Record<string, string> {
    return {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    };
  }

  /**
   * Rate limiting (client-side)
   */
  static createRateLimiter(limit: number, window: number) {
    let requests: number[] = [];
    
    return {
      isAllowed: (): boolean => {
        const now = Date.now();
        requests = requests.filter(time => now - time < window);
        
        if (requests.length >= limit) {
          console.warn(`Rate limit exceeded: ${limit} requests per ${window}ms`);
          return false;
        }
        
        requests.push(now);
        return true;
      },
    };
  }
}

export default SecurityManager;
