import Phaser from 'phaser'
import powerImageUrl from '../../../../assets/processed/power.png?url'
import speedImageUrl from '../../../../assets/processed/speed.png?url'
import balanceImageUrl from '../../../../assets/processed/balance.png?url'
import rivalImageUrl from '../../../../assets/processed/rival.png?url'
import transformedPowerImageUrl from '../../../../assets/processed/power_transform.png?url'
import rooftopImageUrl from '../../../../assets/processed/stage_rooftop.png?url'
import weaponAtlasSvg from './assets/weapons.svg?raw'
import type {
  ControlAction,
  DnaType,
  FighterHud,
  FightResult,
  GameSceneCallbacks,
  WeaponType
} from './types'

const DESIGN_WIDTH = 1120
const DESIGN_HEIGHT = 630
const FIGHTER_IMAGES: Record<string, string> = {
  POWER: 'fighter-power',
  SPEED: 'fighter-speed',
  BALANCE: 'fighter-balance',
  RIVAL: 'fighter-rival'
}

const DNA_STATS: Record<DnaType, { label: string; color: number; speed: number; damage: number; hp: number }> = {
  POWER: { label: 'POWER', color: 0xf34b4f, speed: 270, damage: 1.22, hp: 130 },
  SPEED: { label: 'SPEED', color: 0x42aaff, speed: 370, damage: 0.92, hp: 95 },
  BALANCE: { label: 'BALANCE', color: 0xffca45, speed: 315, damage: 1, hp: 110 }
}

const CHARACTER_FORMS = [
  { id: 'cap', name: 'CAP', attack: 10, speed: 1, jump: 1, frames: 8 },
  { id: 'blonde', name: 'BLONDE', attack: 7, speed: 1.3, jump: 1, frames: 7 },
  { id: 'pharaoh', name: 'PHARAOH', attack: 15, speed: 0.8, jump: 1, frames: 7 },
  { id: 'fox', name: 'FOX', attack: 12, speed: 1, jump: 1.5, frames: 8 }
] as const
const PLAYER_FORM_ASSETS = import.meta.glob<string>(
  '../../../../assets/{cap,blonde,pharaoh,fox}/frame_*.png',
  { eager: true, query: '?url', import: 'default' }
)

const WEAPON_STATS: Record<WeaponType, { label: string; color: number; reach: number; damage: number }> = {
  FIST: { label: 'BARE KNUCKLES', color: 0xffdd8d, reach: 80, damage: 1 },
  STAFF: { label: 'STAR STAFF', color: 0x67f2d3, reach: 116, damage: 0.88 },
  SWORD: { label: 'COMET BLADE', color: 0xff8ad1, reach: 98, damage: 1.14 }
}

type AttackKind = 'light' | 'heavy' | 'special'
type ActorSide = 'player' | 'enemy'
type PlayerAttackAction = Exclude<ControlAction, 'left' | 'right' | 'jump' | 'crouch' | 'transform'>
type AttackFamily = 'punch' | 'kick' | 'special'

interface AttackProfile {
  kind: AttackKind
  family: AttackFamily
  duration: number
  cooldown: number
  damage: number
  reach: number
  lunge: number
  knockback: number
  cameraShakePx: number
  scale: number
  lockMovement: boolean
}

const PLAYER_ATTACK_ACTIONS: PlayerAttackAction[] = [
  'punchShort',
  'punchMedium',
  'punchLong',
  'kickShort',
  'kickMedium',
  'kickLong',
  'special'
]

const PLAYER_ATTACKS: Record<PlayerAttackAction, AttackProfile> = {
  punchShort: { kind: 'light', family: 'punch', duration: 120, cooldown: 200, damage: 5, reach: 85, lunge: 15, knockback: 0, cameraShakePx: 3, scale: 1, lockMovement: false },
  punchMedium: { kind: 'heavy', family: 'punch', duration: 180, cooldown: 350, damage: 9, reach: 125, lunge: 25, knockback: 15, cameraShakePx: 3, scale: 1, lockMovement: false },
  punchLong: { kind: 'heavy', family: 'punch', duration: 300, cooldown: 600, damage: 15, reach: 160, lunge: 40, knockback: 30, cameraShakePx: 4, scale: 1, lockMovement: true },
  kickShort: { kind: 'light', family: 'kick', duration: 120, cooldown: 200, damage: 6, reach: 90, lunge: 15, knockback: 0, cameraShakePx: 3, scale: 1, lockMovement: false },
  kickMedium: { kind: 'heavy', family: 'kick', duration: 180, cooldown: 350, damage: 10, reach: 130, lunge: 25, knockback: 15, cameraShakePx: 3, scale: 1, lockMovement: false },
  kickLong: { kind: 'heavy', family: 'kick', duration: 300, cooldown: 600, damage: 16, reach: 165, lunge: 40, knockback: 30, cameraShakePx: 4, scale: 1, lockMovement: true },
  special: { kind: 'special', family: 'special', duration: 500, cooldown: 3000, damage: 30, reach: 190, lunge: 60, knockback: 50, cameraShakePx: 8, scale: 1.5, lockMovement: true }
}

const GAME_ASSET_URLS = import.meta.glob<string>(
  [
    '../../../../assets/{power,speed,balance,rival}_{idle,punch,kick,hit,jump,transform}.png',
    '../../../../assets/processed/{power,speed,balance,rival}_{idle,punch,kick,hit,jump,transform}.png',
    '../../../../assets/frames/{power,speed,balance,rival}_{idle,punch,kick,hit,jump}_{01,02,03,04,05}.png'
  ],
  { eager: true, query: '?url', import: 'default' }
)

function gameAssetUrl(filename: string): string | undefined {
  const entries = Object.entries(GAME_ASSET_URLS)
  return entries.find(([path]) => path.replace(/\\/g, '/').endsWith(`/processed/${filename}`))?.[1]
    ?? entries.find(([path]) => path.replace(/\\/g, '/').endsWith(`/frames/${filename}`))?.[1]
    ?? entries.find(([path]) => path.replace(/\\/g, '/').endsWith(`/assets/${filename}`))?.[1]
}

const FINISHERS: Record<DnaType, string> = {
  POWER: 'METEOR FIST!',
  SPEED: 'FLASH RUSH!',
  BALANCE: 'NOVA PALM!'
}

interface Fighter {
  side: ActorSide
  x: number
  vx: number
  z: number
  vz: number
  hp: number
  maxHp: number
  facing: number
  speed: number
  damage: number
  color: number
  attackMs: number
  attackDuration: number
  attackKind: AttackKind
  attackProfile: AttackProfile | null
  attackHit: boolean
  attackReach: number
  attackPower: number
  attackStep: number
  hitstunMs: number
  knockdownMs: number
  attackCooldown: number
  combo: number
  comboUntil: number
  gauge: number
  transformingMs: number
  transformedMs: number
  attackPoseMs: number
  jumpMultiplier: number
  specialCooldown: number
  aiCooldown: number
  landingSquashMs: number
  crouching: boolean
  hitImageMs: number
  maxCombo: number
  damageDealt: number
  dustAt: number
  resultPose: 'victory' | 'defeat' | null
  sprite: Phaser.GameObjects.Image
  weaponArt?: Phaser.GameObjects.Image
  aura: Phaser.GameObjects.Graphics
  shadow: Phaser.GameObjects.Ellipse
}

export class ArenaScene extends Phaser.Scene {
  private readonly dna: DnaType
  private readonly weapon: WeaponType
  private readonly callbacks: GameSceneCallbacks
  private player!: Fighter
  private enemy!: Fighter
  private keys!: Record<ControlAction, Phaser.Input.Keyboard.Key>
  private readonly touchActions = new Set<ControlAction>()
  private readonly previousActions = new Set<ControlAction>()
  private elapsed = 0
  private hitStopMs = 0
  private fightStarted = false
  private fightStartMs = 1550
  private fightCueShown = false
  private ended = false
  private endingMs = 0
  private resultPending: FightResult | null = null
  private hudTimer = 0
  private musicStep = 0
  private currentForm = 0
  private notice?: Phaser.GameObjects.Text
  private comboText?: Phaser.GameObjects.Text
  private musicEvent?: Phaser.Time.TimerEvent
  private audioContext?: AudioContext
  private ownsAudioContext: boolean
  private musicEnabled = true
  private effectsEnabled = true
  private background?: Phaser.GameObjects.Image
  private worldWidth = 2600

  private get viewportWidth(): number {
    return this.scale.width || DESIGN_WIDTH
  }

  private get viewportHeight(): number {
    return this.scale.height || DESIGN_HEIGHT
  }

  private get floor(): number {
    return this.viewportHeight * 0.89
  }

  private get characterHeight(): number {
    return Math.max(220, Math.min(this.viewportHeight * 0.5, 460))
  }

  private resizeViewport(): void {
    const width = this.viewportWidth
    const height = this.viewportHeight
    this.background?.setPosition(width / 2, height / 2).setDisplaySize(width * 1.6, height)
    this.notice?.setPosition(width / 2, height * 0.35)
    this.comboText?.setPosition(width / 2, height * 0.54)
    this.cameras.main.setBounds(0, 0, this.worldWidth, height)
  }

  constructor(dna: DnaType, weapon: WeaponType, callbacks: GameSceneCallbacks, audioContext?: AudioContext) {
    super('ArenaScene')
    this.dna = dna
    this.weapon = weapon
    this.callbacks = callbacks
    this.audioContext = audioContext
    this.ownsAudioContext = !audioContext
  }

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error(`Failed to load game asset "${file.key}" from "${file.src}"`)
    })
    this.load.image('fighter-power', powerImageUrl)
    this.load.image('fighter-speed', speedImageUrl)
    this.load.image('fighter-balance', balanceImageUrl)
    this.load.image('fighter-rival', rivalImageUrl)
    this.load.image('fighter-power-transform', transformedPowerImageUrl)
    this.load.image('stage-rooftop', rooftopImageUrl)
    const characters = ['power', 'speed', 'balance', 'rival']
    const poses = ['idle', 'punch', 'kick', 'hit', 'jump']
    for (const character of characters) {
      for (const pose of poses) {
        const url = gameAssetUrl(`${character}_${pose}.png`)
        if (url) this.load.image(`fighter-${character}-${pose}`, url)
        for (let frame = 1; frame <= 5; frame += 1) {
          if (pose === 'jump' && frame > 2) continue
          if (pose === 'hit' && frame > 3) continue
          const frameUrl = gameAssetUrl(`${character}_${pose}_${String(frame).padStart(2, '0')}.png`)
          if (frameUrl) this.load.image(`fighter-${character}-${pose}-frame-${frame}`, frameUrl)
        }
      }
      if (character !== 'power') {
        const url = gameAssetUrl(`${character}_transform.png`)
        if (url) this.load.image(`fighter-${character}-transform`, url)
      }
    }
    for (const [path, url] of Object.entries(PLAYER_FORM_ASSETS)) {
      const match = path.replace(/\\/g, '/').match(/\/assets\/(cap|blonde|pharaoh|fox)\/frame_(\d+)\.png$/)
      if (match) this.load.image(`player-${match[1]}-${Number(match[2])}`, url)
    }
    this.load.svg('weapon-atlas', `data:image/svg+xml;base64,${btoa(weaponAtlasSvg)}`, { width: 160, height: 192 })
  }

  create(): void {
    const requiredTextures = [
      'fighter-power', 'fighter-speed', 'fighter-balance', 'fighter-rival', 'fighter-power-transform', 'stage-rooftop',
      'player-cap-1', 'player-blonde-1', 'player-pharaoh-1', 'player-fox-1'
    ]
    const missingTextures = requiredTextures.filter((key) => !this.textures.exists(key))
    if (missingTextures.length > 0) {
      console.error(`Required game images are missing: ${missingTextures.join(', ')}`)
      this.add
        .text(this.viewportWidth / 2, this.viewportHeight / 2, `이미지 로드 실패\n${missingTextures.join(', ')}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '24px',
          color: '#ffffff',
          align: 'center'
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
      this.callbacks.onReady(this)
      return
    }

    this.registerWeaponFrames()
    this.background = this.add
      .image(this.viewportWidth / 2, this.viewportHeight / 2, 'stage-rooftop')
      .setDisplaySize(this.viewportWidth * 1.6, this.viewportHeight)
      .setScrollFactor(0.2, 0)
      .setDepth(0)
    this.worldWidth = Math.max(2600, this.viewportWidth * 2.2)
    this.player = this.makeFighter(
      'player',
      this.worldWidth * 0.44,
      130,
      DNA_STATS.BALANCE.color,
      315,
      1
    )
    this.applyFormStats()
    this.enemy = this.makeFighter('enemy', this.worldWidth * 0.56, 112, 0xa977ff, 260, 0.92)
    this.player.facing = 1
    this.enemy.facing = -1

    this.keys = {
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      jump: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      crouch: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      punchShort: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      punchMedium: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.K),
      punchLong: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L),
      kickShort: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.U),
      kickMedium: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.I),
      kickLong: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.O),
      special: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M),
      transform: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.N)
    }

    this.notice = this.add
      .text(this.viewportWidth / 2, this.viewportHeight * 0.35, 'READY...', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '70px',
        color: '#ffffff',
        stroke: '#273268',
        strokeThickness: 12
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)

    this.comboText = this.add
      .text(this.viewportWidth / 2, this.viewportHeight * 0.54, '', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '72px',
        color: '#ffe56d',
        stroke: '#5e2987',
        strokeThickness: 12
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setAlpha(0)

    this.scale.on('resize', this.resizeViewport, this)
    this.callbacks.onReady(this)
    this.emitHud()
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdownAudio, this)
  }

  update(_time: number, deltaMs: number): void {
    const delta = Math.min(deltaMs, 40)
    this.elapsed += delta

    if (this.hitStopMs > 0) {
      this.hitStopMs -= delta
      return
    }

    if (this.ended) {
      this.updateEnding(delta)
      return
    }

    if (!this.fightStarted) this.updateFightIntro(delta)

    if (this.fightStarted) {
      this.updateFighterTimers(this.player, delta)
      this.updateFighterTimers(this.enemy, delta)
      this.updatePlayer(delta)
      this.updateEnemy(delta)
      this.resolveAttack(this.player, this.enemy, delta)
      if (!this.ended) {
        this.resolveAttack(this.enemy, this.player, delta)
        this.player.facing = this.player.x <= this.enemy.x ? 1 : -1
        this.enemy.facing = -this.player.facing
      }
    }

    this.updateFighterVisual(this.player)
    this.updateFighterVisual(this.enemy)
    this.updateCamera()
    this.hudTimer += delta
    if (this.hudTimer >= 80) {
      this.hudTimer = 0
      this.emitHud()
    }
  }

  setTouchAction(action: ControlAction, isDown: boolean): void {
    if (isDown) this.touchActions.add(action)
    else this.touchActions.delete(action)
  }

  setAudioOptions(musicEnabled: boolean, effectsEnabled: boolean): void {
    this.musicEnabled = musicEnabled
    this.effectsEnabled = effectsEnabled
    if (!musicEnabled) this.stopMusic()
    else if (this.fightStarted && !this.ended) this.startMusic()
  }

  setAudioContext(context: AudioContext | null): void {
    if (!context || context.state === 'closed' || context === this.audioContext) return
    if (this.ownsAudioContext && this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.close().catch((error: unknown) => console.warn('Scene Web Audio could not close:', error))
    }
    this.audioContext = context
    this.ownsAudioContext = false
  }

  private shutdownAudio(): void {
    this.stopMusic()
    if (this.ownsAudioContext && this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.close().catch((error: unknown) => console.warn('Scene Web Audio could not close:', error))
    }
    this.audioContext = undefined
  }

  private makeFighter(
    side: ActorSide,
    x: number,
    hp: number,
    color: number,
    speed: number,
    damage: number
  ): Fighter {
    const shadow = this.add.ellipse(x, this.floor, 72, 18, 0x080c20, 0.38).setDepth(2)
    const aura = this.add.graphics().setDepth(3)
    const textureKey = side === 'enemy' ? FIGHTER_IMAGES.RIVAL : `player-${CHARACTER_FORMS[this.currentForm].id}-1`
    const sprite = this.add.image(x, this.floor, textureKey).setOrigin(0.5, 1).setDepth(4)
    sprite.setScale(this.characterHeight / this.textures.get(textureKey).getSourceImage().height)
    const weaponArt = side === 'player' && this.weapon !== 'FIST'
      ? this.add
          .image(x, this.floor, 'weapon-atlas', this.weapon === 'STAFF' ? 'staff' : 'sword')
          .setOrigin(0.5, 0.82)
          .setScale(0.58)
          .setDepth(5)
          .setVisible(false)
      : undefined
    return {
      side,
      x,
      vx: 0,
      z: 0,
      vz: 0,
      hp,
      maxHp: hp,
      facing: 1,
      speed,
      damage,
      color,
      attackMs: 0,
      attackDuration: 0,
      attackKind: 'light',
      attackProfile: null,
      attackHit: true,
      attackReach: 0,
      attackPower: 0,
      attackStep: 1,
      hitstunMs: 0,
      knockdownMs: 0,
      attackCooldown: 0,
      combo: 0,
      comboUntil: 0,
      gauge: 0,
      transformingMs: 0,
      transformedMs: 0,
      attackPoseMs: 0,
      jumpMultiplier: 1,
      specialCooldown: 0,
      aiCooldown: 800,
      landingSquashMs: 0,
      crouching: false,
      hitImageMs: 0,
      maxCombo: 0,
      damageDealt: 0,
      dustAt: 0,
      resultPose: null,
      sprite,
      weaponArt,
      aura,
      shadow
    }
  }

  private updatePlayer(delta: number): void {
    const left = this.isDown('left')
    const right = this.isDown('right')
    const jumpPressed = this.wasJustPressed('jump')
    const transformPressed = this.wasJustPressed('transform')
    const attackPressed = PLAYER_ATTACK_ACTIONS.filter((action) => this.wasJustPressed(action))
    const move = (right ? 1 : 0) - (left ? 1 : 0)
    const canAct = this.player.hitstunMs <= 0 && this.player.knockdownMs <= 0 && this.player.transformingMs <= 0
    if (canAct) {
      const movementLocked = this.player.attackMs > 0 && this.player.attackProfile?.lockMovement === true
      this.player.crouching = this.isDown('crouch') && this.player.z === 0 && this.player.attackMs <= 0
      const desiredVelocity = movementLocked ? 0 : move * this.player.speed
      const easing = 1 - Math.exp(-(move === 0 ? 24 : 18) * delta / 1000)
      this.player.vx = movementLocked ? 0 : Phaser.Math.Linear(this.player.vx, desiredVelocity, easing)

      if (jumpPressed && this.player.z === 0) {
        this.player.vz = 660 * this.player.jumpMultiplier
        this.playJumpSound()
      }
      if (this.player.attackMs <= 0 && this.player.attackCooldown <= 0 && attackPressed.length > 0) {
        const action = attackPressed[0]
        this.startAttack(this.player, PLAYER_ATTACKS[action].kind, PLAYER_ATTACKS[action])
      }
      if (transformPressed) this.transformPlayer()
    } else {
      this.player.crouching = false
    }
    this.moveFighter(this.player, delta)
  }

  private updateEnemy(delta: number): void {
    const dx = this.player.x - this.enemy.x
    const distance = Math.abs(dx)
    if (this.enemy.hitstunMs <= 0 && this.enemy.knockdownMs <= 0) {
      if (distance > 60 && this.enemy.transformingMs <= 0 && this.enemy.attackMs <= 0) {
        const desiredVelocity = Math.sign(dx) * this.enemy.speed
        this.enemy.vx = Phaser.Math.Linear(this.enemy.vx, desiredVelocity, 1 - Math.exp(-18 * delta / 1000))
      } else {
        this.enemy.vx = Phaser.Math.Linear(this.enemy.vx, 0, 1 - Math.exp(-24 * delta / 1000))
      }
      this.enemy.aiCooldown = Math.max(0, this.enemy.aiCooldown - delta)
      if (distance <= 60 && this.enemy.aiCooldown === 0 && this.enemy.attackMs <= 0) {
        this.startAttack(this.enemy, Math.random() < 0.5 ? 'heavy' : 'light')
        this.enemy.aiCooldown = 800
      }
    }
    this.moveFighter(this.enemy, delta)
  }

  private moveFighter(fighter: Fighter, delta: number): void {
    const seconds = delta / 1000
    const wasAirborne = fighter.z > 0
    if (fighter.hitstunMs > 0 || fighter.knockdownMs > 0) fighter.vx *= 0.86
    fighter.x = Phaser.Math.Clamp(fighter.x + fighter.vx * seconds, 32, this.worldWidth - 32)
    fighter.z = Math.max(0, fighter.z + fighter.vz * seconds)
    fighter.vz -= 1550 * seconds
    if (fighter.z === 0 && fighter.vz < 0) fighter.vz = 0
    if (wasAirborne && fighter.z === 0) {
      fighter.landingSquashMs = 180
      this.spawnDust(fighter.x, this.floor - 2, 1)
      this.cameras.main.shake(120, 0.005)
    }
    if (Math.abs(fighter.vx) > 90 && fighter.z === 0 && this.elapsed - fighter.dustAt > 190) {
      this.spawnDust(fighter.x - Math.sign(fighter.vx) * 20, this.floor - 2, 0.68)
      fighter.dustAt = this.elapsed
    }
    if (fighter.side === 'player') {
      if (fighter.x <= 34 || fighter.x >= this.worldWidth - 34) fighter.vx *= 0.55
    }
  }

  private updateFighterTimers(fighter: Fighter, delta: number): void {
    const wasAttacking = fighter.attackMs > 0
    fighter.transformingMs = Math.max(0, fighter.transformingMs - delta)
    fighter.attackCooldown = Math.max(0, fighter.attackCooldown - delta)
    fighter.attackMs = Math.max(0, fighter.attackMs - delta)
    if (wasAttacking && fighter.attackMs === 0) fighter.attackProfile = null
    fighter.attackPoseMs = Math.max(0, fighter.attackPoseMs - delta)
    fighter.hitstunMs = Math.max(0, fighter.hitstunMs - delta)
    fighter.hitImageMs = Math.max(0, fighter.hitImageMs - delta)
    fighter.knockdownMs = Math.max(0, fighter.knockdownMs - delta)
    fighter.specialCooldown = Math.max(0, fighter.specialCooldown - delta)
    fighter.transformedMs = Math.max(0, fighter.transformedMs - delta)
    fighter.landingSquashMs = Math.max(0, fighter.landingSquashMs - delta)
    if (fighter.comboUntil < this.elapsed) fighter.combo = 0
  }

  private startAttack(attacker: Fighter, kind: AttackKind, profile?: AttackProfile): void {
    if (
      attacker.attackMs > 0 ||
      attacker.attackCooldown > 0 ||
      attacker.hitstunMs > 0 ||
      attacker.knockdownMs > 0 ||
      attacker.transformingMs > 0
    ) return
    if (profile?.family === 'special' && (attacker.side !== 'player' || attacker.specialCooldown > 0)) return

    const weapon = attacker.side === 'player' ? WEAPON_STATS[this.weapon] : WEAPON_STATS.FIST
    const duration = profile?.duration ?? (kind === 'light' ? 390 : kind === 'heavy' ? 690 : 820)
    const baseDamage = profile?.damage ?? (kind === 'light' ? 12 : kind === 'heavy' ? 22 : 36)
    const formMultiplier = attacker.side === 'player' ? attacker.damage : 1
    const specialMultiplier = profile?.family === 'special' ? 2 : 1
    const power = profile
      ? baseDamage * formMultiplier * specialMultiplier
      : baseDamage * attacker.damage * weapon.damage

    attacker.attackStep = 1
    attacker.attackProfile = profile ?? null
    attacker.attackMs = duration
    attacker.attackDuration = duration
    attacker.attackKind = kind
    attacker.attackHit = false
    attacker.attackReach = profile?.reach ?? weapon.reach + (kind === 'special' ? 30 : kind === 'heavy' ? 8 : 0)
    attacker.attackPower = power
    attacker.attackCooldown = profile?.cooldown ?? (kind === 'light' ? duration * 0.68 : duration)
    if (attacker.side === 'player' && (profile?.family === 'punch' || profile?.family === 'kick')) {
      attacker.attackPoseMs = 200
    }
    if (profile?.family === 'special') {
      attacker.specialCooldown = 3000
      if (attacker.side === 'player') {
        this.cameras.main.flash(this.currentForm === 3 ? 500 : 260, 255, 255, 255)
        if (this.currentForm === 3) {
          this.flashNotice('FOX TAIL SPIN!', '#ffb55e')
          this.spawnFoxTailSpin(attacker)
        }
      }
    }
    if (profile) {
      if (profile.lockMovement) attacker.vx = 0
      this.playAttackSound(profile.family)
    } else {
      this.playHitSound(kind)
    }
    if (kind === 'special' && attacker.side === 'player') this.flashNotice(FINISHERS[this.dna], '#a6f8ff')
  }

  private resolveAttack(attacker: Fighter, target: Fighter, delta: number): void {
    if (attacker.attackHit || attacker.attackDuration <= 0) return
    const elapsedAttack = attacker.attackDuration - attacker.attackMs
    const hitMoment = attacker.attackDuration * (attacker.attackKind === 'light' ? 0.44 : attacker.attackKind === 'heavy' ? 0.55 : 0.62)
    if (elapsedAttack < hitMoment || attacker.attackMs <= 0) return
    attacker.attackHit = true

    const attackLunge = attacker.attackProfile
      ? attacker.attackProfile.lunge * Math.sin((elapsedAttack / attacker.attackDuration) * Math.PI)
      : 0
    const attackX = attacker.x + attacker.facing * attackLunge
    const dx = target.x - attackX
    const inFront = dx * attacker.facing >= -18
    const inRange = Math.abs(dx) <= attacker.attackReach && Math.abs(target.z - attacker.z) < 150
    if (!inFront || !inRange || target.hp <= 0) return

    const wallBonus = target.x < 130 || target.x > this.worldWidth - 130
    const airCombo = attacker.side === 'player' && attacker.z > 40
    const downAttack = attacker.side === 'player' && target.knockdownMs > 0 && attacker.z < 24
    const rawDamage = attacker.attackProfile
      ? Math.round(attacker.attackPower)
      : Math.round(attacker.attackPower * (airCombo ? 1.18 : 1) * (downAttack ? 1.22 : 1) * (wallBonus ? 1.16 : 1))
    const guarding = target.side === 'player' && target.crouching && target.z === 0
    const appliedDamage = Math.max(1, Math.round(rawDamage * (guarding ? 0.5 : 1)))
    target.hp = Math.max(0, target.hp - appliedDamage)
    target.hitstunMs = guarding ? 80 : attacker.attackProfile ? 300 : 200
    target.hitImageMs = 300
    target.knockdownMs = guarding || attacker.attackProfile ? 0 : attacker.attackKind === 'light' ? 0 : 680
    target.vx = guarding
      ? 0
      : attacker.attackProfile
        ? attacker.facing * attacker.attackProfile.knockback * 8.4
        : attacker.facing * (attacker.attackKind === 'light' ? 250 : 410)
    target.vz = guarding || attacker.attackProfile ? 0 : airCombo ? 245 : attacker.attackKind === 'light' ? 70 : 180

    if (attacker.side === 'player') {
      attacker.gauge = Math.min(100, attacker.gauge + 10)
      attacker.combo += 1
      attacker.maxCombo = Math.max(attacker.maxCombo, attacker.combo)
      attacker.damageDealt += appliedDamage
      attacker.comboUntil = this.elapsed + 2000
      this.showCombo(attacker.combo)
    }
    if (target.side === 'player') target.gauge = Math.min(100, target.gauge + 5)

    this.hitStopMs = guarding ? 45 : 60
    const shakePx = attacker.attackProfile?.cameraShakePx ?? (attacker.attackKind === 'light' ? 3 : 6)
    this.cameras.main.shake(guarding ? 110 : 190, shakePx / this.viewportWidth)
    this.spawnImpact(target.x, this.floor - target.z - 55, attacker.color)
    if (attacker.attackProfile?.family === 'special') this.spawnSpecialExplosion(target.x, this.floor - target.z - 55)
    this.floatDamage(target.x, this.floor - target.z - 115, appliedDamage, attacker.attackKind)
    if (wallBonus && attacker.side === 'player') this.flashNotice('WALL COMBO!', '#80f5ff')
    else if (downAttack) this.flashNotice('DOWN ATTACK!', '#ffbd80')
    else if (airCombo) this.flashNotice('AIR COMBO!', '#8df2ff')
    if (guarding) this.flashNotice('GUARD · 50%', '#9cf5ff')
    this.playHitReactSound()

    if (target.hp <= 0) this.finish(attacker.side === 'player' ? 'win' : 'lose')
    this.emitHud()
    target.facing = -attacker.facing
    void delta
  }

  private transformPlayer(): void {
    if (this.player.transformingMs > 0) return
    this.currentForm = (this.currentForm + 1) % CHARACTER_FORMS.length
    this.applyFormStats()
    this.player.vx = 0
    this.player.transformedMs = 0
    this.player.transformingMs = 500
    this.player.attackPoseMs = 0
    this.transformBurst(this.player, true)
    this.cameras.main.flash(500, 255, 255, 255)
    this.cameras.main.shake(300, 0.014)
    this.flashNotice(this.currentForm === 3 ? 'FOX MODE!' : '변신!', '#ffffff')
    this.playTransformSound()
    this.emitHud()
  }

  private applyFormStats(): void {
    const form = CHARACTER_FORMS[this.currentForm]
    this.player.speed = 315 * form.speed
    this.player.damage = form.attack / 10
    this.player.jumpMultiplier = form.jump
  }

  private transformBurst(fighter: Fighter, charging = false): void {
    const x = fighter.x
    const y = this.floor - fighter.z - 62
    const color = 0xffdf62
    const ring = this.add.circle(x, y, 22, color, 0.16).setStrokeStyle(charging ? 7 : 9, color, 0.95).setDepth(55)
    this.tweens.add({
      targets: ring,
      radius: 150,
      scale: 1.8,
      alpha: 0,
      duration: charging ? 850 : 600,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy()
    })

    for (let index = 0; index < 18; index += 1) {
      const angle = (Math.PI * 2 * index) / 18
      const distance = Phaser.Math.Between(90, 165)
      const spark = this.add.star(x, y, 5, 4, Phaser.Math.Between(10, 20), color).setDepth(56)
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        angle: Phaser.Math.Between(-220, 220),
        scale: { from: 0.2, to: 1.2 },
        alpha: 0,
        delay: charging ? Phaser.Math.Between(0, 360) : 0,
        duration: charging ? 480 : 390,
        ease: 'Cubic.Out',
        onComplete: () => spark.destroy()
      })
    }

    if (!charging) {
      this.cameras.main.flash(260, 255, 232, 127)
      this.playTransformSound()
    }
  }

  private finish(result: FightResult): void {
    if (this.ended) return
    this.ended = true
    this.endingMs = 2000
    this.resultPending = result
    this.touchActions.clear()
    this.stopMusic()
    this.player.vx = 0
    this.enemy.vx = 0
    const winner = result === 'win' ? this.player : this.enemy
    const loser = result === 'win' ? this.enemy : this.player
    winner.resultPose = 'victory'
    winner.knockdownMs = 0
    winner.vz = 420
    loser.resultPose = 'defeat'
    loser.knockdownMs = 2000
    loser.vz = 120
    this.notice?.setText('K.O.!')
    this.notice?.setColor(result === 'win' ? '#ffe56d' : '#ff8181')
    this.notice?.setAlpha(1).setScale(1.35)
    this.tweens.add({ targets: this.notice, scale: 1, duration: 350, ease: 'Back.Out' })
    this.cameras.main.shake(420, 0.022)
    this.playResultSound()
    this.emitHud()
  }

  private updateEnding(delta: number): void {
    this.updateFighterTimers(this.player, delta)
    this.updateFighterTimers(this.enemy, delta)
    this.moveFighter(this.player, delta)
    this.moveFighter(this.enemy, delta)
    this.updateFighterVisual(this.player)
    this.updateFighterVisual(this.enemy)
    this.updateCamera()
    this.endingMs -= delta
    if (this.endingMs <= 0 && this.resultPending) {
      this.callbacks.onResult(this.resultPending)
      this.resultPending = null
    }
  }

  private updateFightIntro(delta: number): void {
    this.fightStartMs -= delta
    if (!this.fightCueShown && this.fightStartMs <= 650) {
      this.fightCueShown = true
      this.notice?.setText('FIGHT!').setColor('#ffe56d').setScale(1.45).setAlpha(1)
      this.tweens.add({ targets: this.notice, scale: 1, duration: 280, ease: 'Back.Out' })
      this.cameras.main.shake(190, 0.009)
    }
    if (this.fightStartMs <= 0) {
      this.fightStarted = true
      this.notice?.setAlpha(0)
      this.startMusic()
    }
  }

  private registerWeaponFrames(): void {
    const weapons = this.textures.get('weapon-atlas')
    weapons.add('staff', 0, 0, 0, 80, 192)
    weapons.add('sword', 0, 80, 0, 80, 192)
  }

  private updateFighterVisual(fighter: Fighter): void {
    const sprite = fighter.sprite
    if (fighter.side === 'player') {
      const form = CHARACTER_FORMS[this.currentForm]
      const frame = fighter.attackPoseMs > 0
        ? form.frames
        : Math.floor(this.elapsed / 150) % form.frames + 1
      const textureKey = `player-${form.id}-${frame}`
      if (this.textures.exists(textureKey) && sprite.texture.key !== textureKey) sprite.setTexture(textureKey)
    }
    const transformed = fighter.transformedMs > 0
    const transforming = fighter.transformingMs > 0
    const moving = Math.abs(fighter.vx) > 24 && fighter.hitstunMs <= 0 && fighter.knockdownMs <= 0
    const airborne = fighter.z > 3
    const rising = fighter.vz > 20
    const character = 'rival'
    const baseTexture = fighter.side === 'enemy' ? FIGHTER_IMAGES.RIVAL : FIGHTER_IMAGES[this.dna]
    const attackFamily = fighter.attackProfile?.family === 'special'
      ? 'punch'
      : fighter.attackProfile?.family
      ?? (fighter.attackMs > 0 ? (fighter.attackKind === 'light' ? 'punch' : 'kick') : undefined)
    const pose = fighter.hitImageMs > 0
      ? 'hit'
      : airborne
        ? 'jump'
        : attackFamily
          ? attackFamily
          : 'idle'
    const transformedTexture = `fighter-${character}-transform`
    const motionTexture = `fighter-${character}-${pose}`
    const frameCount = pose === 'jump' ? 2 : pose === 'hit' ? 3 : 5
    const frameIndex = fighter.attackMs > 0
      ? Math.max(1, Math.min(frameCount, Math.floor((1 - fighter.attackMs / fighter.attackDuration) * frameCount) + 1))
      : pose === 'idle'
        ? Math.max(1, Math.floor(this.elapsed / 180) % frameCount + 1)
        : pose === 'jump'
          ? fighter.vz >= 0 ? 1 : 2
          : pose === 'hit'
            ? Math.max(1, Math.min(frameCount, Math.floor(fighter.hitImageMs / 100) + 1))
            : 1
    const animatedTexture = `fighter-${character}-${pose}-frame-${frameIndex}`
    const heroForm = transformed || transforming
    const textureKey = fighter.side === 'player'
      ? sprite.texture.key
      : this.textures.exists(animatedTexture)
      ? animatedTexture
      : (fighter.hitImageMs > 0 || fighter.attackMs > 0) && this.textures.exists(motionTexture)
        ? motionTexture
      : heroForm && this.textures.exists(transformedTexture)
        ? transformedTexture
        : this.textures.exists(motionTexture)
          ? motionTexture
          : baseTexture

    if (sprite.texture.key !== textureKey) sprite.setTexture(textureKey)

    const textureHeight = this.textures.get(textureKey).getSourceImage().height
    const attackElapsed = fighter.attackDuration - fighter.attackMs
    const attackProgress = fighter.attackMs > 0
      ? Phaser.Math.Clamp((fighter.attackDuration - fighter.attackMs) / fighter.attackDuration, 0, 1)
      : 0
    const attackDrive = fighter.attackMs > 0 ? Math.sin(attackProgress * Math.PI) : 0
    const punchDrive = fighter.attackMs > 0 && (fighter.attackProfile?.family === 'punch' || (!fighter.attackProfile && fighter.attackKind === 'light'))
      ? attackDrive
      : 0
    const lungeDistance = fighter.attackKind === 'light'
      ? [24, 31, 42][Math.max(0, Math.min(2, fighter.attackStep - 1))]
      : fighter.attackKind === 'heavy' ? 45 : 34
    const runCycle = moving ? Math.sin(this.elapsed / 58) : 0
    const idleBob = Math.sin((this.elapsed % 300) / 300 * Math.PI * 2) * 2
    const bob = moving ? Math.abs(runCycle) * 9 : !airborne && !fighter.crouching ? idleBob : 0
    const breathingScale = 1 + (Math.sin(this.elapsed / 420) + 1) * 0.015
    const transformationScale = transforming
      ? 1 + Math.sin(((500 - fighter.transformingMs) / 500) * Math.PI * 6) * 0.14
      : transformed ? 1.06 : 1
    const jumpScale = airborne ? (rising ? 1.15 : 0.9) : 1
    const landingSquash = fighter.landingSquashMs > 0
      ? 1 - (fighter.landingSquashMs / 180) * 0.14
      : 1
    const hitScale = fighter.hitstunMs > 0 ? 1.04 : 1
    const baseScale = this.characterHeight / textureHeight
    const lunge = fighter.attackMs > 0
      ? fighter.attackProfile
        ? attackDrive * fighter.attackProfile.lunge
        : attackDrive * lungeDistance
      : 0
    const knocked = fighter.knockdownMs > 0
    const spin = fighter.attackMs > 0 && (
      (fighter.side === 'player' && this.currentForm === 3 && fighter.attackProfile?.family === 'special') ||
      (!fighter.attackProfile && fighter.attackKind === 'heavy')
    ) ? attackProgress * Math.PI * 2 * fighter.facing : 0
    const runLean = moving ? Math.sign(fighter.vx) * (Math.PI / 36) : 0
    const legWobble = moving ? runCycle * 0.07 : 0
    const attackLean = fighter.attackProfile?.family === 'punch'
      ? fighter.facing * (Math.PI / 12) * attackDrive
      : fighter.attackProfile?.family === 'kick'
        ? fighter.facing * (Math.PI / 18) * attackDrive
        : 0
    const specialScale = fighter.attackProfile?.family === 'special' ? fighter.attackProfile.scale : 1
    const crouchScale = fighter.crouching ? 0.8 : 1
    const crouchOffset = fighter.crouching ? 10 : 0
    const bodyRotation = knocked || fighter.hitstunMs > 0
      ? -fighter.facing * (Math.PI / 18)
      : fighter.crouching
        ? -fighter.facing * 0.08
        : attackLean || (punchDrive > 0
          ? fighter.facing * (Math.PI / 12) * punchDrive
          : spin || runLean + legWobble)

    sprite
      .setPosition(fighter.x + fighter.facing * lunge, this.floor - fighter.z - bob + crouchOffset)
      .setScale(
        fighter.facing * baseScale * transformationScale * specialScale * (1 + attackDrive * 0.1) * (1 + Math.abs(runCycle) * 0.06) * (1 + punchDrive * 0.2),
        baseScale * transformationScale * specialScale * jumpScale * breathingScale * landingSquash * hitScale * crouchScale
      )
      .setRotation(bodyRotation)
      .setDepth(4)

    if (fighter.crouching) {
      sprite.setTint(0x9cf5ff)
    } else if (transforming && Math.floor(this.elapsed / 70) % 2 === 0) {
      sprite.setTint(0xffffff)
      sprite.setTintFill()
    } else if (fighter.hitstunMs > 0 && Math.floor(this.elapsed / 45) % 2 === 0) {
      sprite.setTint(0xffffff)
      sprite.setTintFill()
    } else {
      sprite.clearTint()
    }

    fighter.shadow
      .setPosition(fighter.x, this.floor + 4)
      .setScale(1 - Math.min(fighter.z / 900, 0.55), 0.82)
      .setAlpha(0.38 - Math.min(fighter.z / 1100, 0.22))

    fighter.aura.clear()
    if (transformed || transforming) {
      const pulse = 4 + Math.sin(this.elapsed / 85) * 5
      fighter.aura.fillStyle(0xffdb55, transforming ? 0.22 : 0.14)
      fighter.aura.fillCircle(fighter.x, this.floor - fighter.z - this.characterHeight * 0.52, 73 + pulse)
      fighter.aura.lineStyle(transforming ? 8 : 5, 0xffec8b, 0.74)
      fighter.aura.strokeCircle(fighter.x, this.floor - fighter.z - this.characterHeight * 0.52, 74 + pulse)
      fighter.aura.lineStyle(2, 0xfff0a5, 0.86)
      fighter.aura.strokeCircle(fighter.x, this.floor - fighter.z - this.characterHeight * 0.52, 88 + pulse)
    }

    if (fighter.weaponArt) {
      const weaponAngle = fighter.attackMs > 0 ? -0.55 + attackDrive * 1.9 : -0.2
      fighter.weaponArt
        .setVisible(true)
        .setPosition(fighter.x + fighter.facing * (34 + lunge), this.floor - fighter.z - this.characterHeight * 0.55)
        .setScale(fighter.facing * 0.58, 0.58)
        .setRotation(weaponAngle + spin)
    }
  }

  private updateCamera(): void {
    const center = Phaser.Math.Clamp(
      (this.player.x + this.enemy.x) / 2,
      this.viewportWidth / 2,
      this.worldWidth - this.viewportWidth / 2
    )
    this.cameras.main.scrollX = Phaser.Math.Linear(this.cameras.main.scrollX, center - this.viewportWidth / 2, 0.08)
  }

  private isDown(action: ControlAction): boolean {
    return this.keys[action].isDown || this.touchActions.has(action)
  }

  private wasJustPressed(action: ControlAction): boolean {
    const down = this.isDown(action)
    const previous = this.previousActions.has(action)
    if (down) this.previousActions.add(action)
    else this.previousActions.delete(action)
    return down && !previous
  }

  private emitHud(): void {
    const stats: FighterHud = {
      playerHp: this.player?.hp ?? 0,
      playerMaxHp: this.player?.maxHp ?? 1,
      enemyHp: this.enemy?.hp ?? 0,
      enemyMaxHp: this.enemy?.maxHp ?? 1,
      gauge: this.player?.gauge ?? 0,
      transformedSeconds: Math.ceil((this.player?.transformedMs ?? 0) / 1000),
      combo: this.player?.combo ?? 0,
      maxCombo: this.player?.maxCombo ?? 0,
      damageDealt: this.player?.damageDealt ?? 0,
      playerName: CHARACTER_FORMS[this.currentForm].name
    }
    this.callbacks.onHud(stats)
  }

  private showCombo(combo: number): void {
    if (!this.comboText || combo < 2) return
    const color = combo >= 5 ? '#ff5b5b' : '#fff079'
    this.comboText.setText(`${combo} HITS!`).setColor(color).setAlpha(1).setScale(1.8)
    this.tweens.killTweensOf(this.comboText)
    this.tweens.add({
      targets: this.comboText,
      scale: 1,
      alpha: { from: 1, to: 0 },
      duration: 740,
      ease: 'Back.Out'
    })
    this.cameras.main.shake(120, 0.006 + Math.min(combo, 8) * 0.0007)
  }

  private flashNotice(message: string, color: string): void {
    if (!this.notice || this.ended) return
    this.notice.setText(message).setColor(color).setAlpha(1).setScale(1.2)
    this.tweens.killTweensOf(this.notice)
    this.tweens.add({
      targets: this.notice,
      scale: 1,
      alpha: { from: 1, to: 0 },
      delay: 480,
      duration: 260
    })
  }

  private spawnImpact(x: number, y: number, color: number): void {
    const ring = this.add.circle(x, y, 12, color, 0.18).setStrokeStyle(4, 0xffe270, 0.96).setDepth(49)
    this.tweens.add({
      targets: ring,
      scale: { from: 0.4, to: 2.8 },
      alpha: { from: 1, to: 0 },
      duration: 330,
      onComplete: () => ring.destroy()
    })

    for (let index = 0; index < 3; index += 1) {
      const direction = index - 1
      const star = this.add.star(x + direction * 24, y + Math.abs(direction) * 9, 5, 5, 19, 0xfff0a3)
        .setDepth(52)
      this.tweens.add({
        targets: star,
        x: star.x + direction * 24,
        y: star.y - 36 - Math.abs(direction) * 12,
        angle: direction * 90,
        scale: { from: 0.45, to: 1.2 },
        alpha: 0,
        duration: 340,
        ease: 'Cubic.Out',
        onComplete: () => star.destroy()
      })
    }
  }

  private spawnSpecialExplosion(x: number, y: number): void {
    const explosion = this.add.circle(x, y, 28, 0xffdc4f, 0.82).setStrokeStyle(9, 0xfff3a5, 1).setDepth(58)
    this.tweens.add({
      targets: explosion,
      scale: 3.4,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.Out',
      onComplete: () => explosion.destroy()
    })
  }

  private spawnFoxTailSpin(fighter: Fighter): void {
    const tailSpin = this.add
      .ellipse(
        fighter.x - fighter.facing * 28,
        this.floor - fighter.z - this.characterHeight * 0.52,
        this.characterHeight * 0.8,
        this.characterHeight * 0.28,
        0xff963f,
        0.6
      )
      .setStrokeStyle(9, 0xffe7a5, 0.9)
      .setDepth(5)
    this.tweens.add({
      targets: tailSpin,
      angle: tailSpin.angle + 360,
      scale: 1.5,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.Out',
      onComplete: () => tailSpin.destroy()
    })
  }

  private spawnDust(x: number, y: number, intensity: number): void {
    for (let index = 0; index < 4; index += 1) {
      const puff = this.add.ellipse(
        x + Phaser.Math.Between(-18, 18),
        y - Phaser.Math.Between(1, 8),
        Phaser.Math.Between(8, 15) * intensity,
        Phaser.Math.Between(5, 9) * intensity,
        0xd7e3ff,
        0.4
      ).setDepth(3)
      this.tweens.add({
        targets: puff,
        x: puff.x + Phaser.Math.Between(-30, 30) * intensity,
        y: puff.y - Phaser.Math.Between(10, 24) * intensity,
        scale: 1.8,
        alpha: 0,
        duration: 280,
        onComplete: () => puff.destroy()
      })
    }
  }

  private floatDamage(x: number, y: number, amount: number, kind: AttackKind): void {
    const label = this.add
      .text(x, y, `-${amount}`, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: kind === 'light' ? '30px' : '39px',
        color: kind === 'light' ? '#fff1aa' : kind === 'heavy' ? '#ff8b67' : '#a9faff',
        stroke: '#25284b',
        strokeThickness: 8
      })
      .setOrigin(0.5)
      .setDepth(60)
    this.tweens.add({
      targets: label,
      y: y - 70,
      alpha: 0,
      scale: 1.5,
      duration: 520,
      onComplete: () => label.destroy()
    })
  }

  private startMusic(): void {
    if (!this.musicEnabled || this.musicEvent) return
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioContext()
        this.ownsAudioContext = true
      }
      if (this.audioContext.state === 'suspended') {
        void this.audioContext.resume().catch((error: unknown) => console.warn('Web Audio could not resume:', error))
      }
      const melody = [659, 0, 784, 880, 0, 784, 659, 523, 587, 0, 698, 784, 0, 698, 587, 523]
      const bass = [110, 110, 146.83, 110, 130.81, 130.81, 164.81, 146.83]
      this.musicEvent = this.time.addEvent({
        delay: 125,
        loop: true,
        callback: () => {
          const step = this.musicStep % 16
          this.musicStep += 1
          if (step % 4 === 0) this.playKick()
          else if (step % 4 === 2) this.playNoise(0.09, 0.035, 'music')
          if (step % 2 === 1) this.playNoise(0.035, 0.012, 'music')
          if (step % 2 === 0) this.playTone(bass[(step / 2) % bass.length], 0.11, 'triangle', 0.045, 'music')
          if (melody[step] > 0) this.playTone(melody[step], 0.105, 'square', 0.024, 'music')
        }
      })
    } catch (error) {
      console.warn('Web Audio could not start:', error)
    }
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume = 0.07,
    bus: 'music' | 'sfx' = 'sfx'
  ): void {
    const context = this.getAudioContext(bus)
    if (!context) return
    try {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, context.currentTime)
      gain.gain.setValueAtTime(0.001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + duration)
    } catch (error) {
      console.warn('Web Audio tone failed:', error)
    }
  }

  private playHitSound(kind: AttackKind): void {
    if (kind === 'light') {
      this.playTone(185, 0.085, 'sawtooth', 0.12)
      this.playNoise(0.055, 0.045)
    } else if (kind === 'heavy') {
      this.playTone(96, 0.17, 'triangle', 0.15)
      this.playTone(58, 0.12, 'sine', 0.085)
      this.playNoise(0.09, 0.06)
    } else {
      this.playTone(720, 0.12, 'sawtooth', 0.11)
      this.playTone(390, 0.28, 'sine', 0.12)
    }
  }

  private playAttackSound(family: AttackFamily): void {
    if (family === 'punch') {
      this.playNoise(0.055, 0.055)
      this.playTone(210, 0.07, 'square', 0.045)
    } else if (family === 'kick') {
      this.playTone(92, 0.14, 'triangle', 0.13)
      this.playTone(54, 0.12, 'sine', 0.07)
    } else {
      this.playTone(260, 0.12, 'sawtooth', 0.09)
      this.time.delayedCall(100, () => {
        this.playTone(720, 0.3, 'sine', 0.14)
        this.playNoise(0.28, 0.09)
      })
    }
  }

  private playHitReactSound(): void {
    this.playTone(155, 0.055, 'triangle', 0.1)
    this.playNoise(0.035, 0.025)
  }

  private playNoise(duration: number, volume: number, bus: 'music' | 'sfx' = 'sfx'): void {
    const context = this.getAudioContext(bus)
    if (!context) return
    try {
      const sampleRate = context.sampleRate
      const buffer = context.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate)
      const channel = buffer.getChannelData(0)
      for (let index = 0; index < channel.length; index += 1) {
        channel[index] = (Math.random() * 2 - 1) * (1 - index / channel.length)
      }
      const source = context.createBufferSource()
      const gain = context.createGain()
      source.buffer = buffer
      gain.gain.value = volume
      if (bus === 'music') {
        const filter = context.createBiquadFilter()
        filter.type = 'highpass'
        filter.frequency.value = 2400
        source.connect(filter)
        filter.connect(gain)
      } else {
        source.connect(gain)
      }
      gain.connect(context.destination)
      source.start()
    } catch (error) {
      console.warn('Web Audio impact noise failed:', error)
    }
  }

  private playResultSound(): void {
    this.playTone(1046, 0.22, 'sine', 0.13)
    this.time.delayedCall(100, () => {
      this.playTone(784, 0.34, 'triangle', 0.1)
      this.playNoise(0.11, 0.025)
    })
  }

  private playJumpSound(): void {
    this.playTone(330, 0.12, 'sine', 0.075)
    this.time.delayedCall(45, () => this.playTone(495, 0.12, 'triangle', 0.045))
  }

  private playTransformSound(): void {
    this.playTone(523, 0.18, 'triangle', 0.08)
    this.time.delayedCall(90, () => this.playTone(784, 0.2, 'sine', 0.09))
    this.time.delayedCall(190, () => {
      this.playTone(1046, 0.32, 'sine', 0.11)
      this.playNoise(0.16, 0.04)
    })
  }

  private playKick(): void {
    const context = this.getAudioContext('music')
    if (!context) return
    try {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const now = context.currentTime
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(145, now)
      oscillator.frequency.exponentialRampToValueAtTime(42, now + 0.11)
      gain.gain.setValueAtTime(0.14, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(now)
      oscillator.stop(now + 0.13)
    } catch (error) {
      console.warn('Web Audio drum failed:', error)
    }
  }

  private getAudioContext(bus: 'music' | 'sfx'): AudioContext | undefined {
    const context = this.audioContext
    if (!context || context.state === 'closed') return undefined
    if (bus === 'music' && !this.musicEnabled) return undefined
    if (bus === 'sfx' && !this.effectsEnabled) return undefined
    return context
  }

  private stopMusic(): void {
    this.musicEvent?.remove()
    this.musicEvent = undefined
  }
}
