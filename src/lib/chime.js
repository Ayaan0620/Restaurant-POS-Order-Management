// A pleasant two-note BELL chime via the Web Audio API (no audio file needed).
// Bells are inharmonic — we stack a few partials at bell-like ratios, each with
// a fast attack and a long exponential decay, then play two notes (ding-dong).
// Must be created inside a user gesture so the browser allows audio.
export function makeChime() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const master = ctx.createGain()
  master.gain.value = 0.9
  master.connect(ctx.destination)

  // Bell partials: [frequency ratio, relative gain].
  const PARTIALS = [
    [1.0, 1.0],
    [2.0, 0.55],
    [2.41, 0.35],
    [2.95, 0.2],
    [4.1, 0.12],
    [5.43, 0.07],
  ]

  function strike(at, f0, dur, vol) {
    for (const [r, g] of PARTIALS) {
      const osc = ctx.createOscillator()
      const env = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = f0 * r
      osc.connect(env)
      env.connect(master)
      const peak = Math.max(0.0001, vol * g)
      env.gain.setValueAtTime(0.0001, at)
      env.gain.exponentialRampToValueAtTime(peak, at + 0.004) // quick strike
      env.gain.exponentialRampToValueAtTime(0.0001, at + dur) // long ring-out
      osc.start(at)
      osc.stop(at + dur + 0.05)
    }
  }

  return {
    // Resolve once the context is actually running (call inside a click/tap).
    unlock() {
      return ctx.state === 'suspended' ? ctx.resume() : Promise.resolve()
    },
    beep() {
      try {
        if (ctx.state === 'suspended') ctx.resume()
        const t = ctx.currentTime + 0.03
        strike(t, 987.77, 1.6, 0.9) // ding  (B5)
        strike(t + 0.3, 659.25, 1.9, 0.9) // dong (E5)
      } catch {
        /* ignore audio failures */
      }
      try {
        navigator.vibrate?.([150, 80, 150])
      } catch {
        /* ignore */
      }
    },
  }
}
