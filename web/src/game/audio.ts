// Sound playback for the six original effects. The original used Director
// sound channels 1-6 with per-channel volume (0-255); we approximate with
// pooled HTMLAudio elements.

const SND = (n: string) => `${import.meta.env.BASE_URL}games/castle-conquest/sounds/${n}`;

const FILES: Record<string, string> = {
  boompoof: SND("boompoof_sound.wav"),
  crank: SND("crank_sound.wav"),
  rockHit: SND("rockHit_sound.wav"),
  groundHit: SND("groundHit_sound.wav"),
  hitGreat: SND("hitGreat_sound.mp3"),
  hitBad: SND("hitBad_sound.mp3"),
};

export class AudioBank {
  enabled = true;
  private pool: Record<string, HTMLAudioElement[]> = {};
  private crankEl: HTMLAudioElement | null = null;

  play(name: keyof typeof FILES, volume255 = 255) {
    if (!this.enabled) return;
    const list = (this.pool[name] ??= []);
    let el = list.find((a) => a.paused || a.ended);
    if (!el) {
      if (list.length >= 4) return;
      el = new Audio(FILES[name]);
      list.push(el);
    }
    el.volume = Math.max(0, Math.min(1, volume255 / 255));
    el.currentTime = 0;
    void el.play().catch(() => {});
  }

  /** looping crank while aiming (channel 3 in the original) */
  startCrank() {
    if (!this.enabled) return;
    if (!this.crankEl) {
      this.crankEl = new Audio(FILES.crank);
      this.crankEl.loop = true;
    }
    this.crankEl.volume = 0.78;
    if (this.crankEl.paused) void this.crankEl.play().catch(() => {});
  }

  stopCrank() {
    if (this.crankEl && !this.crankEl.paused) this.crankEl.pause();
  }

  stopAll() {
    this.stopCrank();
    for (const list of Object.values(this.pool)) for (const a of list) a.pause();
  }
}
