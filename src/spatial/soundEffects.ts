// Synthesizes pleasant automotive chimes and haptic sounds via Web Audio API without any external files

class SoundManager {
  private ctx: AudioContext | null = null;
  private isEnabled = true;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * UI click feedback - Silenced as requested (all sounds removed except warning alarm)
   */
  public playClickSound() {
    // Disabled: only warning alarm sounds are permitted
  }

  /**
   * Warning alarm for upcoming Right-Before-Left (Rechts-vor-Links) yield
   * Dual-tone acoustic warning alarm for road safety
   */
  public playYieldAlert() {
    if (!this.isEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Tone 1: High-visibility warning alert frequency at 659 Hz (E5)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Tone 2: Harmonic resolving alert tone at 987 Hz (B5)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0.3, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.52);
  }

  /**
   * Lane guidance chime - Silenced as requested
   */
  public playLaneGuidanceChime() {
    // Disabled: only warning alarm sounds are permitted
  }

  /**
   * Speed zone notice - Silenced as requested
   */
  public playSpeedZoneNotice() {
    // Disabled: only warning alarm sounds are permitted
  }
}

export const soundManager = new SoundManager();
