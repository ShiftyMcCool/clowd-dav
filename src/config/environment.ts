// Environment configuration utility

export interface AppConfig {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  debug: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  serviceWorker: {
    enabled: boolean;
  };
  cache: {
    duration: number;
    offlineSize: number;
  };
}

class EnvironmentConfig {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    return {
      name: process.env.REACT_APP_NAME || 'CalDAV/CardDAV Client',
      version: process.env.REACT_APP_VERSION || '1.0.0',
      environment: (process.env.REACT_APP_ENVIRONMENT as AppConfig['environment']) || 'development',
      debug: process.env.REACT_APP_DEBUG === 'true',
      logLevel: (process.env.REACT_APP_LOG_LEVEL as AppConfig['logLevel']) || 'info',
      serviceWorker: {
        enabled: process.env.REACT_APP_SW_ENABLED !== 'false',
      },
      cache: {
        duration: parseInt(process.env.REACT_APP_CACHE_DURATION || '3600000', 10),
        offlineSize: parseInt(process.env.REACT_APP_OFFLINE_CACHE_SIZE || '50', 10),
      },
    };
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  public get(key: keyof AppConfig): any {
    return this.config[key];
  }

  public isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  public isStaging(): boolean {
    return this.config.environment === 'staging';
  }

  public isProduction(): boolean {
    return this.config.environment === 'production';
  }

  public isDebugEnabled(): boolean {
    return this.config.debug;
  }

  public getLogLevel(): AppConfig['logLevel'] {
    return this.config.logLevel;
  }

  public getCacheDuration(): number {
    return this.config.cache.duration;
  }

  public getOfflineCacheSize(): number {
    return this.config.cache.offlineSize;
  }

  public isServiceWorkerEnabled(): boolean {
    return this.config.serviceWorker.enabled;
  }

  // Runtime configuration updates (for Docker environments)
  public updateConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

export const envConfig = new EnvironmentConfig();

// Logger utility based on environment
export class Logger {
  private static shouldLog(level: AppConfig['logLevel']): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevel = envConfig.getLogLevel();
    return levels.indexOf(level) >= levels.indexOf(currentLevel);
  }

  static debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug('[DEBUG]', ...args);
    }
  }

  static info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info('[INFO]', ...args);
    }
  }

  static warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  }

  static error(...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error('[ERROR]', ...args);
    }
  }
}

// Performance monitoring utility
export class PerformanceMonitor {
  private static marks: Map<string, number> = new Map();

  static mark(name: string): void {
    if (envConfig.isDebugEnabled() && 'performance' in window) {
      this.marks.set(name, performance.now());
    }
  }

  static measure(name: string, startMark: string): number | null {
    if (envConfig.isDebugEnabled() && 'performance' in window) {
      const startTime = this.marks.get(startMark);
      if (startTime !== undefined) {
        const duration = performance.now() - startTime;
        Logger.debug(`Performance: ${name} took ${duration.toFixed(2)}ms`);
        return duration;
      }
    }
    return null;
  }

  static clearMarks(): void {
    this.marks.clear();
    if ('performance' in window && performance.clearMarks) {
      performance.clearMarks();
    }
  }
}