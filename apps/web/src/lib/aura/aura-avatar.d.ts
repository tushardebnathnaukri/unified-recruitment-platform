// Types for the vendored avatar-kit Aura (plain JS, not type-checked here).

export type AuraState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "sleeping"
  | "error"

export type AuraEmotion = "happy" | "excited" | "sad" | "surprised" | "confused"

export class AuraAvatar {
  constructor(
    container: HTMLElement,
    options?: {
      followPointer?: boolean
      autoSpeak?: boolean
      maxPixelRatio?: number
    }
  )
  readonly state: AuraState
  setState(name: AuraState): void
  emote(name: AuraEmotion, options?: { duration?: number; intensity?: number }): void
  setEmotion(name: AuraEmotion | null, options?: { intensity?: number }): void
  setAudioLevel(level: number): void
  dispose(): void
}
