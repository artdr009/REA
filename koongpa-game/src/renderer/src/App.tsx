import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import GameCanvas from './game/GameCanvas'
import { ArenaScene } from './game/ArenaScene'
import type { ControlAction, FightResult, FighterHud } from './game/types'

type Screen = 'home' | 'select' | 'game' | 'result'

import powerImageUrl from '../../../assets/processed/power.png?url'
import speedImageUrl from '../../../assets/processed/speed.png?url'
import balanceImageUrl from '../../../assets/processed/balance.png?url'
import capFormImageUrl from '../../../assets/cap/frame_01.png?url'
import blondeFormImageUrl from '../../../assets/blonde/frame_01.png?url'
import pharaohFormImageUrl from '../../../assets/pharaoh/frame_01.png?url'
import foxFormImageUrl from '../../../assets/fox/frame_01.png?url'

const DNA_IMAGES = { POWER: powerImageUrl, SPEED: speedImageUrl, BALANCE: balanceImageUrl }

const FORM_OPTIONS = [
  {
    id: 'CAP',
    title: '밸런스형',
    subtitle: '공격력 10 · 보통 속도',
    color: '#58d8d1',
    image: capFormImageUrl,
    stats: { attack: 67, speed: 77, jump: 67 }
  },
  {
    id: 'BLONDE',
    title: '스피드형',
    subtitle: '공격력 7 · 이동속도 1.3배',
    color: '#ffd45e',
    image: blondeFormImageUrl,
    stats: { attack: 47, speed: 100, jump: 67 }
  },
  {
    id: 'PHARAOH',
    title: '파워형',
    subtitle: '공격력 15 · 이동속도 0.8배',
    color: '#bd8aff',
    image: pharaohFormImageUrl,
    stats: { attack: 100, speed: 62, jump: 67 }
  },
  {
    id: 'FOX',
    title: '특수형',
    subtitle: '공격력 12 · 점프 1.5배 · 꼬리 필살기',
    color: '#ff9d55',
    image: foxFormImageUrl,
    stats: { attack: 80, speed: 77, jump: 100 }
  }
] as const

const DEFAULT_HUD: FighterHud = {
  playerHp: 130,
  playerMaxHp: 130,
  enemyHp: 112,
  enemyMaxHp: 112,
  gauge: 0,
  transformedSeconds: 0,
  combo: 0,
  maxCombo: 0,
  damageDealt: 0,
  playerName: 'CAP'
}

function screenForPath(path: string): Screen {
  const route = path.startsWith('#') ? path.slice(1) : path
  if (route === '/game') return 'game'
  if (route === '/select') return 'select'
  if (route === '/result') return 'result'
  return 'home'
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => screenForPath(window.location.hash || window.location.pathname))
  const [exitConfirmationOpen, setExitConfirmationOpen] = useState(false)
  const [hud, setHud] = useState<FighterHud>(DEFAULT_HUD)
  const [result, setResult] = useState<FightResult>('win')
  const [scene, setScene] = useState<ArenaScene | null>(null)
  const [musicEnabled, setMusicEnabled] = useState(true)
  const [effectsEnabled, setEffectsEnabled] = useState(true)
  const audioContextRef = useRef<AudioContext | null>(null)
  const formInfo = FORM_OPTIONS.find((form) => form.id === hud.playerName) ?? FORM_OPTIONS[0]

  const navigate = useCallback((next: Screen) => {
    const path = next === 'home' ? '#/' : `#/${next}`
    window.history.pushState({}, '', path)
    setScreen(next)
  }, [])

  useEffect(() => {
    const onPopState = () => setScreen(screenForPath(window.location.hash || window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setExitConfirmationOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const exitApp = () => {
    if (window.electronAPI) {
      window.electronAPI.quit()
    } else {
      window.close()
    }
  }

  const requestExit = () => setExitConfirmationOpen(true)

  const onHud = useCallback((nextHud: FighterHud) => setHud(nextHud), [])
  const onResult = useCallback((nextResult: FightResult) => {
    setResult(nextResult)
    navigate('result')
  }, [navigate])
  const onScene = useCallback((nextScene: ArenaScene | null) => setScene(nextScene), [])

  useEffect(() => {
    scene?.setAudioOptions(musicEnabled, effectsEnabled)
  }, [scene, musicEnabled, effectsEnabled])

  useEffect(() => () => {
    const context = audioContextRef.current
    if (context && context.state !== 'closed') {
      void context.close().catch((error: unknown) => console.warn('Web Audio could not close:', error))
    }
  }, [])

  const playButtonSound = (event: MouseEvent<HTMLElement>) => {
    if (!effectsEnabled || !(event.target instanceof Element) || !event.target.closest('button')) return
    try {
      const context = audioContextRef.current ?? new AudioContext()
      audioContextRef.current = context
      if (context.state === 'suspended') void context.resume()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(620, context.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(920, context.currentTime + 0.045)
      gain.gain.setValueAtTime(0.035, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.065)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.07)
    } catch (error) {
      console.warn('Button audio could not start:', error)
    }
  }

  const startFight = () => {
    setHud({
      ...DEFAULT_HUD,
      playerHp: 130,
      playerMaxHp: 130,
      playerName: 'CAP'
    })
    navigate('game')
  }

  const toggleFullscreen = () => {
    const fullscreenAction = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen()
    void fullscreenAction.catch((error: unknown) => console.warn('Fullscreen could not be toggled:', error))
  }

  return (
    <main className="app-shell" onClickCapture={playButtonSound}>
      <button className="exit-icon-button global-exit-button" onClick={requestExit} aria-label="게임 종료">×</button>
      {screen === 'home' && (
        <section className="home-screen">
          <div className="home-grid" />
          <div className="home-orbit orbit-one" />
          <div className="home-orbit orbit-two" />
          <div className="home-topline"><span className="brand-mark">DR</span><span>ORIGINAL HERO DNA BRAWLER</span></div>
          <div className="home-content">
            <div className="eyebrow"><span className="live-dot" /> ARCADE MODE · 1 PLAYER</div>
            <h1>DNA <span>RUMBLE</span></h1>
            <p className="home-korean">히어로 DNA를 깨워라!</p>
            <p className="home-copy">히어로 DNA를 선택하고, 옥상 격투장의 챔피언에 도전하세요.</p>
            <div className="home-actions">
              <button className="primary-button start-button" onClick={() => navigate('select')}>
                <span>쿵파 게임 시작</span><b>→</b>
              </button>
              <button className="secondary-button home-exit" onClick={requestExit}>나가기</button>
            </div>
            <p className="home-footnote">4 FORMS · 1 ROOFTOP ARENA · 1 RIVAL</p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-glow" />
            <div className="hero-shadow" />
            <img className="hero-character-image" src={DNA_IMAGES.POWER} alt="" />
            <span className="art-tag tag-power">POWER</span>
            <span className="art-tag tag-speed">SPEED</span>
            <span className="art-tag tag-balance">BALANCE</span>
            <div className="hero-stage-line" />
          </div>
          <footer className="home-footer"><span>© 2026 DNA RUMBLE — ORIGINAL FAN-INSPIRED GAME</span><span>PRESS START TO AWAKEN</span></footer>
        </section>
      )}

      {screen === 'select' && (
        <section className="selection-screen">
          <header className="selection-header">
            <button className="text-button" onClick={() => navigate('home')}>← 메인으로</button>
            <div className="selection-title"><span>01 / FORM GUIDE</span><h2>쿵파 캐릭터 변신</h2></div>
            <span className="selection-step">전투 중 N키로 변신</span>
          </header>
          <div className="selection-content">
            <div className="section-label"><span>FORM ORDER · CAP → BLONDE → PHARAOH → FOX → CAP</span></div>
            <div className="dna-grid form-grid">
              {FORM_OPTIONS.map((form, index) => (
                <article
                  className="dna-card form-card"
                  key={form.id}
                  style={{ '--dna-color': form.color } as React.CSSProperties}
                >
                  <span className="dna-card-index">0{index + 1}</span>
                  <div className="dna-portrait"><img src={form.image} alt={`${form.id} 캐릭터`} /></div>
                  <span className="dna-name">{form.id}</span>
                  <strong>{form.title}</strong>
                  <span className="dna-subtitle">{form.subtitle}</span>
                  <div className="dna-stat-bars">
                    {([
                      ['공격', form.stats.attack],
                      ['속도', form.stats.speed],
                      ['점프', form.stats.jump]
                    ] as const).map(([label, value]) => (
                      <span key={label} className="dna-stat">
                        <small>{label}</small><i><b style={{ width: `${value}%` }} /></i>
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <div className="selection-bottom">
              <div className="fighter-preview">
                <img className="preview-avatar" src={capFormImageUrl} alt="" />
                <span><small>시작 캐릭터</small><strong>CAP</strong></span>
              </div>
              <button className="primary-button fight-button" onClick={startFight}>
                <span>CAP으로 대전 시작</span><b>→</b>
              </button>
            </div>
          </div>
        </section>
      )}

      {screen === 'game' && (
        <section className="fight-screen">
          <header className="fight-topbar">
            <button className="text-button" onClick={() => navigate('select')}>← 캐릭터 변경</button>
            <div className="arena-title"><span>ROOFTOP ARENA</span><strong>HERO DNA BATTLE</strong></div>
            <div className="fight-actions">
              <span className="round-chip">ROUND <b>01</b></span>
              <button className="audio-button fullscreen-button" onClick={toggleFullscreen}>
                ⛶ 전체 화면
              </button>
              <button className={`audio-button ${musicEnabled ? 'enabled' : ''}`} onClick={() => setMusicEnabled((enabled) => !enabled)} aria-pressed={musicEnabled}>
                ♫ 음악 {musicEnabled ? 'ON' : 'OFF'}
              </button>
              <button className={`audio-button ${effectsEnabled ? 'enabled' : ''}`} onClick={() => setEffectsEnabled((enabled) => !enabled)} aria-pressed={effectsEnabled}>
                ✦ 효과음 {effectsEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </header>
          <div className="fight-stage">
            <div className="hud-row">
              <div className="fighter-hud player-hud">
                <div className="hud-name"><b className="hud-avatar" style={{ '--dna-color': formInfo.color } as React.CSSProperties}>DR</b><span><strong>{hud.playerName}</strong><small>PLAYER FORM</small></span></div>
                <div className="hp-track"><i style={{ width: `${(hud.playerHp / hud.playerMaxHp) * 100}%` }} /></div>
                <div className="hp-caption"><span>HP</span><span>{Math.max(0, Math.ceil(hud.playerHp))}<small> / {hud.playerMaxHp}</small></span></div>
              </div>
              <div className="vs-mark">VS</div>
              <div className="fighter-hud enemy-hud">
                <div className="hud-name"><span><strong>CPU RIVAL</strong><small>ROOFTOP ROOKIE</small></span><b className="hud-avatar cpu-avatar">CPU</b></div>
                <div className="hp-track"><i style={{ width: `${(hud.enemyHp / hud.enemyMaxHp) * 100}%` }} /></div>
                <div className="hp-caption"><span>HP</span><span>{Math.max(0, Math.ceil(hud.enemyHp))}<small> / {hud.enemyMaxHp}</small></span></div>
                <div className="enemy-caption">ONE RIVAL · NO MERCY</div>
              </div>
            </div>
            <div className="character-label"><small>현재 캐릭터</small><strong>{hud.playerName}</strong></div>
            {hud.combo >= 2 && <div className="combo-badge"><strong>{hud.combo} HITS!</strong></div>}
            <GameCanvas
              dna="BALANCE"
              weapon="FIST"
              audioContext={audioContextRef.current}
              onHud={onHud}
              onResult={onResult}
              onScene={onScene}
            />
            <div className="touch-controls" aria-label="터치 조작">
              <div className="touch-move">
                <TouchButton label="A" action="left" scene={scene} />
                <TouchButton label="D" action="right" scene={scene} />
                <TouchButton label="W" action="jump" scene={scene} />
                <TouchButton label="S" action="crouch" scene={scene} />
              </div>
              <div className="touch-actions">
                <TouchButton label="J" action="punchShort" scene={scene} />
                <TouchButton label="K" action="punchMedium" scene={scene} />
                <TouchButton label="L" action="punchLong" scene={scene} />
                <TouchButton label="U" action="kickShort" scene={scene} />
                <TouchButton label="I" action="kickMedium" scene={scene} />
                <TouchButton label="O" action="kickLong" scene={scene} />
                <TouchButton label="N" action="transform" scene={scene} />
                <TouchButton label="M" action="special" scene={scene} />
              </div>
            </div>
          </div>
          <footer className="fight-help">
            <span>WASD 이동 | JKL 주먹 | UIO 발차기 | N 변신 | M 필살기</span>
            <span className="transform-hint">CAP → BLONDE → PHARAOH → FOX</span>
          </footer>
        </section>
      )}

      {screen === 'result' && (
        <section className="result-screen">
          <div className="result-confetti" />
          <div className={`result-emblem ${result}`}><span>{result === 'win' ? 'WIN' : 'LOSE'}</span><strong>K.O.</strong></div>
          <p className="eyebrow">ROOFTOP ARENA · ROUND 01</p>
          <h2>{result === 'win' ? '챔피언 등극!' : '다시 일어나!'}</h2>
          <p>{result === 'win' ? '멋진 콤보로 라이벌을 제압했습니다.' : 'DNA와 무기를 바꿔 다시 도전해보세요.'}</p>
          <div className="result-stats">
            <div><small>MAX COMBO</small><strong>{hud.maxCombo}<i> HIT</i></strong></div>
            <div><small>DAMAGE DEALT</small><strong>{hud.damageDealt}</strong></div>
          </div>
          <div className="result-actions">
            <button className="primary-button" onClick={() => startFight()}><span>다시 하기</span><b>↻</b></button>
            <button className="secondary-button" onClick={() => navigate('select')}>캐릭터 변경</button>
          </div>
        </section>
      )}

      {exitConfirmationOpen && (
        <div className="exit-confirmation-backdrop">
          <section className="exit-confirmation" role="alertdialog" aria-modal="true" aria-labelledby="exit-confirmation-title">
            <h2 id="exit-confirmation-title">정말 종료할까요?</h2>
            <div className="exit-confirmation-actions">
              <button className="primary-button" onClick={exitApp}>예</button>
              <button className="secondary-button" onClick={() => setExitConfirmationOpen(false)}>아니오</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

function TouchButton({ label, action, scene }: { label: string; action: ControlAction; scene: ArenaScene | null }) {
  const release = () => scene?.setTouchAction(action, false)
  return (
    <button
      className={`touch-button touch-${action}`}
      onPointerDown={(event) => {
        event.preventDefault()
        scene?.setTouchAction(action, true)
      }}
      onPointerUp={release}
      onPointerLeave={release}
      onContextMenu={(event) => event.preventDefault()}
    >
      {label}
    </button>
  )
}
