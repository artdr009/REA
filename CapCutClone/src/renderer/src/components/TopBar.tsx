import { useEditorStore } from '@/store/editorStore'

export default function TopBar({ onExport }: { onExport: () => void }) {
  const canUndo = useEditorStore((s) => s.past.length > 0)
  const canRedo = useEditorStore((s) => s.future.length > 0)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const hasVideoClip = useEditorStore((s) => s.project.clips.some((c) => c.trackId === 'track-video'))

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-sky-500 text-sm font-bold text-white">
          C
        </div>
        <div className="text-sm font-semibold text-zinc-100">CapCutClone</div>
        <div className="text-xs text-zinc-500">PC 영상 편집기</div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="rounded px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
          title="되돌리기 (Ctrl+Z)"
        >
          ↩ 되돌리기
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="rounded px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
          title="다시하기 (Ctrl+Y)"
        >
          ↪ 다시하기
        </button>
      </div>

      <button
        onClick={onExport}
        disabled={!hasVideoClip}
        className="rounded-lg bg-sky-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
        title={hasVideoClip ? '내보내기' : '타임라인에 영상을 먼저 넣어주세요'}
      >
        내보내기
      </button>
    </div>
  )
}
