// ffmpeg 실행, 미디어 정보 조회, 썸네일, 샘플 영상 생성
import { app } from 'electron'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import type { ProbeResult } from '@shared/types'

export function resolveFfmpegPath(): string {
  if (app.isPackaged) {
    const p = path.join(process.resourcesPath, 'ffmpeg.exe')
    if (!fs.existsSync(p)) throw new Error('ffmpeg를 찾을 수 없습니다: ' + p)
    return p
  }
  // 개발 모드: ffmpeg-static이 내려받은 바이너리 사용
  const dev = path.join(app.getAppPath(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe')
  if (!fs.existsSync(dev)) throw new Error('개발용 ffmpeg가 없습니다: ' + dev)
  return dev
}

export interface RunOptions {
  onStderrLine?: (line: string) => void
}

export function runFfmpeg(bin: string, args: string[], opts?: RunOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { windowsHide: true })
    let pending = ''
    let tail = ''
    proc.stderr.on('data', (d: Buffer) => {
      const s = d.toString()
      tail = (tail + s).slice(-8000)
      if (opts?.onStderrLine) {
        pending += s
        const lines = pending.split(/[\r\n]+/)
        pending = lines.pop() ?? ''
        for (const l of lines) if (l.trim()) opts.onStderrLine(l)
      }
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg 실패 (exit ${code}): ${tail.slice(-1200)}`))
    })
  })
}

/** ffmpeg -i 만으로 정보 조회 (ffprobe 불필요, exit code는 무시) */
export function probeMedia(bin: string, filePath: string): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, ['-i', filePath], { windowsHide: true })
    let err = ''
    proc.stderr.on('data', (d: Buffer) => {
      err += d.toString()
    })
    proc.on('error', reject)
    proc.on('close', () => {
      const dur = /Duration: (\d+):(\d+):([\d.]+)/.exec(err)
      if (!dur) return reject(new Error('미디어 정보를 읽을 수 없습니다: ' + filePath))
      const duration = Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3])
      const vid = /Video: [^\r\n]*?, (\d{2,5})x(\d{2,5})/.exec(err)
      resolve({
        duration,
        width: vid ? Number(vid[1]) : undefined,
        height: vid ? Number(vid[2]) : undefined,
        hasAudio: /Audio: /.test(err)
      })
    })
  })
}

function thumbsDir(): string {
  const dir = path.join(app.getPath('userData'), 'thumbs')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

/** 첫 프레임 썸네일을 jpg로 생성, 생성된 파일 경로 반환 (실패 시 null) */
export async function generateThumbnail(
  bin: string,
  filePath: string,
  id: string
): Promise<string | null> {
  const out = path.join(thumbsDir(), `${id.replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`)
  const isImage = /\.(png|jpe?g|gif|webp|bmp)$/i.test(filePath)
  const args = ['-y']
  if (isImage) {
    args.push('-i', filePath)
  } else {
    args.push('-ss', '1', '-i', filePath)
  }
  args.push('-frames:v', '1', '-vf', 'scale=320:-2', '-q:v', '6', out)
  try {
    await runFfmpeg(bin, args)
    return out
  } catch {
    return null
  }
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

/** 첫 실행용 샘플 영상이 없으면 생성하고 경로를 반환 */
export async function ensureSampleVideo(bin: string): Promise<string> {
  const dir = path.join(app.getPath('userData'), 'samples')
  fs.mkdirSync(dir, { recursive: true })
  const out = path.join(dir, 'sample.mp4')
  if (fs.existsSync(out)) return out

  const font = pickFont()
  const fontEsc = font.replace(/\\/g, '/').replace(/:/g, '\\:')
  const args = [
    '-y',
    '-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=30',
    '-f', 'lavfi', '-i', 'sine=frequency=523:duration=10',
    '-vf',
    `drawtext=fontfile='${fontEsc}':text='샘플 영상':fontsize=72:fontcolor=white:box=1:boxcolor=black@0.4:boxborderw=18:x=(w-text_w)/2:y=(h-text_h)/2`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
    '-t', '10', '-movflags', '+faststart', out
  ]
  await runFfmpeg(bin, args)
  return out
}
