import { useState } from 'react'
import type { DragEvent as RDragEvent } from 'react'
import type { MediaAsset } from '@shared/types'
import { useEditorStore } from '@/store/editorStore'
import { classifyFile, fmtTime, mediaUrl, baseName, extOf } from '@/utils/format'
import { newId, TRACK_AUDIO, TRACK_STICKER, TRACK_SUBTITLE } from '@/utils/project'

const STICKERS = ['⭐', '❤️', '🔥', '😂', '👍', '✨', '🎵', '🎬', '☀️', '🌈', '💫', '🎉']

const KIND_BADGE: Record<MediaAsset['kind'], { label: string; cls: string }> = {
  video: { label: '영상', cls: 'bg-sky-600' },
  audio: { label: '오디오', cls: 'bg-emerald-600' },
  image: { label: '이미지', cls: 'bg-violet-600' }
}

export default function MediaLibrary({ className = '' }: { className?: string }) {
  const assets = useEditorStore((s) => s.project.mediaAssets)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stickerOpen, setStickerOpen] = useState(false)

  async function importPaths(paths: string[]) {
    setImporting(true)
    setError(null)
    try {
      const loaded: MediaAsset[] = []
      for (const p of paths) {
        const kind = classifyFile(p)
        if (!kind) {
          setError(`지원하지 않는 형식: ${extOf(p) || '알 수 없음'} (${baseName(p)})`)
          continue
        }
        const id = newId('media')
        let duration = 5
        let hasAudio = false
        if (kind !== 'image') {
          try {
            const probe = await window.api.probe(p)
            duration = probe.duration
            hasAudio = probe.hasAudio
          } catch {
            setError(`미디어를 읽을 수 없습니다: ${baseName(p)}`)
            continue
          }
        }
        let thumb: string | null = null
        if (kind !== 'audio') {
          thumb = await window.api.thumbnail(p, id).catch(() => null)
        }
        loaded.push({
          id,
          kind,
          name: baseName(p),
          path: p,
          duration: Math.max(0.1, duration),
          hasAudio,
          thumb
        })
      }
      if (loaded.length) useEditorStore.getState().addAssets(loaded)
    } finally {
      setImporting(false)
    }
  }

  async function onPickFiles() {
    const paths = await window.api.pickMediaFiles()
    if (paths && paths.length) void importPaths(paths)
  }

  function onDrop(e: RDragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    const files = Array.from(e.dataTransfer.files)
    if (!files.length) return
    const paths = files.map((f) => window.api.pathForFile(f)).filter(Boolean)
    void importPaths(paths)
  }

  function addTextAtPlayhead() {
    const s = useEditorStore.getState()
    s.addTextClip(TRACK_SUBTITLE, s.playhead, '텍스트를 입력하세요')
  }

  function addSticker(emoji: string) {
    const s = useEditorStore.getState()
    s.addTextClip(TRACK_STICKER, s.playhead, emoji, { sticker: true, fontSize: 0.16 })
    setStickerOpen(false)
  }

  return (
    <div
      className={`flex flex-col bg-zinc-900 ${className}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="p-3 text-xs font-semibold text-zinc-400">미디어 라이브러리</div>

      {/* 가져오기 버튼들 */}
      <div className="grid grid-cols-2 gap-2 px-3">
        <button
          onClick={onPickFiles}
          className="col-span-2 rounded-lg border border-dashed border-zinc-600 bg-zinc-800/60 px-3 py-3 text-center text-xs text-zinc-300 transition hover:border-sky-500 hover:text-sky-300"
        >
          {importing ? '불러오는 중...' : '＋ 파일 가져오기 (또는 여기로 드래그)'}
        </button>
        <button
          onClick={addTextAtPlayhead}
          draggable
          onDragStart={(e) => e.dataTransfer.setData('application/x-new-text', '1')}
          className="rounded-lg bg-amber-600/20 border border-amber-600/40 px-3 py-2 text-xs text-amber-300 hover:bg-amber-600/30"
          title="자막 트랙에 텍스트 추가 (재생 헤드 위치)"
        >
          T 텍스트
        </button>
        <div className="relative">
          <button
            onClick={() => setStickerOpen((v) => !v)}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('application/x-new-sticker', '⭐')}
            className="w-full rounded-lg bg-pink-600/20 border border-pink-600/40 px-3 py-2 text-xs text-pink-300 hover:bg-pink-600/30"
            title="스티커 트랙에 스티커 추가"
          >
            ✿ 스티커
          </button>
          {stickerOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 grid w-44 grid-cols-4 gap-1 rounded-lg border border-zinc-700 bg-zinc-800 p-2 shadow-xl">
              {STICKERS.map((s) => (
                <button
                  key={s}
                  onClick={() => addSticker(s)}
                  className="rounded p-1.5 text-lg hover:bg-zinc-700"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-3 mt-2 rounded border border-red-800 bg-red-950/60 px-2 py-1.5 text-[11px] text-red-300">
          {error}
        </div>
      )}

      {/* 미디어 목록 */}
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {assets.length === 0 && !importing && (
          <div className="mt-6 text-center text-xs leading-relaxed text-zinc-500">
            영상 · 이미지 · 오디오 파일을
            <br />
            이곳으로 끌어다 놓으세요
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {assets.map((a) => (
            <AssetCard key={a.id} asset={a} />
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-800 p-2 text-[11px] leading-relaxed text-zinc-500">
        더블클릭: 타임라인에 추가
        <br />
        드래그: 원하는 트랙에 놓기
      </div>
    </div>
  )
}

function AssetCard({ asset }: { asset: MediaAsset }) {
  const badge = KIND_BADGE[asset.kind]
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('application/x-asset', asset.id)}
      onDoubleClick={() => useEditorStore.getState().addAssetToTimeline(asset.id)}
      className="group cursor-grab overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 transition hover:border-sky-500"
      title={asset.name}
    >
      <div className="relative flex h-16 items-center justify-center bg-zinc-950">
        {asset.thumb ? (
          <img src={mediaUrl(asset.thumb)} alt={asset.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-2xl">{asset.kind === 'audio' ? '🎵' : '🖼️'}</span>
        )}
        <span className={`absolute left-1 top-1 rounded px-1 py-0.5 text-[9px] font-semibold text-white ${badge.cls}`}>
          {badge.label}
        </span>
        {asset.kind !== 'image' && (
          <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[9px] text-zinc-200">
            {fmtTime(asset.duration)}
          </span>
        )}
      </div>
      <div className="truncate px-1.5 py-1 text-[11px] text-zinc-300">{asset.name}</div>
    </div>
  )
}
