// Cyberpunk Sound Effects and Procedural Synth BGM for Barricade: Cyber Grid

let bgmContext: AudioContext | null = null;
let musicVolumeNode: GainNode | null = null;
let bgmTimeout: any = null;
let currentChordIdx = 0;

// Low-frequency cyber pad chord notes (A minor / C major progression)
const CHORDS = [
  [55.00, 110.00, 164.81], // A1 (Sub), A2, E3 (Fifth)
  [65.41, 130.81, 196.00], // C2, C3, G3
  [48.99, 97.99, 146.83],  // G1, G2, D3
  [58.27, 116.54, 174.61]  // A#1, A#2, F3 (Dark shift)
];

/**
 * Procedurally schedules the next ambient synth pad chord.
 * Fades chords in/out slowly to create an infinite dark atmosphere.
 */
const scheduleNextChord = () => {
  if (!bgmContext || bgmContext.state === 'closed') return;

  try {
    const now = bgmContext.currentTime;
    const chord = CHORDS[currentChordIdx];

    const activeOscs: OscillatorNode[] = [];
    const chordGain = bgmContext.createGain();
    const filter = bgmContext.createBiquadFilter();

    // Create a low-pass filter to make it a warm, dark background growl
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 5.5);

    // Fade in and out
    chordGain.gain.setValueAtTime(0, now);
    chordGain.gain.linearRampToValueAtTime(0.3, now + 1.8);
    chordGain.gain.exponentialRampToValueAtTime(0.001, now + 5.8);

    chord.forEach((freq, idx) => {
      const osc = bgmContext!.createOscillator();
      // Triangle waves for lower harmonics, Sine for the fifth interval
      osc.type = idx === 2 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      // Subtle detuning for analog-chorus warmth
      osc.detune.setValueAtTime(idx * 4 - 4, now);
      osc.connect(filter);
      activeOscs.push(osc);
    });

    filter.connect(chordGain);
    chordGain.connect(musicVolumeNode!);

    // Start all oscillators
    activeOscs.forEach(o => o.start(now));
    // Stop them after fade out finishes
    activeOscs.forEach(o => o.stop(now + 6.0));

    // Shift to next chord in progression
    currentChordIdx = (currentChordIdx + 1) % CHORDS.length;

    // Trigger next chord 5.6s from now for a slight overlap
    bgmTimeout = setTimeout(scheduleNextChord, 5600);
  } catch (err) {
    console.error("Error scheduling BGM chord:", err);
  }
};

/**
 * Initializes and starts the background music loop.
 */
export const startBGM = () => {
  if (bgmContext) return;
  
  try {
    bgmContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    musicVolumeNode = bgmContext.createGain();

    const isMuted = localStorage.getItem('barricadeMusicMuted') === 'true';
    musicVolumeNode.gain.setValueAtTime(isMuted ? 0 : 0.06, bgmContext.currentTime);
    musicVolumeNode.connect(bgmContext.destination);

    currentChordIdx = 0;
    scheduleNextChord();
  } catch (e) {
    console.error("Failed to start procedural BGM synthesizer:", e);
  }
};

/**
 * Stops and tears down the procedural background music.
 */
export const stopBGM = () => {
  if (bgmTimeout) {
    clearTimeout(bgmTimeout);
    bgmTimeout = null;
  }
  if (bgmContext) {
    try {
      bgmContext.close();
    } catch (e) {}
    bgmContext = null;
    musicVolumeNode = null;
  }
};

/**
 * Mutes or unmutes the music channel instantly.
 */
export const toggleMusic = (mute: boolean) => {
  localStorage.setItem('barricadeMusicMuted', String(mute));
  if (musicVolumeNode && bgmContext) {
    musicVolumeNode.gain.setValueAtTime(mute ? 0 : 0.06, bgmContext.currentTime);
  } else if (!mute) {
    startBGM();
  }
};

/**
 * Synthesizes short retro SFX signals.
 */
export const playSound = (type: 'move' | 'wall' | 'win' | 'error') => {
  const isMuted = localStorage.getItem('barricadeSfxMuted') === 'true';
  if (isMuted) return;

  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'move') {
      // Futuristic laser blip
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'wall') {
      // Solid digital locking noise
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.setValueAtTime(360, now + 0.04);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'win') {
      // Arpeggiated digital triumph chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.24);
      gain.gain.linearRampToValueAtTime(0, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'error') {
      // Hacker denial warning buzz
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (e) {
    // Fail silently (browser audio restrictions or unsupported context)
  }
};
