// 타임라인 → 유튜브 업로드용 MP4 내보내기 파이프라인
// 1) 영상 트랙 클립을 순서대로 개별 세그먼트로 렌더링 (필터/속도/볼륨/페이드 적용)
// 2) concat으로 이어 붙이기 → 3) 자막/스티커 drawtext 오버레이 → 4) 오디오 트랙 믹스
import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { resolveFfmpegPath, runFfmpeg } from './ffmpeg'
import type {
  AudioClip,
  ExportJob,
  ExportProgress,
  ImageClip,
  MediaAsset,
  TextClip,
  VideoClip
} from '@shared/types'

function winPath(p: string): string {
  return p.replace(/\\/g, '/')
}

const FONT_CANDIDATES = [
  'C:/Windows/Fonts/malgun.ttf',
  'C:/Windows/Fonts/gulim.ttc',
  'C:/Windows/Fonts/arial.ttf'
]

function pickFont(): string {
  for (const f of FONT_CANDIDATES) {
    try {
      if (fs.existsSync(f)) return f
    } catch {
      /* 무시 */
    }
  }
  return FONT_CANDIDATES[0]
}

/** drawtext text= 값용 이스케이프 (따옴표 없이 사용) */
function escapeDrawText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/%/g, '\\%')
}

function hexColor(c: string): string {
  const v = /^#([0-9a-fA-F]{6})$/.test(c) ? c : '#FFFFFF'
  return v.replace('#', '0x')
}

/** 세피아 행렬과 항등행렬을 s 비율로 보간 */
function sepiaMatrix(s: number): string {
  const id = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ]
  const sp = [
    [0.393, 0.769, 0.189],
    [0.349, 0.686, 0.168],
    [0.272, 0.534, 0.131]
  ]
  const vals: string[] = []
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) vals.push((id[r][c] * (1 - s) + sp[r][c] * s).toFixed(4))
    vals.push('0')
  }
  return `colorchannelmixer=${vals.join(':')}`
}

/** 크기/위치/필터 → 비디오 필터 체인 (캔버스 WxH에 맞춤) */
function visualFilter(clip: VideoClip | ImageClip, W: number, H: number): string {
  const f = clip.filters
  const parts: string[] = []
  const bright = Math.max(-1, Math.min(1, f.brightness - 1)).toFixed(3)
  parts.push(`eq=brightness=${bright}:contrast=${Math.max(0, f.contrast).toFixed(3)}`)
  if (f.grayscale > 0.001) parts.push(`hue=s=${Math.max(0, 1 - f.grayscale).toFixed(3)}`)
  if (f.sepia > 0.001) parts.push(sepiaMatrix(Math.min(1, f.sepia)))
  parts.push(`scale=${W}:${H}:force_original_aspect_ratio=decrease`)

  const needTransform =
    Math.abs(clip.scale - 1) > 0.001 ||
    Math.abs(clip.offsetX) > 0.0005 ||
    Math.abs(clip.offsetY) > 0.0005
  if (needTransform) {
    const sc = clip.scale.toFixed(3)
    parts.push(`scale=trunc(iw*${sc}/2)*2:trunc(ih*${sc}/2)*2`)
    parts.push(`crop=min(iw\\,${W}):min(ih\\,${H})`)
    const px = `max(0\\,trunc((${W}-iw)/2)+${Math.round(clip.offsetX * W)})`
    const py = `max(0\\,trunc((${H}-ih)/2)+${Math.round(clip.offsetY * H)})`
    parts.push(`pad=${W}:${H}:${px}:${py}`)
  } else {
    parts.push(`pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2`)
  }
  return parts.join(',')
}

/** 오디오 필터 체인 (속도 → 볼륨 → 페이드 → 샘플레이트 통일) */
function audioFilter(
  volume: number,
  muted: boolean,
  fadeIn: number,
  fadeOut: number,
  outDur: number,
  speed: number
): string {
  const parts: string[] = []
  if (speed !== 1) parts.push(`atempo=${speed}`)
  parts.push(`volume=${muted ? '0' : Math.max(0, Math.min(1, volume)).toFixed(3)}`)
  if (fadeIn > 0.01) parts.push(`afade=t=in:st=0:d=${fadeIn.toFixed(3)}`)
  if (fadeOut > 0.01) {
    parts.push(`afade=t=out:st=${Math.max(0, outDur - fadeOut).toFixed(3)}:d=${fadeOut.toFixed(3)}`)
  }
  parts.push('aresample=44100', 'aformat=sample_fmts=fltp:channel_layouts=stereo')
  return parts.join(',')
}

async function renderVideoSegment(
  bin: string,
  clip: VideoClip | ImageClip,
  asset: MediaAsset,
  outPath: string,
  W: number,
  H: number,
  crf: number,
  preset: string,
  onLine?: (line: string) => void
): Promise<void> {
  const isVideo = clip.type === 'video'
  const args: string[] = ['-y']
  if (isVideo) {
    const v = clip as VideoClip
    args.push('-ss', String(v.trimStart), '-t', String(v.duration * v.speed))
  } else {
    args.push('-loop', '1', '-framerate', '30', '-t', String(clip.duration))
  }
  args.push('-i', asset.path)

  const hasAudio = isVideo ? !!asset.hasAudio : false
  if (!hasAudio) args.push('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo')
  args.push('-map', '0:v:0', '-map', hasAudio ? '0:a:0' : '1:a:0')

  const speed = isVideo ? (clip as VideoClip).speed : 1
  const vf =
    visualFilter(clip, W, H) + (isVideo && speed !== 1 ? `,setpts=PTS/${speed}` : '') + ',fps=30'
  args.push('-vf', vf)
  const v = isVideo ? (clip as VideoClip) : null
  args.push(
    '-af',
    audioFilter(v ? v.volume : 0, !v || v.muted, v ? v.fadeIn : 0, v ? v.fadeOut : 0, clip.duration, speed)
  )
  args.push(
    '-c:v', 'libx264',
    '-preset', preset,
    '-crf', String(crf),
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '44100',
    '-ac', '2',
    '-t', String(clip.duration),
    outPath
  )
  await runFfmpeg(bin, args, onLine ? { onStderrLine: onLine } : undefined)
}

async function renderAudioWav(
  bin: string,
  clip: AudioClip,
  asset: MediaAsset,
  outPath: string
): Promise<void> {
  const args = [
    '-y',
    '-ss', String(clip.trimStart),
    '-t', String(clip.duration),
    '-i', asset.path,
    '-af',
    audioFilter(clip.volume, clip.muted, clip.fadeIn, clip.fadeOut, clip.duration, 1),
    '-ac', '2',
    '-ar', '44100',
    '-c:a', 'pcm_s16le',
    outPath
  ]
  await runFfmpeg(bin, args)
}

function textChain(clips: TextClip[], W: number, H: number): string {
  const font = pickFont()
  const fontEsc = winPath(font).replace(/:/g, '\\:')
  return clips
    .map((c) => {
      const fs_ = Math.max(8, Math.round(c.fontSize * H))
      const x = `(main_w-text_w)/2+${(c.offsetX * W).toFixed(1)}`
      const y = `(main_h-text_h)/2+${(c.offsetY * H).toFixed(1)}`
      const enable = `between(t,${c.start.toFixed(3)},${(c.start + c.duration - 0.01).toFixed(3)})`
      const shadow = Math.max(1, Math.round(fs_ / 40))
      const text = escapeDrawText(c.text.replace(/\r?\n/g, ' '))
      return (
        `drawtext=fontfile='${fontEsc}'` +
        `:text=${text}` +
        `:fontsize=${fs_}` +
        `:fontcolor=${hexColor(c.color)}` +
        `:x=${x}` +
        `:y=${y}` +
        `:enable='${enable}'` +
        `:shadowcolor=black@0.55:shadowx=${shadow}:shadowy=${shadow}`
      )
    })
    .join(',')
}

export async function runExport(
  job: ExportJob,
  onProgress: (p: ExportProgress) => void
): Promise<void> {
  if (!job.videoClips.length) throw new Error('타임라인에 영상 클립이 없습니다.')
  const bin = resolveFfmpegPath()
  const work = path.join(app.getPath('temp'), `capcut-export-${Date.now()}`)
  fs.mkdirSync(work, { recursive: true })

  try {
    const W = job.width
    const H = job.height
    const crf = job.quality === 'high' ? 18 : 23
    const preset = job.quality === 'high' ? 'medium' : 'veryfast'
    const assets = new Map(job.mediaAssets.map((a) => [a.id, a]))
    const vClips = job.videoClips
    const aClips = job.audioClips
    const tClips = [...job.textClips].sort((a, b) => a.start - b.start)

    const totalUnits = vClips.length + 2 + (aClips.length ? 1 : 0)
    let doneUnits = 0
    const unitBase = () => (doneUnits / totalUnits) * 100
    const segs: string[] = []

    // 1) 영상 트랙 세그먼트 렌더링
    for (let i = 0; i < vClips.length; i++) {
      const clip = vClips[i]
      const asset = assets.get(clip.assetId)
      if (!asset) throw new Error(`미디어를 찾을 수 없습니다: ${clip.name}`)
      const seg = path.join(work, `seg_${String(i).padStart(3, '0')}.mp4`)
      const msg = `클립 렌더링 ${i + 1}/${vClips.length}`
      const dur = Math.max(0.1, clip.duration)
      await renderVideoSegment(bin, clip, asset, seg, W, H, crf, preset, (line) => {
        const m = /time=(\d+):(\d+):([\d.]+)/.exec(line)
        if (m) {
          const t = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
          const frac = Math.min(1, t / dur)
          onProgress({ percent: unitBase() + (frac / totalUnits) * 100, message: msg })
        }
      })
      segs.push(seg)
      doneUnits++
    }

    // 2) concat
    onProgress({ percent: unitBase(), message: '클립 합치는 중...' })
    const basePath = path.join(work, 'base.mp4')
    if (segs.length === 1) {
      fs.copyFileSync(segs[0], basePath)
    } else {
      const listPath = path.join(work, 'list.txt')
      fs.writeFileSync(listPath, segs.map((s) => `file '${winPath(s)}'`).join('\n'))
      await runFfmpeg(bin, [
        '-y', '-fflags', '+genpts',
        '-f', 'concat', '-safe', '0',
        '-i', listPath,
        '-c', 'copy',
        basePath
      ])
    }
    doneUnits++

    // 3) 자막/스티커 오버레이
    let current = basePath
    if (tClips.length) {
      onProgress({ percent: unitBase(), message: '자막/스티커 넣는 중...' })
      const overlaid = path.join(work, 'overlaid.mp4')
      await runFfmpeg(bin, [
        '-y',
        '-i', current,
        '-vf', textChain(tClips, W, H),
        '-c:v', 'libx264',
        '-preset', preset,
        '-crf', String(crf),
        '-pix_fmt', 'yuv420p',
        '-c:a', 'copy',
        overlaid
      ])
      current = overlaid
    }
    doneUnits++

    // 4) 오디오 트랙 믹스 + 최종 저장
    onProgress({ percent: unitBase(), message: '오디오 믹스 중...' })
    const finalTmp = path.join(work, 'final.mp4')
    const pairs = aClips
      .map((c) => ({ c, asset: assets.get(c.assetId) }))
      .filter((x): x is { c: AudioClip; asset: MediaAsset } => !!x.asset)

    if (pairs.length) {
      const wavs: string[] = []
      for (let i = 0; i < pairs.length; i++) {
        const w = path.join(work, `aud_${i}.wav`)
        await renderAudioWav(bin, pairs[i].c, pairs[i].asset, w)
        wavs.push(w)
      }
      const inputs = ['-i', current, ...wavs.flatMap((w) => ['-i', w])]
      const chains = wavs.map(
        (_, i) => `[${i + 1}:a]adelay=delays=${Math.round(pairs[i].c.start * 1000)}:all=1[d${i}]`
      )
      const mix =
        `[0:a]${wavs.map((_, i) => `[d${i}]`).join('')}` +
        `amix=inputs=${wavs.length + 1}:duration=first:normalize=0[aout]`
      await runFfmpeg(bin, [
        '-y',
        ...inputs,
        '-filter_complex', [...chains, mix].join(';'),
        '-map', '0:v',
        '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        finalTmp
      ])
    } else {
      await runFfmpeg(bin, ['-y', '-i', current, '-c', 'copy', '-movflags', '+faststart', finalTmp])
    }
    doneUnits++

    onProgress({ percent: 99, message: '저장하는 중...' })
    fs.copyFileSync(finalTmp, job.outputPath)
    onProgress({ percent: 100, message: '완료' })
  } finally {
    try {
      fs.rmSync(work, { recursive: true, force: true })
    } catch {
      /* 무시 */
    }
  }
}
