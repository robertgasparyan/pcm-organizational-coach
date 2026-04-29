export type PCMType =
  | 'thinker'
  | 'persister'
  | 'harmonizer'
  | 'imaginer'
  | 'rebel'
  | 'promoter'

export interface StressSequence {
  degree1: string
  degree2: string
  degree3: string
  failurePattern: string
}

export interface PCMFloor {
  type: PCMType
  percentage: number
  isBase: boolean
  isPhase: boolean
  traits: string[]
}

export interface PCMProfile {
  id: string
  name: string
  role?: string
  department?: string
  createdAt: string
  updatedAt: string
  base: PCMType
  phase: PCMType
  floors: PCMFloor[]
  phaseStress: StressSequence
  baseStress: StressSequence
  perceptionFilters: {
    opinions: number
    reactions: number
    imagination: number
    actions: number
    sensations: number
    thoughts: number
  }
  interactionStyles: {
    democratic: number
    benevolent: number
    autocratic: number
    free: number
  }
  personalityParts: {
    computer: number
    comforter: number
    director: number
    emoter: number
  }
  communicationChannels: {
    requestive: number
    nurturative: number
    directive: number
    emotive: number
  }
  preferredEnvironment: {
    inGroup: number
    aloneOrPairs: number
    variousGroups: number
    alone: number
  }
  psychologicalNeeds: Array<{
    rank: number
    label: string
    percentage: number
  }>
  rawPdfName?: string
}
