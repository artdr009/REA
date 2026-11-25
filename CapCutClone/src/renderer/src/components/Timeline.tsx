import { useEffect, useRef, useState } from 'react'
import type { DragEvent as RDragEvent, MouseEvent as RMouseEvent } from 'react'
import { useEditorStore } from '@/store/editorStore'
import {
  TRACK_AUDIO,
  TRACK_STICKER,
  TRACK_SUBTITLE,
  TRACK_VIDEO,
  totalDuration
} from '@/utils/project'
import { fmtTime, mediaUrl } from '@/utils/format'
import type { Clip } from '@shared/types'

const TRACK_HEIGHT = 44
const RULER_HEIGHT = 32

export default function Timeline() {
  const { project, playhead, pxPerSec, selectedId, setPlayhead, select, addAssetToTimeline, addTextClip, updateClip } = useEditorStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const totalDur = totalDuration(project)
  const width = Math.max(1000, totalDur * pxPerSec + 200)

  // 클릭으로 재생헤드 이동
  function onSeek(e: RMouseEvent) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + containerRef.current.scrollLeft
    setPlayhead(Math.max(0, x / pxPerSec))
  }

  // 드롭 처리 (미디어 라이브러리에서 드래그)
  function onDrop(e: RDragEvent) {
    e.preventDefault()
    const assetId = e.dataTransfer.getData('application/x-asset')
    const newText = e.dataTransfer.getData('application/x-new-text')
    const newSticker = e.dataTransfer.getData('application/x-new-sticker')
    
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + containerRef.current.scrollLeft
    const t = Math.max(0, x / pxPerSec)

    if (assetId) {
      addAssetToTimeline(assetId, { time: t })
    } else if (newText) {
      addTextClip(TRACK_SUBTITLE, t, '텍스트를 입력하세요')
    } else if (newSticker) {
      addTextClip(TRACK_STICKER, t, newSticker, { sticker: true, fontSize: 0.16 })
    }
  }

  return (
    <div className="flex h-72 flex-col border-t border-zinc-800 bg-zinc-950">
      {/* 툴바/정보 */}
      <div className="flex h-10 items-center justify-between border-b border-zinc-900 px-4 text-xs text-zinc-500">
        <div className="flex items-center gap-4">
          <span className="font-mono text-zinc-300">{fmtTime(playhead)}</span>
          <span>/</span>
          <span>{fmtTime(totalDur)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>확대/축소: {pxPerSec}px/s</span>
          <input 
            type="range" min="20" max="400" value={pxPerSec} 
            onChange={(e) => useEditorStore.getState().setPxPerSec(Number(e.target.value))}
            className="h-1 w-24 accent-sky-500"
          />
        </div>
      </div>

      {/* 타임라인 메인 영역 */}
      <div 
        ref={containerRef}
        className="relative flex-1 overflow-auto"
        onMouseDown={(e) => {
          if (e.button === 0 && (e.target as HTMLElement).classList.contains('timeline-bg')) {
            onSeek(e)
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <div className="timeline-bg relative min-h-full bg-zinc-900/30" style={{ width }}>
          {/* 눈금자 */}
          <div 
            className="sticky top-0 z-20 flex border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm"
            style={{ height: RULER_HEIGHT }}
            onClick={onSeek}
          >
            {Array.from({ length: Math.ceil(width / pxPerSec) + 1 }).map((_, i) => (
              <div 
                key={i} 
                className="relative flex-shrink-0 border-l border-zinc-800 pt-1 text-[9px] text-zinc-600"
                style={{ width: pxPerSec }}
              >
                <span className="ml-1">{i}s</span>
              </div>
            ))}
          </div>

          {/* 트랙들 */}
          <div className="relative pt-2">
            <Track label="자막" clips={project.clips.filter(c => c.trackId === TRACK_SUBTITLE)} />
            <Track label="스티커" clips={project.clips.filter(c => c.trackId === TRACK_STICKER)} />
            <Track label="영상" clips={project.clips.filter(c => c.trackId === TRACK_VIDEO)} isPrimary />
            <Track label="오디오" clips={project.clips.filter(c => c.trackId === TRACK_AUDIO)} />
          </div>

          {/* 재생 헤드 */}
          <div 
            className="pointer-events-none absolute bottom-0 top-0 z-30 w-px bg-red-500"
            style={{ left: playhead * pxPerSec }}
          >
            <div className="absolute -left-1.5 -top-1 h-3 w-3 rotate-45 border-b border-r border-red-500 bg-red-500" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Track({ label, clips, isPrimary }: { label: string; clips: Clip[]; isPrimary?: boolean }) {
  const pxPerSec = useEditorStore(s => s.pxPerSec)
  const selectedId = useEditorStore(s => s.selectedId)
  const select = useEditorStore(s => s.select)

  return (
    <div className="group relative flex items-center border-b border-zinc-900/50" style={{ height: TRACK_HEIGHT }}>
      <div className="sticky left-0 z-10 flex h-full w-20 items-center justify-center bg-zinc-950/90 text-[10px] font-medium text-zinc-500 border-r border-zinc-800">
        {label}
      </div>
      <div className="relative h-full flex-1">
        {clips.map(clip => (
          <div
            key={clip.id}
            onClick={(e) => { e.stopPropagation(); select(clip.id) }}
            className={`absolute top-1 bottom-1 flex flex-col justify-center rounded border overflow-hidden cursor-pointer select-none transition-shadow
              ${selectedId === clip.id ? 'border-sky-400 ring-1 ring-sky-400 z-10' : 'border-zinc-700 hover:border-zinc-500'}
              ${clip.trackId === TRACK_VIDEO ? 'bg-zinc-800' : clip.trackId === TRACK_AUDIO ? 'bg-emerald-950/50' : 'bg-zinc-800/80'}
            `}
            style={{ 
              left: clip.start * pxPerSec, 
              width: clip.duration * pxPerSec,
            }}
          >
            {clip.type === 'video' && clip.thumb && (
              <img src={mediaUrl(clip.thumb)} className="absolute inset-0 h-full w-full object-cover opacity-30 grayscale" />
            )}
            <div className="relative px-2 truncate text-[10px] text-zinc-300">
              {clip.type === 'text' ? clip.text : clip.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
