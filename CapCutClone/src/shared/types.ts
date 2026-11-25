// 렌더러/메인 프로세스가 함께 쓰는 공유 타입
export type CanvasRatio = '16:9' | '9:16' | '1:1'
export type MediaKind = 'video' | 'audio' | 'image'

/** CSS 필터 스타일 값 (1 = 기본값) */
export interface Filters {
  brightness: number // 0..2
  contrast: number // 0..2
  grayscale: number // 0..1
  sepia: number // 0..1
}

export interface MediaAsset {
  id: string
  kind: MediaKind
  name: string
  path: string
  duration: number // 초 (이미지는 표시용)
  width?: number
  height?: number
  hasAudio?: boolean
  thumb?: string | null // 썸네일 파일 경로
}

export interface ProbeResult {
  duration: number
  width?: number
  height?: number
  hasAudio: boolean
}

interface ClipCommon {
  id: string
  trackId: string
  type: 'video' | 'image' | 'audio' | 'text'
  name: string
  start: number // 타임라인 위치 (초)
  duration: number // 타임라인 길이 (초, 속도 적용 후)
}

export interface VideoClip extends ClipCommon {
  type: 'video'
  assetId: string
  trimStart: number // 원본에서 자르기 시작한 위치(초)
  sourceDuration: number // 원본 전체 길이(초)
  speed: number // 0.5 | 1 | 1.5 | 2
  volume: number // 0..1
  muted: boolean
  fadeIn: number // 초
  fadeOut: number // 초
  filters: Filters
  scale: number // 1 = 화면 맞춤
  offsetX: number // 캔버스 너비 기준 비율 (-0.5..0.5)
  offsetY: number // 캔버스 높이 기준 비율
}

export interface ImageClip extends ClipCommon {
  type: 'image'
  assetId: string
  filters: Filters
  scale: number
  offsetX: number
  offsetY: number
}

export interface AudioClip extends ClipCommon {
  type: 'audio'
  assetId: string
  trimStart: number
  sourceDuration: number
  volume: number
  muted: boolean
  fadeIn: number
  fadeOut: number
}

export interface TextClip extends ClipCommon {
  type: 'text'
  text: string
  fontSize: number // 캔버스 높이 기준 비율 (예: 0.06 = 6%)
  color: string // '#RRGGBB'
  offsetX: number
  offsetY: number
  sticker: boolean // true면 스티커 트랙용
}

export type Clip = VideoClip | ImageClip | AudioClip | TextClip

export interface Project {
  ratio: CanvasRatio
  mediaAssets: MediaAsset[]
  clips: Clip[]
}

export type ExportPreset = 'landscape' | 'shorts' | 'square'

export interface ExportJob {
  outputPath: string
  width: number
  height: number
  fps: number
  quality: 'high' | 'standard'
  mediaAssets: MediaAsset[]
  videoClips: Array<VideoClip | ImageClip> // 순서 = 영상 트랙 순서
  audioClips: AudioClip[]
  textClips: TextClip[] // 자막 + 스티커
}

export interface ExportProgress {
  percent: number
  message: string
}
