// Electron 메인 프로세스: 창 생성, IPC, 미디어 프로토콜, 내보내기, 스모크 테스트
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import { registerMediaProtocol, registerProtocolSchemes } from './protocol'
import { ensureSampleVideo, generateThumbnail, probeMedia, resolveFfmpegPath, runFfmpeg } from './ffmpeg'
import { runExport } from './export'
import type { ExportJob, MediaAsset, ExportProgress } from '@shared/types'

registerProtocolSchemes()

let mainWindow: BrowserWindow | null = null

const isDev = !!process.env['ELECTRON_RENDERER_URL']

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 860,
    minWidth: 1180,
    minHeight: 720,
    show: false,
    backgroundColor: '#09090b',
    title: 'CapCutClone',
    icon: path.join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  mainWindow = win

  win.on('ready-to-show', () => win.show())

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function registerIpc(): void {
  const ff = () => resolveFfmpegPath()

  ipcMain.handle('media:pick', async () => {
    const r = await dialog.showOpenDialog(mainWindow!, {
      title: '미디어 파일 가져오기',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: '미디어 파일',
          extensions: [
            'mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'wmv', 'flv', 'ts', 'mpg', 'mpeg', '3gp', 'ogv',
            'mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'oga', 'opus', 'wma',
            'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'
          ]
        }
      ]
    })
    return r.canceled ? null : r.filePaths
  })

  ipcMain.handle('media:save-dialog', async (_e, defaultName: string) => {
    const r = await dialog.showSaveDialog(mainWindow!, {
      title: '내보내기 파일 저장 위치',
      defaultPath: path.join(app.getPath('videos'), defaultName || '내보내기_영상.mp4'),
      filters: [{ name: 'MP4 영상', extensions: ['mp4'] }]
    })
    return r.canceled ? null : r.filePath
  })

  ipcMain.handle('media:probe', (_e, p: string) => probeMedia(ff(), p))
  ipcMain.handle('media:thumb', (_e, p: string, id: string) => generateThumbnail(ff(), p, id))
  ipcMain.handle('app:ensure-sample', () => ensureSampleVideo(ff()))
  ipcMain.handle('app:open-path', (_e, p: string) => {
    shell.showItemInFolder(p)
  })

  ipcMain.handle('export:run', async (e, job: ExportJob) => {
    try {
      await runExport(job, (p: ExportProgress) => {
        if (!e.sender.isDestroyed()) e.sender.send('export:progress', p)
      })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}

// ---- 스모크 테스트 (개발용: 앱 부팅 + 내보내기 파이프라인 자동 검증) ----
async function runSmoke(): Promise<void> {
  const tag = (m: string) => console.log('[SMOKE]', m)
  try {
    const bin = ff()
    tag('샘플 영상 생성 중...')
    const sample = await ensureSampleVideo(bin)
    const probe = await probeMedia(bin, sample)
    tag(`샘플 probe: dur=${probe.duration.toFixed(1)}s hasAudio=${probe.hasAudio}`)

    const wav = path.join(app.getPath('temp'), 'smoke-tone.wav')
    await runFfmpeg(bin, [
      '-y', '-f', 'lavfi', '-i', 'sine=frequency=660:duration=2',
      '-c:a', 'pcm_s16le', '-ar', '44100', '-ac', '2', wav
    ])

    const asset: MediaAsset = {
      id: 'a1', kind: 'video', name: 'sample.mp4', path: sample,
      duration: probe.duration, hasAudio: probe.hasAudio
    }
    const asset2: MediaAsset = {
      id: 'a2', kind: 'audio', name: 'tone.wav', path: wav, duration: 2, hasAudio: true
    }

    const job: ExportJob = {
      outputPath: path.join(app.getPath('temp'), 'smoke-export.mp4'),
      width: 1920,
      height: 1080,
      fps: 30,
      quality: 'standard',
      mediaAssets: [asset, asset2],
      videoClips: [
        {
          id: 'c1', trackId: 'track-video', type: 'video', name: '클립1', start: 0,
          duration: 4 / 1.5, assetId: 'a1', trimStart: 0, sourceDuration: probe.duration,
          speed: 1.5, volume: 0.8, muted: false, fadeIn: 0.3, fadeOut: 0.3,
          filters: { brightness: 1.1, contrast: 1.2, grayscale: 0, sepia: 0.5 },
          scale: 1, offsetX: 0.05, offsetY: 0
        },
        {
          id: 'c4', trackId: 'track-video', type: 'video', name: '클립2', start: 4 / 1.5,
          duration: 2, assetId: 'a1', trimStart: 5, sourceDuration: probe.duration,
          speed: 1, volume: 1, muted: false, fadeIn: 0, fadeOut: 0,
          filters: { brightness: 1, contrast: 1, grayscale: 0, sepia: 0 },
          scale: 1, offsetX: 0, offsetY: 0
        }
      ],
      audioClips: [
        {
          id: 'c2', trackId: 'track-audio', type: 'audio', name: '효과음', start: 0.5,
          duration: 2, assetId: 'a2', trimStart: 0, sourceDuration: 2,
          volume: 0.6, muted: false, fadeIn: 0.2, fadeOut: 0.2
        }
      ],
      textClips: [
        {
          id: 'c3', trackId: 'track-subtitle', type: 'text', name: '자막', start: 0.2,
          duration: 2.5, text: '안녕하세요! 캡컷 클론 테스트 자막 100%', fontSize: 0.06,
          color: '#FFFFFF', offsetX: 0, offsetY: 0.35, sticker: false
        }
      ]
    }
    await runExport(job, (p) => tag(`진행 ${Math.round(p.percent)}% - ${p.message}`))
    const st = fs.statSync(job.outputPath)
    if (st.size < 10 * 1024) throw new Error('출력 파일이 너무 작습니다: ' + st.size)
    tag(`EXPORT OK size=${(st.size / 1048576).toFixed(2)}MB`)
    fs.rmSync(job.outputPath, { force: true })
    fs.rmSync(wav, { force: true })
    app.exit(0)
  } catch (err) {
    console.error('[SMOKE] EXPORT FAIL')
    console.error(err)
    app.exit(1)
  }
}

app.whenReady().then(() => {
  registerMediaProtocol()
  Menu.setApplicationMenu(null)
  registerIpc()
  createWindow()

  const smoke = process.argv.includes('--smoke')
  if (smoke) {
    mainWindow?.webContents.on('console-message', (_e, level, message) => {
      console.log(`[RENDERER:${level}] ${message}`)
    })
    let smokeDone = false
    const hardTimeout = setTimeout(() => {
      if (!smokeDone) {
        console.error('[SMOKE] TIMEOUT')
        app.exit(2)
      }
    }, 120000)
    mainWindow?.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        smokeDone = true
        clearTimeout(hardTimeout)
        void runSmoke()
      }, 800)
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
