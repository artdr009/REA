// 로컬 미디어 파일을 renderer에 안전하게 스트리밍하는 media:// 프로토콜
import { protocol } from 'electron'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.wmv': 'video/x-ms-wmv',
  '.ts': 'video/mp2t',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.wma': 'audio/x-ms-wma',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp'
}

export function registerProtocolSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'media',
      privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true }
    }
  ])
}

export function registerMediaProtocol(): void {
  protocol.handle('media', async (request) => {
    try {
      const u = new URL(request.url)
      const filePath = u.searchParams.get('path')
      if (!filePath) return new Response('bad request', { status: 400 })
      const st = await fs.promises.stat(filePath)
      if (!st.isFile()) return new Response('not found', { status: 404 })
      const mime = MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
      const range = request.headers.get('range')

      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range)
        let start = m && m[1] ? parseInt(m[1], 10) : 0
        let end = m && m[2] ? parseInt(m[2], 10) : st.size - 1
        if (isNaN(start) || start >= st.size || start > end) {
          start = 0
          end = st.size - 1
        }
        end = Math.min(end, st.size - 1)
        const stream = Readable.toWeb(
          fs.createReadStream(filePath, { start, end })
        ) as unknown as ReadableStream
        return new Response(stream, {
          status: 206,
          headers: {
            'Content-Type': mime,
            'Content-Length': String(end - start + 1),
            'Content-Range': `bytes ${start}-${end}/${st.size}`,
            'Accept-Ranges': 'bytes'
          }
        })
      }

      const stream = Readable.toWeb(fs.createReadStream(filePath)) as unknown as ReadableStream
      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Content-Length': String(st.size),
          'Accept-Ranges': 'bytes'
        }
      })
    } catch {
      return new Response('not found', { status: 404 })
    }
  })
}
