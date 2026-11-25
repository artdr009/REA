import { useEffect, useRef, useState } from 'react'
import TopBar from '@/components/TopBar'
import MediaLibrary from '@/components/MediaLibrary'
import PreviewPlayer from '@/components/PreviewPlayer'
import Timeline from '@/components/Timeline'
import PropertiesPanel from '@/components/PropertiesPanel'
import ExportDialog from '@/components/ExportDialog'
import { useEditorStore } from '@/store/editorStore'
import { totalDuration, TRACK_SUBTITLE } from '@/utils/project'

export default function EditorPage() {
  const [exportOpen, setExportOpen] = useState(false)
  const bootstrapped = useRef(false)

  // 첫 실행: 타임라인이 비어 있으면 샘플 영상 1개를 자동으로 넣어줌
  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true
    void (async () => {
      const s = useEditorStore.getState()
      if (s.project.clips.length === 0 && s.project.mediaAssets.length === 0) {
        try {
          const samplePath = await window.api.ensureSampleVideo()
          const probe = await window.api.probe(samplePath)
          const thumb = await window.api.thumbnail(samplePath, 'sample').catch(() => null)
          const asset = {
            id: 'media_sample',
            kind: 'video' as const,
            name: '샘플 영상.mp4',
            path: samplePath,
            duration: probe.duration,
            width: probe.width,
            height: probe.height,
            hasAudio: probe.hasAudio,
            thumb
          }
          s.addAssets([asset])
          s.addAssetToTimeline(asset.id)
        } catch (e) {
          console.error('샘플 영상 준비 실패', e)
        }
      }
    })()
  }, [])

  // 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing =
        !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      const s = useEditorStore.getState()

      if (e.code === 'Space' && !typing) {
        e.preventDefault()
        s.togglePlay()
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && s.selectedId) {
        e.preventDefault()
        s.deleteClip(s.selectedId)
      } else if (!typing && (e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        s.splitAtPlayhead()
      } else if (!typing && e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        s.copySelected()
      } else if (!typing && e.ctrlKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault()
        s.paste()
      } else if (!typing && e.ctrlKey && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        s.undo()
      } else if (
        !typing &&
        ((e.ctrlKey && (e.key === 'y' || e.key === 'Y')) ||
          (e.ctrlKey && e.shiftKey && (e.key === 'z' || e.key === 'Z')))
      ) {
        e.preventDefault()
        s.redo()
      } else if (!typing && e.key === 'ArrowLeft') {
        s.setPlayhead(Math.max(0, s.playhead - 0.2))
      } else if (!typing && e.key === 'ArrowRight') {
        s.setPlayhead(s.playhead + 0.2)
      } else if (!typing && e.key === 'Home') {
        s.setPlayhead(0)
      } else if (!typing && e.key === 'End') {
        s.setPlayhead(totalDuration(s.project))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-full select-none flex-col bg-zinc-950 text-zinc-100">
      <TopBar onExport={() => setExportOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <MediaLibrary className="w-72 shrink-0 border-r border-zinc-800" />
        <div className="flex min-w-0 flex-1 flex-col">
          <PreviewPlayer className="min-h-0 flex-1" />
          <Timeline />
        </div>
        <PropertiesPanel className="w-72 shrink-0 border-l border-zinc-800" />
      </div>
      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
    </div>
  )
}
