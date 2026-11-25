// 편집 상태 관리 (zustand) + 되돌리기/다시하기 히스토리
import { create } from 'zustand'
import type {
  AudioClip,
  CanvasRatio,
  Clip,
  ImageClip,
  MediaAsset,
  Project,
  TextClip,
  VideoClip
} from '@shared/types'
import {
  TRACK_AUDIO,
  TRACK_STICKER,
  TRACK_VIDEO,
  normalize,
  newId,
  totalDuration
} from '@/utils/project'

type ClipPatch = Partial<VideoClip> & Partial<ImageClip> & Partial<AudioClip> & Partial<TextClip>

const MAX_HISTORY = 60

interface EditorStore {
  project: Project
  selectedId: string | null
  playhead: number
  playing: boolean
  pxPerSec: number
  past: string[]
  future: string[]
  clipboard: Clip | null

  beginHistory(): void
  addAssets(assets: MediaAsset[]): void
  addAssetToTimeline(assetId: string, opts?: { videoIndex?: number; time?: number }): void
  addTextClip(trackId: string, time: number, text: string, opts?: { sticker?: boolean; fontSize?: number }): void
  updateClip(id: string, patch: ClipPatch, history?: boolean): void
  reorderVideoClip(id: string, targetIndex: number): void
  deleteClip(id: string): void
  splitAtPlayhead(): void
  copySelected(): void
  paste(): void
  undo(): void
  redo(): void
  setRatio(r: CanvasRatio): void
  setPlayhead(t: number): void
  setPlaying(b: boolean): void
  togglePlay(): void
  setPxPerSec(n: number): void
  select(id: string | null): void
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  project: { ratio: '16:9', mediaAssets: [], clips: [] },
  selectedId: null,
  playhead: 0,
  playing: false,
  pxPerSec: 80,
  past: [],
  future: [],
  clipboard: null,

  beginHistory: () =>
    set((s) => {
      const cur = JSON.stringify(s.project)
      if (s.past[s.past.length - 1] === cur) return {}
      return { past: [...s.past, cur].slice(-MAX_HISTORY), future: [] }
    }),

  addAssets: (assets) => {
    get().beginHistory()
    set((s) => ({ project: { ...s.project, mediaAssets: [...s.project.mediaAssets, ...assets] } }))
  },

  addAssetToTimeline: (assetId, opts) => {
    const s = get()
    const asset = s.project.mediaAssets.find((a) => a.id === assetId)
    if (!asset) return
    s.beginHistory()
    set((st) => {
      const clips = [...st.project.clips]
      if (asset.kind === 'audio') {
        const clip: AudioClip = {
          id: newId('clip'),
          trackId: TRACK_AUDIO,
          type: 'audio',
          name: asset.name,
          start: Math.max(0, opts?.time ?? st.playhead),
          duration: Math.max(0.2, asset.duration),
          assetId: asset.id,
          trimStart: 0,
          sourceDuration: asset.duration,
          volume: 1,
          muted: false,
          fadeIn: 0,
          fadeOut: 0
        }
        clips.push(clip)
        return { project: normalize({ ...st.project, clips }), selectedId: clip.id }
      }

      let clip: VideoClip | ImageClip
      if (asset.kind === 'video') {
        clip = {
          id: newId('clip'), trackId: TRACK_VIDEO, type: 'video', name: asset.name, start: 0,
          duration: Math.max(0.2, asset.duration), assetId: asset.id, trimStart: 0,
          sourceDuration: asset.duration, speed: 1, volume: 1, muted: false, fadeIn: 0, fadeOut: 0,
          filters: { brightness: 1, contrast: 1, grayscale: 0, sepia: 0 },
          scale: 1, offsetX: 0, offsetY: 0
        }
      } else {
        clip = {
          id: newId('clip'), trackId: TRACK_VIDEO, type: 'image', name: asset.name, start: 0,
          duration: 5, assetId: asset.id,
          filters: { brightness: 1, contrast: 1, grayscale: 0, sepia: 0 },
          scale: 1, offsetX: 0, offsetY: 0
        }
      }
      const idxs = clips.map((c, i) => (c.trackId === TRACK_VIDEO ? i : -1)).filter((i) => i >= 0)
      const vi = opts?.videoIndex
      const at =
        vi == null || vi >= idxs.length
          ? idxs.length
            ? idxs[idxs.length - 1] + 1
            : clips.length
          : idxs[vi]
      clips.splice(at, 0, clip)
      return { project: normalize({ ...st.project, clips }), selectedId: clip.id }
    })
  },

  addTextClip: (trackId, time, text, opts) => {
    get().beginHistory()
    set((st) => {
      const clip: TextClip = {
        id: newId('clip'),
        trackId,
        type: 'text',
        name: opts?.sticker ? '스티커' : '자막',
        start: Math.max(0, time),
        duration: 4,
        text,
        fontSize: opts?.fontSize ?? 0.055,
        color: '#FFFFFF',
        offsetX: 0,
        offsetY: 0,
        sticker: !!opts?.sticker
      }
      return { project: { ...st.project, clips: [...st.project.clips, clip] }, selectedId: clip.id }
    })
  },

  updateClip: (id, patch, history = true) => {
    if (history) get().beginHistory()
    set((st) => ({
      project: normalize({
        ...st.project,
        clips: st.project.clips.map((c) => {
          if (c.id !== id) return c
          const n = { ...c, ...patch } as Clip
          if (n.type === 'video' && typeof (patch as Partial<VideoClip>).speed === 'number') {
            n.duration = Math.max(0.2, (n.sourceDuration - n.trimStart) / n.speed)
          }
          return n
        })
      })
    }))
  },

  reorderVideoClip: (id, targetIndex) => {
    get().beginHistory()
    set((st) => {
      const clips = [...st.project.clips]
      const from = clips.findIndex((c) => c.id === id)
      if (from < 0) return {}
      const [clip] = clips.splice(from, 1)
      const idxs = clips.map((c, i) => (c.trackId === TRACK_VIDEO ? i : -1)).filter((i) => i >= 0)
      const at =
        targetIndex >= idxs.length
          ? idxs.length
            ? idxs[idxs.length - 1] + 1
            : clips.length
          : idxs[targetIndex]
      clips.splice(at, 0, clip)
      return { project: normalize({ ...st.project, clips }) }
    })
  },

  deleteClip: (id) => {
    get().beginHistory()
    set((st) => {
      const clips = st.project.clips.filter((c) => c.id !== id)
      return {
        project: normalize({ ...st.project, clips }),
        selectedId: st.selectedId === id ? null : st.selectedId
      }
    })
  },

  splitAtPlayhead: () => {
    const s = get()
    const t = s.playhead
    const inside = (c: Clip) => t > c.start + 0.05 && t < c.start + c.duration - 0.05
    const sel = s.selectedId ? s.project.clips.find((c) => c.id === s.selectedId) : undefined
    const target = sel && inside(sel) ? sel : s.project.clips.find(inside)
    if (!target) return
    s.beginHistory()
    set((st) => {
      const leftDur = t - target.start
      const left = { ...target, duration: leftDur }
      let right: Clip
      if (target.type === 'video') {
        right = {
          ...target,
          id: newId('clip'),
          start: t,
          duration: target.duration - leftDur,
          trimStart: target.trimStart + leftDur * target.speed
        }
      } else if (target.type === 'audio') {
        right = {
          ...target,
          id: newId('clip'),
          start: t,
          duration: target.duration - leftDur,
          trimStart: target.trimStart + leftDur
        }
      } else {
        right = { ...target, id: newId('clip'), start: t, duration: target.duration - leftDur }
      }
      const clips = [...st.project.clips]
      const i = clips.findIndex((c) => c.id === target.id)
      clips.splice(i, 1, left, right)
      return { project: normalize({ ...st.project, clips }), selectedId: right.id }
    })
  },

  copySelected: () => {
    const s = get()
    const sel = s.project.clips.find((c) => c.id === s.selectedId)
    if (sel) set({ clipboard: JSON.parse(JSON.stringify(sel)) as Clip })
  },

  paste: () => {
    const s = get()
    if (!s.clipboard) return
    s.beginHistory()
    set((st) => {
      const c = JSON.parse(JSON.stringify(s.clipboard)) as Clip
      c.id = newId('clip')
      const clips = [...st.project.clips]
      if (c.trackId === TRACK_VIDEO) {
        const vclips = clips.filter(
          (cc) => cc.trackId === TRACK_VIDEO
        ) as Array<VideoClip | ImageClip>
        const vi = vclips.filter((v) => v.start + v.duration / 2 <= st.playhead).length
        const idxs = clips.map((cc, i) => (cc.trackId === TRACK_VIDEO ? i : -1)).filter((i) => i >= 0)
        const at =
          vi >= idxs.length ? (idxs.length ? idxs[idxs.length - 1] + 1 : clips.length) : idxs[vi]
        clips.splice(at, 0, c)
      } else {
        c.start = st.playhead
        clips.push(c)
      }
      return { project: normalize({ ...st.project, clips }), selectedId: c.id }
    })
  },

  undo: () =>
    set((s) => {
      if (!s.past.length) return {}
      const cur = JSON.stringify(s.project)
      const prev = s.past[s.past.length - 1]
      return { project: JSON.parse(prev) as Project, past: s.past.slice(0, -1), future: [cur, ...s.future].slice(0, MAX_HISTORY) }
    }),

  redo: () =>
    set((s) => {
      if (!s.future.length) return {}
      const cur = JSON.stringify(s.project)
      const next = s.future[0]
      return { project: JSON.parse(next) as Project, past: [...s.past, cur].slice(-MAX_HISTORY), future: s.future.slice(1) }
    }),

  setRatio: (r) => {
    get().beginHistory()
    set((s) => ({ project: { ...s.project, ratio: r } }))
  },

  setPlayhead: (t) => set({ playhead: Math.max(0, t) }),

  setPlaying: (b) => set({ playing: b }),

  togglePlay: () => {
    const s = get()
    const total = totalDuration(s.project)
    if (s.playing) {
      set({ playing: false })
    } else {
      set({ playhead: s.playhead >= total - 0.05 ? 0 : s.playhead, playing: true })
    }
  },

  setPxPerSec: (n) => set({ pxPerSec: n }),

  select: (id) => set({ selectedId: id })
}))
