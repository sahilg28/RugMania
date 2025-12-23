export type GamePhase = 'idle' | 'betting' | 'playing' | 'finished' | 'rugged' | 'won'

export type Difficulty = 3 | 4 | 5

export interface DoorState {
  index: number
  isRevealed: boolean
  isRug: boolean
  isSelected: boolean
}

export interface GameState {
  phase: GamePhase
  betAmount: number
  difficulty: Difficulty
  currentLevel: number
  multiplier: number
  doors: DoorState[]
  serverSeed?: string
  clientSeed?: string
  serverSeedHash?: string
  potentialWin: number
  actualPayout?: number
}

export interface LeaderboardEntry {
  rank: number
  address: string
  name?: string
  points: number
  games: number
  multiplier: number
}

export interface PlayerStats {
  totalGames: number
  totalWon: number
  totalLost: number
  highestMultiplier: number
  currentStreak: number
}
