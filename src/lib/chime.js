// ============================================================================
// New-order bell (Web Audio, no asset file).
//
// Browsers block audio until the user interacts with the page ONCE (autoplay
// policy). We can't avoid that gesture — but we make it the user's normal first
// interaction (typing the PIN / tapping the screen), captured globally. After
// that first gesture, every new order rings automatically with no extra tap.
// ============================================================================

let sharedCtx = null
let armed = false
const readyListeners = new Set()

function getCtx() {
  if (!sharedCtx) sharedCtx = new (window.AudioContext || window.webkitAudioContext)()
  return sharedCtx
}

export function isAudioReady() {
  return armed
}

// Notified once audio becomes usable (so UI can drop any "enable sound" hint).
export function onAudioReady(fn) {
  readyListeners.add(fn)
  return () => readyListeners.delete(fn)
}

function markReady() {
  if (armed) return
  armed = true
  readyListeners.forEach((f) => {
    try {
      f()
    } catch {
      /* ignore */
    }
  })
}

// Resume the audio context — only effective inside a user gesture.
export function unlockAudio() {
  try {
    const c = getCtx()
    if (c.state === 'suspended') c.resume()
    markReady()
  } catch {
    /* ignore */
  }
}

// Install ONE set of global first-gesture listeners that unlock audio. Idempotent.
let installed = false
export function installAudioUnlock() {
  if (installed) return
  installed = true
  const handler = () => unlockAudio()
  window.addEventListener('pointerdown', handler, { passive: true })
  window.addEventListener('keydown', handler)
  window.addEventListener('touchstart', handler, { passive: true })
}

// Play the two-note bell chime (ding-dong) with bell-like overtones.
export function playChime() {
  try {
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()
    const master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)

    const PARTIALS = [
      [1.0, 1.0],
      [2.0, 0.55],
      [2.41, 0.35],
      [2.95, 0.2],
      [4.1, 0.12],
      [5.43, 0.07],
    ]
    const strike = (at, f0, dur, vol) => {
      for (const [r, g] of PARTIALS) {
        const osc = ctx.createOscillator()
        const env = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = f0 * r
        osc.connect(env)
        env.connect(master)
        const peak = Math.max(0.0001, vol * g)
        env.gain.setValueAtTime(0.0001, at)
        env.gain.exponentialRampToValueAtTime(peak, at + 0.004)
        env.gain.exponentialRampToValueAtTime(0.0001, at + dur)
        osc.start(at)
        osc.stop(at + dur + 0.05)
      }
    }
    const t = ctx.currentTime + 0.03
    strike(t, 987.77, 1.6, 0.9) // ding (B5)
    strike(t + 0.3, 659.25, 1.9, 0.9) // dong (E5)
  } catch {
    /* ignore audio failures */
  }
  try {
    navigator.vibrate?.([150, 80, 150])
  } catch {
    /* ignore */
  }
}
