// 시간 포맷, 스냅, 미디어 URL 등 공용 유틸
export function fmtTime(t: number): string {
  if (!isFinite(t) || t < 0) t = 0
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  const d = Math.floor((t % 1) * 10)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${d}`
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v))
}

/** candidates 중 tol 이내의 가장 가까운 값으로 스냅 (없으면 원본) */
export function snapTime(t: number, candidates: number[], tol: number): number {
  let best = t
  let bestDist = tol
  for (const c of candidates) {
    const d = Math.abs(t - c)
    if (d < bestDist) {
      bestDist = d
      best = c
    }
  }
  return best
}

/** 로컬 파일 경로 → 미리보기용 media:// URL */
export function mediaUrl(p: string): string {
  return `media://f/?path=${encodeURIComponent(p)}`
}

export function extOf(p: string): string {
  const i = p.lastIndexOf('.')
  return i < 0 ? '' : p.slice(i + 1).toLowerCase()
}

const VIDEO_EXT = ['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'wmv', 'flv', 'ts', 'mpg', 'mpeg', '3gp', 'ogv']
const AUDIO_EXT = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'oga', 'opus', 'wma']
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']

export function classifyFile(p: string): 'video' | 'audio' | 'image' | null {
  const e = extOf(p)
  if (VIDEO_EXT.includes(e)) return 'video'
  if (AUDIO_EXT.includes(e)) return 'audio'
  if (IMAGE_EXT.includes(e)) return 'image'
  return null
}

export function baseName(p: string): string {
  return p.split(/[\\/]/).pop() ?? p
}
