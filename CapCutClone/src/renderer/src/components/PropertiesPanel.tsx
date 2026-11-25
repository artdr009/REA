import { useEditorStore } from '@/store/editorStore'
import { findClip } from '@/utils/project'
import type { AudioClip, Clip, TextClip, VideoClip, ImageClip } from '@shared/types'

export default function PropertiesPanel({ className = '' }: { className?: string }) {
  const selectedId = useEditorStore((s) => s.selectedId)
  const project = useEditorStore((s) => s.project)
  const clip = findClip(project, selectedId)
  const updateClip = useEditorStore((s) => s.updateClip)

  if (!clip) {
    return (
      <div className={`flex flex-col items-center justify-center bg-zinc-900 text-zinc-500 ${className}`}>
        <span className="mb-2 text-3xl">⚙️</span>
        <span className="text-xs">편집할 클립을 선택하세요</span>
      </div>
    )
  }

  function patch(p: any) {
    if (clip) updateClip(clip.id, p)
  }

  return (
    <div className={`flex flex-col bg-zinc-900 overflow-y-auto ${className}`}>
      <div className="p-4 border-b border-zinc-800">
        <div className="text-xs font-semibold text-zinc-400">속성 설정</div>
        <div className="mt-1 truncate text-sm font-medium text-zinc-100">{clip.name}</div>
      </div>

      <div className="p-4 space-y-6">
        {/* 공통: 시간 정보 */}
        <section className="space-y-2">
          <Label>시간 설정</Label>
          <div className="grid grid-cols-2 gap-2">
            <Field label="시작" value={`${clip.start.toFixed(2)}s`} readOnly />
            <Field label="길이" value={`${clip.duration.toFixed(2)}s`} readOnly />
          </div>
        </section>

        {/* 텍스트/스티커 설정 */}
        {(clip.type === 'text') && (
          <section className="space-y-3">
            <Label>텍스트</Label>
            <textarea
              value={(clip as TextClip).text}
              onChange={(e) => patch({ text: e.target.value })}
              className="w-full rounded bg-zinc-850 border border-zinc-700 p-2 text-xs text-zinc-200 focus:border-sky-500 outline-none h-20 resize-none"
            />
            <Slider 
              label="크기" min={0.01} max={0.5} step={0.01} 
              value={(clip as TextClip).fontSize} 
              onChange={(v) => patch({ fontSize: v })} 
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-500">색상</span>
              <input 
                type="color" 
                value={(clip as TextClip).color} 
                onChange={(e) => patch({ color: e.target.value })}
                className="h-6 w-10 bg-transparent cursor-pointer"
              />
            </div>
          </section>
        )}

        {/* 영상/이미지 시각 설정 */}
        {(clip.type === 'video' || clip.type === 'image') && (
          <section className="space-y-3">
            <Label>화면 설정</Label>
            <Slider 
              label="크기" min={0.1} max={5} step={0.1} 
              value={(clip as VideoClip | ImageClip).scale} 
              onChange={(v) => patch({ scale: v })} 
            />
            <div className="grid grid-cols-2 gap-2">
              <Slider 
                label="X 위치" min={-0.5} max={0.5} step={0.01} 
                value={(clip as VideoClip | ImageClip).offsetX} 
                onChange={(v) => patch({ offsetX: v })} 
              />
              <Slider 
                label="Y 위치" min={-0.5} max={0.5} step={0.01} 
                value={(clip as VideoClip | ImageClip).offsetY} 
                onChange={(v) => patch({ offsetY: v })} 
              />
            </div>
          </section>
        )}

        {/* 필터 설정 */}
        {(clip.type === 'video' || clip.type === 'image') && (
          <section className="space-y-3">
            <Label>필터</Label>
            <Slider 
              label="밝기" min={0} max={2} step={0.1} 
              value={(clip as VideoClip | ImageClip).filters.brightness} 
              onChange={(v) => patch({ filters: { ...(clip as VideoClip).filters, brightness: v } })} 
            />
            <Slider 
              label="대비" min={0} max={2} step={0.1} 
              value={(clip as VideoClip | ImageClip).filters.contrast} 
              onChange={(v) => patch({ filters: { ...(clip as VideoClip).filters, contrast: v } })} 
            />
            <Slider 
              label="채도(그레이)" min={0} max={1} step={0.1} 
              value={(clip as VideoClip | ImageClip).filters.grayscale} 
              onChange={(v) => patch({ filters: { ...(clip as VideoClip).filters, grayscale: v } })} 
            />
          </section>
        )}

        {/* 오디오/영상 볼륨 설정 */}
        {(clip.type === 'video' || clip.type === 'audio') && (
          <section className="space-y-3">
            <Label>오디오</Label>
            <Slider 
              label="볼륨" min={0} max={1} step={0.01} 
              value={(clip as VideoClip | AudioClip).volume} 
              onChange={(v) => patch({ volume: v })} 
            />
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="mute"
                checked={(clip as VideoClip | AudioClip).muted} 
                onChange={(e) => patch({ muted: e.target.checked })}
                className="accent-sky-500"
              />
              <label htmlFor="mute" className="text-[11px] text-zinc-300 cursor-pointer">음소거</label>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{children}</div>
}

function Field({ label, value, readOnly }: { label: string; value: string; readOnly?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-zinc-500">{label}</span>
      <div className="rounded bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300 border border-zinc-700/50">
        {value}
      </div>
    </div>
  )
}

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-zinc-400">{label}</span>
        <span className="text-sky-400 font-mono">{value.toFixed(2)}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step} value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
      />
    </div>
  )
}
