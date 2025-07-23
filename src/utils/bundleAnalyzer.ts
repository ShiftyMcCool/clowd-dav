// Bundle analysis utility for production optimization

import React from 'react';
import { envConfig, Logger } from '../config/environment';

export class BundleAnalyzer {
  private static loadTimes: Map<string, number> = new Map();

  // Track component load times
  static trackComponentLoad(componentName: string, startTime: number): void {
    if (envConfig.isDebugEnabled()) {
      const loadTime = performance.now() - startTime;
      this.loadTimes.set(componentName, loadTime);
      Logger.debug(`Component ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
    }
  }

  // Get load time statistics
  static getLoadTimeStats(): { [key: string]: number } {
    const stats: { [key: string]: number } = {};
    this.loadTimes.forEach((time, component) => {
      stats[component] = time;
    });
    return stats;
  }

  // Report slow loading components
  static reportSlowComponents(threshold: number = 100): void {
    if (envConfig.isDebugEnabled()) {
      const slowComponents = Array.from(this.loadTimes.entries())
        .filter(([, time]) => time > threshold)
        .sort(([, a], [, b]) => b - a);

      if (slowComponents.length > 0) {
        Logger.warn('Slow loading components detected:');
        slowComponents.forEach(([component, time]) => {
          Logger.warn(`  ${component}: ${time.toFixed(2)}ms`);
        });
      }
    }
  }

  // Analyze bundle size (requires webpack-bundle-analyzer in development)
  static analyzeBundleSize(): void {
    if (envConfig.isDevelopment()) {
      Logger.info('To analyze bundle size, run: npm run analyze');
    }
  }

  // Memory usage monitoring
  static monitorMemoryUsage(): void {
    if (envConfig.isDebugEnabled() && 'memory' in performance) {
      const memory = (performance as any).memory;
      Logger.debug('Memory usage:', {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
      });
    }
  }

  // Performance observer for long tasks
  static observeLongTasks(): void {
    if (envConfig.isDebugEnabled() && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 50) { // Tasks longer than 50ms
              Logger.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`);
            }
          });
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        Logger.debug('Long task observer not supported');
      }
    }
  }

  // Initialize all monitoring
  static initialize(): void {
    if (envConfig.isDebugEnabled()) {
      this.observeLongTasks();
      
      // Monitor memory usage every 30 seconds
      setInterval(() => {
        this.monitorMemoryUsage();
      }, 30000);

      // Report slow components after 10 seconds
      setTimeout(() => {
        this.reportSlowComponents();
      }, 10000);
    }
  }
}

// Higher-order component for tracking component load times
export function withLoadTimeTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  return function TrackedComponent(props: P) {
    const startTime = performance.now();
    
    React.useEffect(() => {
      BundleAnalyzer.trackComponentLoad(componentName, startTime);
    }, [startTime]);

    return React.createElement(WrappedComponent, props);
  };
}