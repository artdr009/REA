import type { ExportJob, ExportProgress, ProbeResult } from './types'

/** preload가 renderer에 노출하는 API 시그니처 */
export interface Api {
  pickMediaFiles(): Promise<string[] | null>
  pickSavePath(defaultName: string): Promise<string | null>
  probe(path: string): Promise<ProbeResult>
  thumbnail(path: string, id: string): Promise<string | null>
  ensureSampleVideo(): Promise<string>
  openInFolder(path: string): Promise<void>
  exportVideo(job: ExportJob): Promise<{ ok: boolean; error?: string }>
  onExportProgress(cb: (p: ExportProgress) => void): () => void
  pathForFile(file: File): string
}
