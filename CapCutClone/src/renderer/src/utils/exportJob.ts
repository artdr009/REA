// 프로젝트 상태 → 내보내기 작업(Job) 변환
import type { ExportJob, ExportPreset, Project } from '@shared/types'
import { TRACK_AUDIO, TRACK_STICKER, TRACK_SUBTITLE, TRACK_VIDEO, normalize } from './project'

export const EXPORT_PRESETS: Record<ExportPreset, { label: string; sub: string; w: number; h: number }> = {
  landscape: { label: '유튜브 가로용', sub: '1920 × 1080 · 30fps', w: 1920, h: 1080 },
  shorts: { label: '유튜브 쇼츠용', sub: '1080 × 1920 · 30fps', w: 1080, h: 1920 },
  square: { label: '정사각형', sub: '1080 × 1080 · 30fps', w: 1080, h: 1080 }
}

export function buildExportJob(
  project: Project,
  preset: ExportPreset,
  quality: 'high' | 'standard',
  outputPath: string
): ExportJob {
  const p = normalize(project) // 영상 트랙 start 재계산 보장
  const presetInfo = EXPORT_PRESETS[preset]
  return {
    outputPath,
    width: presetInfo.w,
    height: presetInfo.h,
    fps: 30,
    quality,
    mediaAssets: JSON.parse(JSON.stringify(p.mediaAssets)),
    videoClips: JSON.parse(JSON.stringify(p.clips.filter((c) => c.trackId === TRACK_VIDEO))),
    audioClips: JSON.parse(JSON.stringify(p.clips.filter((c) => c.trackId === TRACK_AUDIO))),
    textClips: JSON.parse(
      JSON.stringify(p.clips.filter((c) => c.trackId === TRACK_SUBTITLE || c.trackId === TRACK_STICKER))
    )
  }
}
