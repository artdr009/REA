// 미리보기 플레이어: HTML5 video + 텍스트 오버레이 + 오디오 클립 동기 재생
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as RPointerEvent } from 'react'
import type { AudioClip, CanvasRatio } from '@shared/types'
import { useEditorStore } from '@/store/editorStore'
import {
  activeVideoClip,
  clipsOfTrack,
  fadeFactor,
  findClip,
  ratioSize,
  totalDuration
} from '@/utils/project'
import { clamp, fmtTime, mediaUrl } from '@/utils/format'

const RATIOS: CanvasRatio[] = ['16:9', '9:16', '1:1']

function cssFilter(brightness: number, contrast: number, grayscale: number, sepia: number): string {
  return `brightness(${brightness}) contrast(${contrast}) grayscale(${grayscale}) sepia(${sepia})`
}

export default function PreviewPlayer({ className = '' }: { className?: string }) {
  const project = useEditorStore((s) => s.project)
  const playing = useEditorStore((s) => s.playing)
  const ratio = project.ratio

  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioEls = useRef(new Map<string, HTMLAudioElement>())
  const pendingSeek = useRef<number | null>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [videoError, setVideoError] = useState(false)

  const total = useMemo(() => totalDuration(project), [project])
  const assets = useMemo(() => new Map(project.mediaAssets.map((a) => [a.id, a])), [project.mediaAssets])

  // 컨테이너 크기 측정 → 비율에 맞는 스테이지 크기 계산
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const { w, h } = ratioSize(ratio)
      const cw = el.clientWidth
      const ch = el.clientHeight
      const scale = Math.min(cw / w, ch / h)
      setBox({ w: Math.floor(w * scale), h: Math.floor(h * scale) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ratio])

  const activeClip = useMemo(() => activeVideoClip(project, useEditorStore.getState().playhead), [project])
  const activeRef = useRef<HTMLVideoElement | HTMLImageElement | null>(null)
  activeRef.current = null

  // 재생 중 playhead 진행 (rAF 루프) + 미디어 동기화
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = () => {
      const now = performance.now()
      const dt = (now - last) / 1000
      last = now
      const s = useEditorStore.getState()
      let t = s.playhead + dt
      const total2 = totalDuration(s.project)
      if (t >= total2) {
        t = total2
        s.setPlaying(false)
      }
      s.setPlayhead(t)
      syncMedia(t, true)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  // 일시정지 상태에서 시크/속성 변경 반영
  useEffect(() => {
    if (!playing) syncMedia(playheadRef.current, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playheadRef.current, playing])

  const playheadRef = useRef(0)
  playheadRef.current = useEditorStore((s) => s.playhead)

  /** 재생 헤드 t 기준으로 비디오/오디오 엘리먼트를 타임라인에 맞춤 */
  function syncMedia(t: number, playingNow: boolean) {
    const s = useEditorStore.getState()
    const p = s.project
    const active = activeVideoClip(p, t)

    // 메인 비디오
    const v = videoRef.current
    if (v) {
      if (active && active.type === 'video') {
        const asset = assets.get(active.assetId)
        if (asset) {
          const url = mediaUrl(asset.path)
          const target = clamp(active.trimStart + (t - active.start) * active.speed, 0, Math.max(0, asset.duration - 0.05))
          if (v.src !== url) {
            pendingSeek.current = target
            v.src = url
            v.load()
          } else if (Math.abs(v.currentTime - target) > (playingNow ? 0.35 : 0.04)) {
            v.currentTime = target
          }
          v.playbackRate = clamp(active.speed, 0.25, 4)
          const local = t - active.start
          v.volume = active.muted ? 0 : clamp(active.volume * fadeFactor(local, active.fadeIn, active.fadeOut, active.duration), 0, 1)
          if (playingNow) {
            if (v.paused) void v.play().catch(() => setVideoError(true))
          } else if (!v.paused) {
            v.pause()
          }
        }
      } else {
        if (!v.paused) v.pause()
      }
    }

    // 오디오 클립
    const audioClips = clipsOfTrack(p, 'track-audio') as AudioClip[]
    const audioAssets = assets
    const keep = new Set<string>()
    for (const c of audioClips) {
      keep.add(c.id)
      let el = audioEls.current.get(c.id)
      const asset = audioAssets.get(c.assetId)
      if (!el && asset) {
        el = document.createElement('audio')
        el.src = mediaUrl(asset.path)
        el.preload = 'auto'
        audioEls.current.set(c.id, el)
      }
      if (!el) continue
      const isActive = t >= c.start && t < c.start + c.duration
      if (!isActive) {
        if (!el.paused) el.pause()
        continue
      }
      const target = clamp(c.trimStart + (t - c.start), 0, Math.max(0, (asset?.duration ?? 0) - 0.05))
      if (Math.abs(el.currentTime - target) > (playingNow ? 0.35 : 0.04)) el.currentTime = target
      const local = t - c.start
      el.volume = c.muted ? 0 : clamp(c.volume * fadeFactor(local, c.fadeIn, c.fadeOut, c.duration), 0, 1)
      if (playingNow) {
        if (el.paused) void el.play().catch(() => {})
      } else if (!el.paused) {
        el.pause()
      }
    }
    for (const [id, el] of audioEls.current) {
      if (!keep.has(id)) {
        el.pause()
        audioEls.current.delete(id)
      }
    }
  }

  // 오디오 클립 목록이 바뀌면 엘리먼트 정리
  useEffect(() => {
    const keep = new Set(clipsOfTrack(project, 'track-audio').map((c) => c.id))
    for (const [id, el] of audioEls.current) {
      if (!keep.has(id)) {
        el.pause()
        audioEls.current.delete(id)
      }
    }
  }, [project.clips])

  function seekByEvent(e: RPointerEvent<HTMLDivElement>) {
    const s = useEditorStore.getState()
    const total2 = totalDuration(s.project)
    const x = e.clientX - (e.currentTarget as HTMLElement).getBoundingClientRect().left
    s.setPlayhead(clamp(x / Math.max(1, stageRef.current?.clientWidth ?? 1) * 0 + x / stageWidth(), 0, total2))
  }

  function stageWidth(): number {
    return stageRef.current?.clientWidth ?? 1
  }
  void seekByEvent // 진행바 seek는 하단 컨트롤의 SeekBar에서 처리

  const filterStr =
    activeClip && (activeClip.type === 'video' || activeClip.type === 'image')
      ? cssFilter(activeClip.filters.brightness, activeClip.filters.contrast, activeClip.filters.grayscale, activeClip.filters.sepia)
      : undefined
  const transformStr =
    activeClip && (activeClip.type === 'video' || activeClip.type === 'image')
      ? `translate(${activeClip.offsetX * box.w}px, ${activeClip.offsetY * box.h}px) scale(${activeClip.scale})`
      : undefined

  const activeAsset =
    activeClip && (activeClip.type === 'video' || activeClip.type === 'image')
      ? assets.get(activeClip.assetId)
      : undefined

  useEffect(() => {
    setVideoError(false)
    pendingSeek.current = null
  }, [activeAsset?.path, activeClip?.id])

  return (
    <div className={`flex flex-col bg-zinc-950 ${className}`}>
      {/* 상단: 비율 선택 */}
      <div className="flex h-9 shrink-0 items-center justify-center gap-2 border-b border-zinc-800 bg-zinc-900">
        <span className="text-xs text-zinc-500">비율</span>
        {RATIOS.map((r) => (
          <button
            key={r}
            onClick={() => useEditorStore.getState().setRatio(r)}
            className={`rounded px-2 py-0.5 text-xs transition ${
              ratio === r ? 'bg-sky-500 text-white' : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {r}
          </button>
        ))}
        <span className="ml-2 text-[10px] text-zinc-600">
          {ratioSize(ratio).w}×{ratioSize(ratio).h}
        </span>
      </div>

      {/* 가운데: 스테이지 */}
      <div ref={containerRef} className="relative flex min-h-0 flex-1 items-center justify-center bg-zinc-950">
        <div
          ref={stageRef}
          className="relative overflow-hidden bg-black"
          style={{ width: box.w, height: box.h }}
        >
          {activeClip && activeClip.type === 'video' && activeAsset ? (
            <video
              ref={videoRef}
              playsInline
              preload="auto"
              className="h-full w-full object-contain"
              style={{ filter: filterStr, transform: transformStr }}
              onLoadedMetadata={() => {
                const v = videoRef.current
                if (v && pendingSeek.current != null) {
                  v.currentTime = pendingSeek.current
                  pendingSeek.current = null
                }
              }}
              onError={() => setVideoError(true)}
            />
          ) : null}
          {activeClip && activeClip.type === 'image' && activeAsset ? (
            <img
              src={mediaUrl(activeAsset.path)}
              alt={activeClip.name}
              className="h-full w-full object-contain"
              style={{ filter: filterStr, transform: transformStr }}
            />
          ) : null}

          {/* 자막/스티커 오버레이 */}
          <TextOverlays boxW={box.w} boxH={box.h} />

          {videoError && activeClip && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center text-sm text-zinc-300">
              이 파일은 브라우저 미리보기를 지원하지 않습니다.
              <br />
              (내보내기는 ffmpeg로 정상 동작합니다)
            </div>
          )}
        </div>
      </div>

      {/* 하단 컨트롤 */}
      <Controls total={total} />
    </div>
  )
}

/** 자막/스티커 텍스트 오버레이 (재생 헤드 구독) */
function TextOverlays({ boxW, boxH }: { boxW: number; boxH: number }) {
  const clips = useEditorStore((s) => s.project.clips)
  const playhead = useEditorStore((s) => s.playhead)
  const active = useMemo(() => {
    return clips.filter(
      (c) =>
        c.type === 'text' &&
        (c.trackId === 'track-subtitle' || c.trackId === 'track-sticker') &&
        playhead >= c.start &&
        playhead < c.start + c.duration
    )
  }, [clips, playhead])

  return (
    <>
      {active.map((c) => {
        if (c.type !== 'text') return null
        return (
          <div
            key={c.id}
            className="pointer-events-none absolute whitespace-pre text-center font-semibold"
            style={{
              left: `${50 + c.offsetX * 100}%`,
              top: `${50 + c.offsetY * 100}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: Math.max(8, Math.round(c.fontSize * boxH)),
              color: c.color,
              textShadow: '1px 1px 2px rgba(0,0,0,0.55)'
            }}
          >
            {c.text}
          </div>
        )
      })}
    </>
  )
}

/** 재생 컨트롤 + 시크바 + 시간 표시 */
function Controls({ total }: { total: number }) {
  const playing = useEditorStore((s) => s.playing)
  const togglePlay = useEditorStore((s) => s.togglePlay)
  const [time, setTime] = useState(0)

  useEffect(() => {
    const unsub = useEditorStore.subscribe((s) => {
      setTime(s.playhead)
    })
    return unsub
  }, [])

  const stageRef = useRef<HTMLDivElement>(null)

  function onSeek(e: RPointerEvent<HTMLDivElement>) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    useEditorStore.getState().setPlayhead(clamp((x / rect.width) * total, 0, total))
  }

  return (
    <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 px-4 py-2">
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-white transition hover:bg-sky-400"
          title="재생/일시정지 (Space)"
        >
          {playing ? '⏸' : '▶'}
        </button>
        <div className="font-mono text-xs text-zinc-300">
          {fmtTime(time)} <span className="text-zinc-500">/ {fmtTime(total)}</span>
        </div>
        <div
          ref={stageRef}
          className="group relative h-2 min-w-0 flex-1 cursor-pointer rounded bg-zinc-700"
          onPointerDown={(e) => {
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
            onSeek(e)
          }}
          onPointerMove={(e) => {
            if (e.buttons & 1) onSeek(e)
          }}
        >
          <div
            className="pointer-events-none absolute left-0 top-0 h-full rounded bg-sky-400"
            style={{ width: `${total > 0 ? Math.min(100, (time / total) * 100) : 0}%` }}
          />
          <div
            className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 transition group-hover:opacity-100"
            style={{ left: `calc(${total > 0 ? Math.min(100, (time / total) * 100) : 0}% - 6px)` }}
          />
        </div>
        <button
          onClick={() => {
            const el = stageRef.current?.closest('.relative')?.parentElement
            void el
            // 전체화면: 스테이지 부모 컨테이너 요청
            const stage = document.querySelector('[data-stage-fullscreen]')
            if (stage) void stage.requestFullscreen().catch(() => {})
          }}
          className="rounded px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          title="전체화면"
        >
          ⛶
        </button>
      </div>
    </div>
  )
}

export function findAssetName(id: string | undefined, map: Map<string, { name: string }>): string {
  return id ? map.get(id)?.name ?? '' : ''
}

export { findClip }
