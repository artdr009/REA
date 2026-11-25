export {}

declare global {
  interface Window {
    studio: {
      loadAutosave(): Promise<{ contents: string | null }>
      autosaveProject(project: unknown): Promise<{ saved: boolean }>
      saveProject(project: unknown): Promise<{ canceled: boolean; filePath?: string }>
      openProject(): Promise<{ canceled: boolean; filePath?: string; contents?: string }>
      exportText(text: string, format: 'md' | 'txt' | 'html'): Promise<{ canceled: boolean; filePath?: string }>
    }
  }
}
