// Manages iOS Safari Screen Wake Lock so phone doesn't sleep while driving

class WakeLockManager {
  private sentinel: WakeLockSentinel | null = null;
  private isSupported = false;

  constructor() {
    if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
      this.isSupported = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !this.sentinel) {
          this.requestLock();
        }
      });
    }
  }

  public async requestLock(): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      this.sentinel = await navigator.wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
      });
      return true;
    } catch {
      return false;
    }
  }

  public releaseLock() {
    if (this.sentinel) {
      this.sentinel.release().catch(() => {});
      this.sentinel = null;
    }
  }

  public hasActiveLock(): boolean {
    return this.sentinel !== null;
  }
}

export const wakeLockManager = new WakeLockManager();
