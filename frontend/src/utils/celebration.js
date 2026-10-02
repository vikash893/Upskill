import confetti from 'canvas-confetti'

const celebrationColors = ['#0C2C48', '#C69A4A', '#F4D06F', '#E76F51', '#2A9D8F', '#FFFFFF']
const notes = [523.25, 659.25, 783.99, 1046.5]
let audioContext

export function prepareCelebrationAudio() {
  if (typeof window === 'undefined') return

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    audioContext ||= new AudioContextClass()
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {})
    }
  } catch {
    audioContext = null
  }
}

function playCelebrationSound() {
  prepareCelebrationAudio()
  if (!audioContext) return

  const playNotes = () => {
    const start = audioContext.currentTime + 0.02

    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator()
      const volume = audioContext.createGain()
      const noteStart = start + index * 0.11
      const noteEnd = noteStart + 0.32

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, noteStart)
      volume.gain.setValueAtTime(0.0001, noteStart)
      volume.gain.linearRampToValueAtTime(0.055, noteStart + 0.035)
      volume.gain.exponentialRampToValueAtTime(0.0001, noteEnd)
      oscillator.connect(volume)
      volume.connect(audioContext.destination)
      oscillator.start(noteStart)
      oscillator.stop(noteEnd)
    })
  }

  if (audioContext.state === 'running') {
    playNotes()
  } else {
    audioContext.resume().then(playNotes).catch(() => {})
  }
}

export function celebrate() {
  if (typeof window === 'undefined') return

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  confetti({
    particleCount: reducedMotion ? 42 : 100,
    spread: reducedMotion ? 58 : 76,
    startVelocity: reducedMotion ? 28 : 43,
    gravity: 0.9,
    ticks: reducedMotion ? 100 : 180,
    origin: { x: 0.5, y: 0.66 },
    colors: celebrationColors,
    disableForReducedMotion: true,
  })

  if (!reducedMotion) {
    window.setTimeout(() => {
      confetti({
        particleCount: 48,
        angle: 62,
        spread: 58,
        startVelocity: 38,
        origin: { x: 0.04, y: 0.72 },
        colors: celebrationColors,
      })
      confetti({
        particleCount: 48,
        angle: 118,
        spread: 58,
        startVelocity: 38,
        origin: { x: 0.96, y: 0.72 },
        colors: celebrationColors,
      })
    }, 140)
  }

  playCelebrationSound()
}