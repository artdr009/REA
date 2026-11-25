// 빌드 전 리소스 준비: ffmpeg 바이너리 복사 + 앱 아이콘 생성
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const RES = path.join(ROOT, 'resources')

function ffmpegBin() {
  const p = path.join(ROOT, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe')
  if (!fs.existsSync(p)) throw new Error('ffmpeg-static 바이너리가 없습니다: ' + p)
  return p
}

function pickFont() {
  const candidates = [
    'C:/Windows/Fonts/arial.ttf',
    'C:/Windows/Fonts/malgun.ttf',
    'C:/Windows/Fonts/calibri.ttf'
  ]
  for (const f of candidates) if (fs.existsSync(f)) return f
  return null
}

async function main() {
  fs.mkdirSync(RES, { recursive: true })

  // 1) ffmpeg.exe 복사 (패키지에 함께 들어가 다른 PC에서도 내보내기 가능)
  const ff = ffmpegBin()
  const dest = path.join(RES, 'ffmpeg.exe')
  fs.copyFileSync(ff, dest)
  console.log('ffmpeg 복사 완료:', (fs.statSync(dest).size / 1048576).toFixed(1) + ' MB')

  // 2) 아이콘 PNG 생성 (ffmpeg drawtext 사용) 후 ico 변환
  const png = path.join(RES, 'icon.png')
  const font = pickFont()
  const args = ['-y', '-f', 'lavfi', '-i', 'color=c=0x1e293b:s=256x256:d=1']
  if (font) {
    const fontEsc = font.replace(/\\/g, '/').replace(/:/g, '\\:')
    args.push(
      '-vf',
      `drawtext=fontfile='${fontEsc}':text='C':fontsize=170:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`
    )
  }
  args.push('-frames:v', '1', png)
  const r = spawnSync(ff, args, { stdio: 'pipe' })
  if (r.status !== 0 || !fs.existsSync(png)) {
    throw new Error('아이콘 PNG 생성 실패: ' + (r.stderr ? r.stderr.toString().slice(-500) : ''))
  }

  const pngToIco = require('png-to-ico')
  const buf = await pngToIco([png])
  fs.writeFileSync(path.join(RES, 'icon.ico'), buf)
  console.log('아이콘 생성 완료: resources/icon.ico')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
