import type { CSSProperties, ReactElement } from 'react'

export interface SoftAuroraProps {
  speed?: number
  scale?: number
  brightness?: number
  color1?: string
  color2?: string
  noiseFrequency?: number
  noiseAmplitude?: number
  bandHeight?: number
  bandSpread?: number
  octaveDecay?: number
  layerOffset?: number
  colorSpeed?: number
  spectrum?: number
  tilt?: number
  enableMouseInteraction?: boolean
  mouseInfluence?: number
  clickPulse?: boolean
  intro?: boolean
  lightMode?: boolean
  opacity?: number
  className?: string
  style?: CSSProperties
}

declare const SoftAurora: (props: SoftAuroraProps) => ReactElement

export default SoftAurora
