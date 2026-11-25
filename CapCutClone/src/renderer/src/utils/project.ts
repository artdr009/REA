// 프로젝트 모델 조회/변경 헬퍼
import type { Clip, Filters, ImageClip, Project, VideoClip } from '@shared/types'

export const TRACK_VIDEO = 'track-video'
export const TRACK_AUDIO = 'track-audio'
export const TRACK_SUBTITLE = 'track-subtitle'
export const TRACK_STICKER = 'track-sticker'

let uid = 0
export function newId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${(uid++).toString(36)}`
}

export function defaultFilters(): Filters {
  return { brightness: 1, contrast: 1, grayscale: 0, sepia: 0 }
}

/** 영상 트랙 클립들 (배열 순서 = 타임라인 순서, start는 항상 누적으로 유지) */
export function videoClipsOf(p: Project): Array<VideoClip | ImageClip> {
  return p.clips.filter((c) => c.trackId === TRACK_VIDEO) as Array<VideoClip | ImageClip>
}

export function clipsOfTrack(p: Project, trackId: string): Clip[] {
  return p.clips.filter((c) => c.trackId === trackId)
}

export function totalDuration(p: Project): number {
  let t = 0
  for (const c of p.clips) t = Math.max(t, c.start + c.duration)
  return Math.max(t, 0.1)
}

/** 영상 트랙 클립의 start를 배열 순서의 누적 시간으로 재계산 */
export function normalize(p: Project): Project {
  const clips = p.clips.map((c) => ({ ...c }))
  let t = 0
  for (const c of clips) {
    if (c.trackId === TRACK_VIDEO) {
      c.start = t
      t += c.duration
    }
  }
  return { ...p, clips }
}

export function findClip(p: Project, id: string | null): Clip | undefined {
  if (!id) return undefined
  return p.clips.find((c) => c.id === id)
}

/** 재생 헤드 시점 t에 재생 중인 영상 트랙 클립 */
export function activeVideoClip(p: Project, t: number): VideoClip | ImageClip | undefined {
  return videoClipsOf(p).find((c) => t >= c.start && t < c.start + c.duration)
}

/** 클립 로컬 시간 위치에서의 페이드 계수 (0..1) */
export function fadeFactor(local: number, fadeIn: number, fadeOut: number, dur: number): number {
  let f = 1
  if (fadeIn > 0 && local < fadeIn) f *= local / fadeIn
  const remain = dur - local
  if (fadeOut > 0 && remain < fadeOut) f *= Math.max(0, remain / fadeOut)
  return Math.max(0, Math.min(1, f))
}

/** 비율 → 내보내기 기본 해상도 */
export function ratioSize(ratio: string): { w: number; h: number } {
  if (ratio === '9:16') return { w: 1080, h: 1920 }
  if (ratio === '1:1') return { w: 1080, h: 1080 }
  return { w: 1920, h: 1080 }
}
