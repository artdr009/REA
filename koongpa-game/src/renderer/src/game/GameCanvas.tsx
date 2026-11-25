import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { ArenaScene } from './ArenaScene'
import type { ControlAction, DnaType, FighterHud, FightResult, WeaponType } from './types'

interface GameCanvasProps {
  dna: DnaType
  weapon: WeaponType
  audioContext: AudioContext | null
  onHud: (hud: FighterHud) => void
  onResult: (result: FightResult) => void
  onScene: (scene: ArenaScene | null) => void
}

export default function GameCanvas({ dna, weapon, audioContext, onHud, onResult, onScene }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<ArenaScene | null>(null)

  useEffect(() => {
    if (!hostRef.current) return

    const scene = new ArenaScene(dna, weapon, { onHud, onResult, onReady: onScene })
    sceneRef.current = scene
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      width: 1120,
      height: 630,
      backgroundColor: '#151b38',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      render: {
        antialias: true,
        pixelArt: false
      },
      scene: [scene]
    })
    game.canvas.tabIndex = 0
    game.canvas.focus({ preventScroll: true })

    return () => {
      sceneRef.current = null
      onScene(null)
      game.destroy(true)
    }
  }, [dna, weapon, onHud, onResult, onScene])

  useEffect(() => {
    sceneRef.current?.setAudioContext(audioContext)
  }, [audioContext])

  return <div className="game-canvas" ref={hostRef} aria-label="DNA Rumble 대전 스테이지" />
}

export type { ControlAction }
