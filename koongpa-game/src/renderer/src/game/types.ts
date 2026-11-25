export type DnaType = 'POWER' | 'SPEED' | 'BALANCE'
export type WeaponType = 'FIST' | 'STAFF' | 'SWORD'
export type FightResult = 'win' | 'lose'
export type ControlAction =
  | 'left'
  | 'right'
  | 'jump'
  | 'crouch'
  | 'punchShort'
  | 'punchMedium'
  | 'punchLong'
  | 'kickShort'
  | 'kickMedium'
  | 'kickLong'
  | 'special'
  | 'transform'

export interface FighterHud {
  playerHp: number
  playerMaxHp: number
  enemyHp: number
  enemyMaxHp: number
  gauge: number
  transformedSeconds: number
  combo: number
  maxCombo: number
  damageDealt: number
  playerName: string
}

export interface GameSceneCallbacks {
  onHud: (hud: FighterHud) => void
  onResult: (result: FightResult) => void
  onReady: (scene: import('./ArenaScene').ArenaScene) => void
}
