import { useEffect, useRef, useState } from 'react'
import {
  buildProductionNotes,
  createId,
  createScenesFromScript,
  isAspectRatio,
  isMotionPreset,
  isStudioProject,
  motionPresets,
  seedProject,
  type AspectRatio,
  type CastMember,
  type Episode,
  type Scene,
  type Section,
  type StudioProject
} from './project'

const characterEmojis = ['🌿', '🌙', '🕯️', '🪞', '🕰️', '🦋', '🌧️', '🗝️', '🪻', '🎭', '🧭', '🪶', '🦊', '🐈', '🕊️', '🧤', '🎞️', '🧩', '🧪', '📷', '🪴', '🪄', '🪐', '💎']
const palettePresets = [
  { name: '세이지 시네마', colors: ['#52796B', '#D8A77C', '#A8C3A8', '#F7F5EE', '#2F4039', '#E6E0D3'] },
  { name: '허니 골드', colors: ['#B9814A', '#E9C46A', '#F2CC8F', '#FFF5DE', '#4F3A2D', '#F5EBDD'] },
  { name: '오션 틸', colors: ['#277C83', '#5DA9A0', '#AAD4CC', '#E6F3EF', '#274248', '#F2F7F5'] },
  { name: '코랄 필름', colors: ['#D57E63', '#E9A98E', '#F4D6C6', '#FFF2E9', '#593B37', '#F8EDE7'] },
  { name: '웜 모노크롬', colors: ['#38434A', '#7A8485', '#B8C0BA', '#F7F7F3', '#313638', '#F0F0EC'] },
  { name: '블루 아워', colors: ['#50708F', '#8DA8BA', '#D3E1E6', '#EEF4F5', '#394956', '#E3E9E7'] }
]

const workflowSteps: Array<{ section: Section; title: string; instruction: string; cta: string }> = [
  { section: 'lookbook', title: '작품 기획', instruction: '제목, 장르, 한 줄 소개를 적어요.', cta: '기획 정보 입력' },
  { section: 'episodes', title: '회차 만들기', instruction: '첫 번째 에피소드와 엔딩을 정해요.', cta: '첫 에피소드 만들기' },
  { section: 'script', title: '대본 작성', instruction: '대본을 붙여 넣고 장면으로 나눠요.', cta: '대본 작성하기' },
  { section: 'cast', title: '인물 정하기', instruction: '이야기에 나올 인물을 추가해요.', cta: '캐릭터 추가하기' },
  { section: 'storyboard', title: '장면 다듬기', instruction: '장소, 행동, 카메라를 정리해요.', cta: '장면 설계하기' },
  { section: 'preview', title: '영상 확인하기', instruction: '재생해 보고 WebM 영상으로 저장해요.', cta: '미리보기 재생' }
]

const sectionNames: Record<Section, string> = {
  overview: '프로젝트',
  script: '대본',
  episodes: '에피소드',
  cast: '캐릭터',
  storyboard: '스토리보드',
  lookbook: '포맷 · 룩북',
  motion: '카메라 모션',
  preview: '프리뷰 플레이어',
  export: '렌더 · 내보내기'
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
    script: 'M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h5',
    film: 'M4 4h16v16H4z M4 8h16 M4 16h16 M8 4v4 M16 4v4 M8 16v4 M16 16v4',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    board: 'M3 4h18v13H3z M7 21l5-4 5 4 M7 8h10 M7 12h6',
    palette: 'M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 1.4-3.4 1.8 1.8 0 0 1 1.3-3.1H18a3 3 0 0 0 3-3c0-4.7-4-8.5-9-8.5Z M7.5 10h.01 M10 7h.01 M15 7.5h.01 M17 10.5h.01',
    plus: 'M12 5v14 M5 12h14',
    search: 'm20 20-4.5-4.5 M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z',
    arrow: 'M5 12h14 M13 6l6 6-6 6',
    back: 'M19 12H5 M11 18l-6-6 6-6',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
    folder: 'M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    check: 'm5 12 4 4L19 6',
    clock: 'M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    close: 'M18 6 6 18 M6 6l12 12',
    play: 'm7 4 13 8-13 8z',
    pause: 'M8 5h3v14H8z M15 5h3v14h-3z',
    camera: 'M14 4h-4L8 7H4v13h16V7h-4z M12 11a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
    video: 'm15 10 5-3v10l-5-3 M4 6h11v12H4z'
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name] ?? paths.grid} />
    </svg>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 3
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
  rows?: number
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {multiline ? (
        <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      )}
    </label>
  )
}

export default function App() {
  const [project, setProject] = useState<StudioProject>(seedProject)
  const [bootstrapped, setBootstrapped] = useState(false)
  const [section, setSection] = useState<Section>('overview')
  const [activeEpisodeId, setActiveEpisodeId] = useState(project.episodes[0]?.id ?? '')
  const [activeSceneId, setActiveSceneId] = useState(project.episodes[0]?.scenes[0]?.id ?? '')
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    void window.studio.loadAutosave().then(({ contents }) => {
      if (cancelled) return
      if (contents) {
        const parsed: unknown = JSON.parse(contents)
        if (!isStudioProject(parsed)) throw new Error('자동 저장 파일의 프로젝트 형식이 올바르지 않습니다.')
        setProject(parsed)
        setActiveEpisodeId(parsed.episodes[0]?.id ?? '')
        setActiveSceneId(parsed.episodes[0]?.scenes[0]?.id ?? '')
      }
    }).catch((error: unknown) => {
      console.error('자동 저장된 프로젝트를 읽지 못했습니다.', error)
      setSaveState('error')
      setNotice('자동 저장 파일을 읽지 못했습니다. 프로젝트 파일을 열어 복구해 주세요.')
    }).finally(() => {
      if (!cancelled) setBootstrapped(true)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!bootstrapped) return
    setSaveState('saving')
    const timer = window.setTimeout(() => {
      void window.studio.autosaveProject(project).then(() => setSaveState('saved')).catch((error: unknown) => {
        console.error('프로젝트 자동 저장에 실패했습니다.', error)
        setSaveState('error')
        setNotice('자동 저장에 실패했습니다. 디스크 여유 공간과 권한을 확인해 주세요.')
      })
    }, 350)
    return () => window.clearTimeout(timer)
  }, [project, bootstrapped])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2800)
    return () => window.clearTimeout(timer)
  }, [notice])

  const activeEpisode = project.episodes.find((episode) => episode.id === activeEpisodeId) ?? project.episodes[0]
  const activeScene = activeEpisode?.scenes.find((scene) => scene.id === activeSceneId) ?? activeEpisode?.scenes[0]
  const visibleScenes = activeEpisode?.scenes.filter((scene) => !search || `${scene.title} ${scene.location} ${scene.action}`.toLowerCase().includes(search.toLowerCase())) ?? []
  const sceneCount = project.episodes.reduce((total, episode) => total + episode.scenes.length, 0)
  const completedSteps = [
    Boolean(project.title.trim() && project.logline.trim()),
    Boolean(project.episodes.length > 0),
    Boolean(project.sourceScript.trim() && sceneCount > 0),
    Boolean(project.cast.length > 0),
    Boolean(sceneCount > 0 && project.episodes.every((episode) => episode.scenes.every((scene) => scene.location !== '장소 미정' && scene.camera.trim()))),
    Boolean(sceneCount > 0)
  ]
  const nextStepIndex = completedSteps.findIndex((complete) => !complete)
  const nextStep = workflowSteps[nextStepIndex === -1 ? workflowSteps.length - 1 : nextStepIndex]
  const completedCount = completedSteps.filter(Boolean).length
  const currentWorkflowIndex = workflowSteps.findIndex((step) => step.section === section)
  function updateProject(patch: Partial<StudioProject>) {
    setProject((current) => ({ ...current, ...patch }))
  }

  function updateEpisode(id: string, patch: Partial<Episode>) {
    setProject((current) => ({
      ...current,
      episodes: current.episodes.map((episode) => episode.id === id ? { ...episode, ...patch } : episode)
    }))
  }

  function updateScene(id: string, patch: Partial<Scene>) {
    setProject((current) => ({
      ...current,
      episodes: current.episodes.map((episode) => ({
        ...episode,
        scenes: episode.scenes.map((scene) => scene.id === id ? { ...scene, ...patch } : scene)
      }))
    }))
  }

  function addEpisode() {
    const nextNumber = project.episodes.length + 1
    const episode: Episode = {
      id: createId('episode'),
      title: `새 에피소드 ${String(nextNumber).padStart(2, '0')}`,
      hook: '다음 화를 기다리게 할 마지막 질문을 적어보세요.',
      scenes: []
    }
    updateProject({ episodes: [...project.episodes, episode] })
    setActiveEpisodeId(episode.id)
    setActiveSceneId('')
    setSection('episodes')
  }

  function addScene(episodeId: string) {
    const episode = project.episodes.find((item) => item.id === episodeId)
    if (!episode) return
    const scene: Scene = {
      id: createId('scene'),
      title: `${episode.scenes.length + 1}. 새 장면`,
      location: '장소 미정',
      time: '시간 미정',
      action: '',
      dialogue: '',
      camera: '',
      motion: 'static',
      duration: 5
    }
    updateEpisode(episodeId, { scenes: [...episode.scenes, scene] })
    setActiveEpisodeId(episodeId)
    setActiveSceneId(scene.id)
    setSection('storyboard')
  }

  async function saveProjectFile() {
    try {
      const result = await window.studio.saveProject(project)
      if (!result.canceled) setNotice(`프로젝트 저장 완료 · ${result.filePath}`)
    } catch (error) {
      console.error('프로젝트 파일 저장에 실패했습니다.', error)
      setNotice('프로젝트 저장에 실패했습니다. 저장 위치를 확인해 주세요.')
    }
  }

  async function openProjectFile() {
    try {
      const result = await window.studio.openProject()
      if (result.canceled || !result.contents) return
      const parsed: unknown = JSON.parse(result.contents)
      if (!isStudioProject(parsed)) {
        setNotice('REA Short Drama Studio 프로젝트 파일이 아닙니다.')
        return
      }
      setProject(parsed)
      setActiveEpisodeId(parsed.episodes[0]?.id ?? '')
      setActiveSceneId(parsed.episodes[0]?.scenes[0]?.id ?? '')
      setNotice('프로젝트를 열었습니다.')
    } catch (error) {
      console.error('프로젝트 파일을 열지 못했습니다.', error)
      setNotice('파일을 열지 못했습니다. JSON 형식과 파일을 확인해 주세요.')
    }
  }

  async function exportNotes() {
    try {
      const result = await window.studio.exportText(buildProductionNotes(project), 'md')
      if (!result.canceled) setNotice(`제작 문서를 내보냈습니다 · ${result.filePath}`)
    } catch (error) {
      console.error('제작 문서 내보내기에 실패했습니다.', error)
      setNotice('제작 문서를 내보내지 못했습니다.')
    }
  }

  function breakScriptIntoScenes() {
    if (!activeEpisode) {
      setNotice('먼저 에피소드를 만들어 주세요.')
      return
    }
    const scenes = createScenesFromScript(project.sourceScript)
    if (scenes.length === 0) {
      setNotice('대본을 입력한 뒤 장면으로 나눠 주세요.')
      return
    }
    updateEpisode(activeEpisode.id, { scenes })
    setActiveSceneId(scenes[0].id)
    setNotice(`${scenes.length}개 장면을 ${activeEpisode.title}에 배치했습니다. 다음은 인물 정하기입니다.`)
  }

  function moveWorkflow(direction: -1 | 1) {
    const targetIndex = currentWorkflowIndex + direction
    if (targetIndex < 0) return
    if (targetIndex >= workflowSteps.length) {
      setSection('export')
      return
    }
    if (direction === 1 && section === 'episodes' && project.episodes.length === 0) {
      setNotice('먼저 에피소드 추가 버튼을 눌러 첫 회차를 만들어 주세요.')
      return
    }
    if (direction === 1 && section === 'script' && sceneCount === 0) {
      setNotice('대본을 입력한 뒤 “장면으로 나누기”를 눌러 주세요.')
      return
    }
    if (direction === 1 && section === 'storyboard' && sceneCount === 0) {
      setNotice('미리보기 전에 대본을 장면으로 나누거나 장면을 추가해 주세요.')
      return
    }
    setSection(workflowSteps[targetIndex].section)
  }

  function addCastMember() {
    const member: CastMember = {
      id: createId('cast'),
      name: '새 캐릭터',
      role: '역할을 입력하세요',
      description: '',
      accent: '#52796B',
      emoji: characterEmojis[project.cast.length % characterEmojis.length]
    }
    updateProject({ cast: [...project.cast, member] })
  }

  function createProject() {
    setProject({
      ...seedProject,
      title: '새 숏드라마',
      genre: '',
      logline: '',
      premise: '',
      sourceScript: '',
      mood: '',
      visualNotes: '',
      palette: [...palettePresets[0].colors],
      aspectRatio: '9:16',
      episodes: [],
      cast: []
    })
    setActiveEpisodeId('')
    setActiveSceneId('')
    setSection('lookbook')
    setNotice('새 프로젝트를 만들었습니다. 시리즈 브리프부터 작성하세요.')
  }

  function moveScene(episodeId: string, sceneId: string, direction: -1 | 1) {
    const episode = project.episodes.find((item) => item.id === episodeId)
    if (!episode) return
    const currentIndex = episode.scenes.findIndex((scene) => scene.id === sceneId)
    const targetIndex = currentIndex + direction
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= episode.scenes.length) return
    const scenes = [...episode.scenes]
    ;[scenes[currentIndex], scenes[targetIndex]] = [scenes[targetIndex], scenes[currentIndex]]
    updateEpisode(episodeId, { scenes })
  }

  async function attachFrame(sceneId: string, file?: File) {
    if (!file) return
    try {
      const dataUrl = await compressImage(file)
      updateScene(sceneId, { frameDataUrl: dataUrl })
      setNotice('스토리보드 프레임을 추가했습니다.')
    } catch (error) {
      console.error('스토리보드 이미지를 불러오지 못했습니다.', error)
      setNotice('이미지를 읽지 못했습니다. JPG 또는 PNG 파일을 확인해 주세요.')
    }
  }

  async function exportText(format: 'md' | 'txt' | 'html') {
    const notes = buildProductionNotes(project)
    const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(project.title)}</title><style>body{margin:0;background:#f7f6ef;color:#334139;font:15px/1.8 'Segoe UI','Malgun Gothic',sans-serif}main{max-width:900px;margin:48px auto;padding:32px;background:#fffef9;border:1px solid #dfe5d8;border-radius:16px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}</style><main><pre>${escapeHtml(notes)}</pre></main></html>`
    try {
      const result = await window.studio.exportText(format === 'html' ? html : notes, format)
      if (!result.canceled) setNotice(`제작 문서를 내보냈습니다 · ${result.filePath}`)
    } catch (error) {
      console.error('제작 문서 내보내기에 실패했습니다.', error)
      setNotice('제작 문서를 내보내지 못했습니다.')
    }
  }

  function renderContent() {
    if (section === 'overview') {
      return (
        <main className="content overview">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">처음이라면 이 순서대로</p>
              <h1>차근차근 만들어요.</h1>
              <p className="intro">1단계부터 누르면 다음에 할 일을 안내해 드려요. 입력한 내용은 자동 저장됩니다.</p>
            </div>
            <div className="overview-actions"><button className="button button-outline" onClick={createProject}><Icon name="plus" /> 새 프로젝트</button><button className="button button-outline" onClick={openProjectFile}><Icon name="folder" /> 프로젝트 열기</button></div>
          </div>

          <section className="workflow-section">
            <div className="section-heading workflow-heading">
              <div><p className="eyebrow">제작 진행 상황</p><h3>순서대로 하나씩 <span>{completedCount}/6 완료</span></h3></div>
              <p>첫 단계부터 시작해 보세요.</p>
            </div>
            <div className="workflow-list">
              {workflowSteps.map((step, index) => {
                const complete = completedSteps[index] ?? false
                const current = index === (nextStepIndex === -1 ? workflowSteps.length - 1 : nextStepIndex)
                return (
                  <button className={`workflow-step ${current ? 'current' : ''} ${complete ? 'complete' : ''}`} key={step.section} onClick={() => setSection(step.section)} aria-label={`${index + 1}단계 ${step.title}: ${step.instruction}`}>
                    <span className="workflow-number">{complete ? <Icon name="check" /> : index + 1}</span>
                    <span className="workflow-copy"><strong>{step.title}</strong><small>{step.instruction}</small></span>
                    <span className="workflow-status">{complete ? '완료' : current ? '여기부터' : '이동'}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="home-project-card">
            <div>
              <span className="eyebrow">현재 프로젝트</span>
              <strong>{project.title || '제목 없는 프로젝트'}</strong>
              <p>{project.episodes.length}개 에피소드 · {sceneCount}개 장면 · {project.cast.length}명 캐릭터</p>
            </div>
            <button className="button button-lime" onClick={() => setSection(nextStep.section)}>{nextStep.cta}<Icon name="arrow" /></button>
          </section>
        </main>
      )
    }

    if (section === 'script') {
      return (
        <main className="content detail-content">
          <PageHeading eyebrow="03 / 06 · 대본 작성" title="대본" description="대본을 적고 장면으로 나눠 주세요." tip="초안을 붙여넣고 장면이 바뀌는 곳에 빈 줄을 넣은 뒤 ‘장면으로 나누기’를 누르세요." />
          <div className="script-layout">
            <section className="panel script-editor">
              <div className="panel-top"><span className="panel-label">원고 · SOURCE</span><span className="save-chip"><span className="status-dot" /> 로컬 자동 저장</span></div>
              <Field label="초안" value={project.sourceScript} onChange={(value) => updateProject({ sourceScript: value })} multiline rows={18} placeholder="장면이나 대사를 자유롭게 입력하세요. 빈 줄을 기준으로 장면을 나눕니다." />
              <div className="script-footer"><span>{project.sourceScript.trim().split(/\s+/).filter(Boolean).length} words · {project.sourceScript.length} chars</span><button className="button button-lime" onClick={breakScriptIntoScenes}>장면으로 나누기 <Icon name="arrow" /></button></div>
            </section>
            <aside className="side-note">
              <p className="eyebrow">SCENE BUILDER</p><h3>빈 줄이<br />장면의 경계가 됩니다.</h3>
              <p>대본의 문단마다 하나의 씬 카드가 생성됩니다. 장소와 시간, 액션과 카메라를 더해 촬영 가능한 설계도로 확장하세요.</p>
              <div className="mini-flow"><span>원고</span><Icon name="arrow" /><span>씬 카드</span><Icon name="arrow" /><span>스토리보드</span></div>
              <div className="privacy-note"><span className="privacy-icon">◉</span><span><strong>기기 안에서만 작업</strong><br />외부 서버로 전송하지 않습니다.</span></div>
            </aside>
          </div>
          <section className="panel recent-scenes"><div className="section-heading compact"><div><p className="eyebrow">RECENTLY EDITED</p><h3>대본에서 이어서</h3></div><button className="text-button" onClick={() => setSection('storyboard')}>스토리보드 열기 <Icon name="arrow" /></button></div>
            <div className="scene-preview-list">{(activeEpisode?.scenes ?? []).slice(0, 3).map((scene, index) => <button key={scene.id} className="scene-preview" onClick={() => { setActiveSceneId(scene.id); setSection('storyboard') }}><span className="scene-number">{String(index + 1).padStart(2, '0')}</span><span><strong>{scene.title}</strong><small>{scene.location} · {scene.time}</small></span><Icon name="arrow" /></button>)}</div>
          </section>
        </main>
      )
    }

    if (section === 'episodes') {
      return (
        <main className="content detail-content">
          <PageHeading eyebrow="02 / 06 · 회차 만들기" title="에피소드" description="이번 이야기를 한 회차로 나눠 주세요." tip="먼저 ‘에피소드 추가’를 누른 다음 제목과 마지막에 남길 질문을 적으세요." action={<button className="button button-lime" onClick={addEpisode}><Icon name="plus" /> 에피소드 추가</button>} />
          <div className="episode-list">
            {project.episodes.map((episode, index) => (
              <section className={`episode-row ${episode.id === activeEpisodeId ? 'selected' : ''}`} key={episode.id}>
                <button className={`episode-thumb poster-${index % 3}`} onClick={() => { setActiveEpisodeId(episode.id); setSection('storyboard') }}><span>EP<br />{String(index + 1).padStart(2, '0')}</span><i className="poster-orb" /></button>
                <div className="episode-row-main">
                  <div className="episode-title-row"><span className="eyebrow">EPISODE {String(index + 1).padStart(2, '0')}</span><span className="episode-count">{episode.scenes.length} SCENES</span></div>
                  <input className="title-input" value={episode.title} onChange={(event) => updateEpisode(episode.id, { title: event.target.value })} aria-label={`에피소드 ${index + 1} 제목`} />
                  <Field label="엔딩 훅" value={episode.hook} onChange={(value) => updateEpisode(episode.id, { hook: value })} placeholder="회차 마지막 장면에서 던질 질문" />
                  <div className="episode-row-actions"><button className="text-button" onClick={() => { setActiveEpisodeId(episode.id); setSection('storyboard') }}>씬 열기 <Icon name="arrow" /></button><button className="text-button" onClick={() => addScene(episode.id)}><Icon name="plus" /> 장면 추가</button></div>
                </div>
              </section>
            ))}
            {project.episodes.length === 0 && <EmptyState title="첫 에피소드를 시작하세요" body="에피소드와 엔딩 훅을 추가해 시리즈의 리듬을 만들어보세요." action="에피소드 추가" onClick={addEpisode} />}
          </div>
        </main>
      )
    }

    if (section === 'cast') {
      return (
        <main className="content detail-content">
          <PageHeading eyebrow="04 / 06 · 인물 정하기" title="캐릭터" description="이야기에 등장하는 인물을 등록해 주세요." tip="‘캐릭터 추가’를 누르고 이름과 역할만 적어도 충분합니다." action={<button className="button button-lime" onClick={addCastMember}><Icon name="plus" /> 캐릭터 추가</button>} />
          <div className="cast-grid">
            {project.cast.map((member, index) => (
              <article className="cast-card" key={member.id}>
                <div className={`character-art character-${index % 3}`}><span className="character-initial" style={{ color: member.accent }}>{member.emoji}</span><span className="character-tag">CHARACTER / {String(index + 1).padStart(2, '0')}</span><button className="remove-button" aria-label={`${member.name} 삭제`} onClick={() => updateProject({ cast: project.cast.filter((item) => item.id !== member.id) })}><Icon name="close" /></button></div>
                <div className="cast-fields">
                  <label className="field"><span className="field-label">캐릭터 심볼</span><select value={member.emoji} onChange={(event) => updateProject({ cast: project.cast.map((item) => item.id === member.id ? { ...item, emoji: event.target.value } : item) })}>{characterEmojis.map((emoji) => <option key={emoji} value={emoji}>{emoji}</option>)}</select></label>
                  <Field label="이름" value={member.name} onChange={(value) => updateProject({ cast: project.cast.map((item) => item.id === member.id ? { ...item, name: value } : item) })} />
                  <Field label="역할" value={member.role} onChange={(value) => updateProject({ cast: project.cast.map((item) => item.id === member.id ? { ...item, role: value } : item) })} />
                  <Field label="인물 노트" value={member.description} onChange={(value) => updateProject({ cast: project.cast.map((item) => item.id === member.id ? { ...item, description: value } : item) })} multiline rows={3} placeholder="욕망, 결핍, 숨겨진 비밀을 기록하세요." />
                  <label className="color-field"><span>시그니처 컬러</span><input type="color" value={member.accent} onChange={(event) => updateProject({ cast: project.cast.map((item) => item.id === member.id ? { ...item, accent: event.target.value } : item) })} /></label>
                </div>
              </article>
            ))}
          </div>
          {project.cast.length === 0 && <EmptyState title="이야기를 움직일 인물을 추가하세요" body="이름과 역할, 인물의 핵심 노트를 적어 캐릭터 바이블을 만듭니다." action="캐릭터 추가" onClick={addCastMember} />}
        </main>
      )
    }

    if (section === 'storyboard') {
      return (
        <main className="content detail-content">
          <PageHeading eyebrow="05 / 06 · 장면 다듬기" title="스토리보드" description="장면마다 장소, 행동, 카메라를 정리해 주세요." tip="장면을 선택하고 빈칸을 채우세요. 초안에서 만든 장면도 여기서 수정할 수 있습니다." action={activeEpisode ? <button className="button button-lime" onClick={() => addScene(activeEpisode.id)}><Icon name="plus" /> 장면 추가</button> : undefined} />
          <div className="storyboard-toolbar">
            <label className="select-field"><span>에피소드</span><select value={activeEpisode?.id ?? ''} onChange={(event) => { setActiveEpisodeId(event.target.value); setActiveSceneId(project.episodes.find((episode) => episode.id === event.target.value)?.scenes[0]?.id ?? '') }}>{project.episodes.map((episode, index) => <option value={episode.id} key={episode.id}>EP {String(index + 1).padStart(2, '0')} · {episode.title}</option>)}</select></label>
            <span className="toolbar-divider" /><span className="scene-total">{activeEpisode?.scenes.length ?? 0} SHOTS IN SEQUENCE</span>
            <label className="search-field"><Icon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="장면 검색" /></label>
          </div>
          {activeEpisode && activeEpisode.scenes.length > 0 ? (
            <div className="storyboard-layout">
              <div className="shot-list">
                {visibleScenes.map((scene) => {
                  const index = activeEpisode.scenes.indexOf(scene)
                  return (
                  <div className="shot-row" key={scene.id}>
                    <button className={`shot-card ${scene.id === activeScene?.id ? 'active' : ''}`} onClick={() => setActiveSceneId(scene.id)}>
                      <div className={`shot-frame shot-${index % 4}`} style={scene.frameDataUrl ? { backgroundImage: `linear-gradient(#0003,#0003), url("${scene.frameDataUrl}")` } : undefined}><span>{String(index + 1).padStart(2, '0')}</span><i /></div>
                      <div className="shot-info"><strong>{scene.title}</strong><small>{scene.location}</small></div>
                      <span className="shot-status"><Icon name="check" /></span>
                    </button>
                    <div className="shot-reorder"><button aria-label="장면 위로 이동" onClick={() => moveScene(activeEpisode.id, scene.id, -1)} disabled={index === 0}>↑</button><button aria-label="장면 아래로 이동" onClick={() => moveScene(activeEpisode.id, scene.id, 1)} disabled={index === activeEpisode.scenes.length - 1}>↓</button></div>
                  </div>
                  )
                })}
                {search && visibleScenes.length === 0 && <p className="search-empty">검색된 장면이 없습니다. 다른 키워드로 찾아보세요.</p>}
              </div>
              {activeScene ? (
                <section className="panel scene-editor">
                  <div className="scene-editor-top"><div><p className="eyebrow">SCENE / {String(activeEpisode.scenes.findIndex((scene) => scene.id === activeScene.id) + 1).padStart(2, '0')}</p><h3>씬 디테일</h3></div><button className="remove-button" aria-label="현재 장면 삭제" onClick={() => { const scenes = activeEpisode.scenes.filter((scene) => scene.id !== activeScene.id); updateEpisode(activeEpisode.id, { scenes }); setActiveSceneId(scenes[0]?.id ?? '') }}><Icon name="close" /></button></div>
                  <Field label="장면 제목" value={activeScene.title} onChange={(value) => updateScene(activeScene.id, { title: value })} />
                  <div className="field-pair"><Field label="장소" value={activeScene.location} onChange={(value) => updateScene(activeScene.id, { location: value })} placeholder="예: 제3 온실" /><Field label="시간 / 분위기" value={activeScene.time} onChange={(value) => updateScene(activeScene.id, { time: value })} placeholder="예: 비 오는 밤" /></div>
                  <Field label="액션 · 화면에서 일어나는 일" value={activeScene.action} onChange={(value) => updateScene(activeScene.id, { action: value })} multiline rows={5} placeholder="행동과 시각적 변화를 서술하세요." />
                  <Field label="대사 / 사운드" value={activeScene.dialogue} onChange={(value) => updateScene(activeScene.id, { dialogue: value })} multiline rows={3} placeholder="인물, 대사, 효과음을 기록하세요." />
                  <Field label="카메라 · 렌즈 / 움직임 / 전환" value={activeScene.camera} onChange={(value) => updateScene(activeScene.id, { camera: value })} multiline rows={3} placeholder="예: 와이드, 천천히 푸시인, 매치 컷" />
                  <label className="field"><span className="field-label">카메라 모션</span><select value={activeScene.motion} onChange={(event) => { if (isMotionPreset(event.target.value)) updateScene(activeScene.id, { motion: event.target.value }) }}>{motionPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label>
                  <label className="range-field"><span>샷 길이 <b>{activeScene.duration}초</b></span><input type="range" min="2" max="20" step="1" value={activeScene.duration} onChange={(event) => updateScene(activeScene.id, { duration: Number(event.target.value) })} /></label>
                  <div className="frame-upload-row">{activeScene.frameDataUrl && <img src={activeScene.frameDataUrl} alt="현재 스토리보드 프레임" />}<label className="button button-outline upload-label"><Icon name="camera" /> 프레임 이미지 추가<input type="file" accept="image/*" onChange={(event) => { void attachFrame(activeScene.id, event.target.files?.[0]); event.currentTarget.value = '' }} /></label>{activeScene.frameDataUrl && <button className="text-button" onClick={() => updateScene(activeScene.id, { frameDataUrl: undefined })}>이미지 제거</button>}</div>
                  <div className="continuity-note"><span className="note-mark">↗</span><span><strong>연속성 메모</strong><small>장면 간 빛, 소품, 시선 방향을 확인하세요.</small></span></div>
                </section>
              ) : <EmptyState title="장면을 선택하세요" body="왼쪽 샷 리스트에서 편집할 장면을 고르세요." action="" onClick={() => undefined} />}
            </div>
          ) : <EmptyState title="스토리보드가 비어 있어요" body="대본 작업실에서 원고를 씬으로 나누거나, 장면을 직접 추가하세요." action="대본 작업실 열기" onClick={() => setSection('script')} />}
        </main>
      )
    }

    if (section === 'motion') {
      return (
        <main className="content detail-content">
          <PageHeading eyebrow="추가 도구" title="카메라 모션" description="장면에 카메라 움직임을 지정하고 프리뷰에서 확인합니다." tip="기본 제작 순서가 끝난 뒤 필요할 때 선택적으로 사용하세요." />
          <div className="motion-context">
            <label className="select-field"><span>적용할 장면</span><select value={activeScene?.id ?? ''} onChange={(event) => setActiveSceneId(event.target.value)}>{(activeEpisode?.scenes ?? []).map((scene, index) => <option value={scene.id} key={scene.id}>{String(index + 1).padStart(2, '0')} · {scene.title}</option>)}</select></label>
            <span>{activeScene ? `현재 설정 · ${activeScene.duration}초` : '스토리보드에서 장면을 먼저 추가하세요.'}</span>
          </div>
          <div className="motion-grid">
            {motionPresets.map((preset, index) => (
              <button className={`motion-card ${activeScene?.motion === preset.id ? 'active' : ''}`} key={preset.id} onClick={() => activeScene && updateScene(activeScene.id, { motion: preset.id })} disabled={!activeScene}>
                <span className={`motion-glyph motion-${index}`}><i /><b /></span><span className="motion-card-copy"><strong>{preset.name}</strong><small>{preset.detail}</small></span><span className="motion-index">{String(index + 1).padStart(2, '0')}</span>
              </button>
            ))}
          </div>
          <section className="panel motion-footer"><span className="note-mark">✦</span><span><strong>모션은 로컬 캔버스 프리뷰에 즉시 적용됩니다.</strong><small>외부 생성 API나 크레딧 없이 카메라 움직임을 시뮬레이션합니다.</small></span><button className="button button-outline" onClick={() => setSection('preview')}>프리뷰 열기 <Icon name="arrow" /></button></section>
        </main>
      )
    }

    if (section === 'preview') {
      return (
        <main className="content detail-content preview-content">
          <PageHeading eyebrow="06 / 06 · 영상 확인하기" title="미리보기" description="장면이 이어지는지 재생해서 확인해 주세요." tip="재생한 뒤 ‘WebM 영상 저장’을 누르면 이 PC에 영상이 저장됩니다." action={activeEpisode ? <span className="local-badge">● {activeEpisode.title}</span> : undefined} />
          {activeEpisode && activeEpisode.scenes.length > 0
            ? <PreviewPlayer scenes={activeEpisode.scenes} aspectRatio={project.aspectRatio} palette={project.palette} projectTitle={project.title} />
            : <EmptyState title="재생할 장면이 없습니다" body="대본 작업실에서 장면을 나누거나 스토리보드에서 직접 추가하세요." action="스토리보드 열기" onClick={() => setSection('storyboard')} />}
        </main>
      )
    }

    if (section === 'export') {
      return (
        <main className="content detail-content">
          <PageHeading eyebrow="07 / DELIVERY" title="렌더 · 내보내기" description="시리즈 기획을 로컬 파일로 저장합니다. 워터마크·크레딧·횟수 제한이 없습니다." tip="JSON은 나중에 다시 편집할 때, Markdown은 대본과 제작 정보를 공유할 때 사용하세요." />
          <div className="export-grid">
            <ExportCard icon="video" title="영상 프리뷰" detail="카메라 모션과 타이틀을 포함한 WebM 영상을 생성합니다." action="렌더 화면 열기" onClick={() => setSection('preview')} badge="WEBM" />
            <ExportCard icon="download" title="프로젝트 백업" detail="캐릭터, 대본, 샷 이미지와 설정을 JSON 파일로 저장합니다." action="JSON 저장" onClick={saveProjectFile} badge="JSON" />
            <ExportCard icon="script" title="제작안 문서" detail="회차, 씬, 대사, 카메라 노트를 읽기 쉬운 Markdown으로 내보냅니다." action="Markdown 저장" onClick={() => void exportText('md')} badge="MD" />
            <ExportCard icon="board" title="단독 열람 페이지" detail="프로젝트 요약을 스타일이 포함된 단일 HTML 파일로 만듭니다." action="HTML 내보내기" onClick={() => void exportText('html')} badge="HTML" />
          </div>
          <section className="panel export-guarantee"><span className="offline-icon">◉</span><div><strong>내보내기와 저장은 이 PC에서 처리됩니다.</strong><small>프로젝트 데이터, 이미지, 프리뷰 영상은 외부 서버에 전송하지 않습니다.</small></div><span className="local-badge">UNLIMITED · LOCAL</span></section>
        </main>
      )
    }

    return (
      <main className="content detail-content">
        <PageHeading eyebrow="1단계 / 6단계" title="작품 기획" description="먼저 제목과 한 줄 소개를 적어 주세요. 나머지는 나중에 바꿀 수 있습니다." tip="제목, 장르, 로그라인만 적어도 다음 단계로 넘어갈 수 있어요." />
        <section className="panel project-brief"><div className="brief-heading"><div><p className="eyebrow">첫 번째 작업</p><h3>이야기의 기본 정보</h3></div><span className="local-badge">자동 저장</span></div><div className="brief-grid"><Field label="시리즈 제목" value={project.title} onChange={(value) => updateProject({ title: value })} placeholder="예: 심야 카페" /><Field label="장르" value={project.genre} onChange={(value) => updateProject({ genre: value })} placeholder="예: 로맨스 · 미스터리" /><div className="span-two"><Field label="로그라인 · 한 줄 소개" value={project.logline} onChange={(value) => updateProject({ logline: value })} multiline rows={2} placeholder="주인공이 무엇을 원하고, 무엇이 그것을 막나요?" /></div><div className="span-two"><Field label="시리즈 개요 (선택)" value={project.premise} onChange={(value) => updateProject({ premise: value })} multiline rows={3} placeholder="이야기의 배경과 주요 사건을 간단히 적어 주세요." /></div></div></section>
        <div className="lookbook-layout">
          <section className="lookbook-board">
            <div className="lookbook-visual"><span className="visual-overline">VISUAL IDENTITY · 01</span><div className="visual-glass"><div className="glass-plant"><i /><b /><em /></div><div className="glass-glow" /></div><div className="visual-caption"><span>{project.title.toUpperCase()}</span><strong>FEEL THE<br />UNSEEN.</strong></div><div className="visual-grain" /></div>
            <div className="palette-strip">{project.palette.map((color, index) => <label key={index} className="palette-swatch"><input type="color" value={color} onChange={(event) => updateProject({ palette: project.palette.map((item, i) => i === index ? event.target.value : item) })} /><span>{color.toUpperCase()}</span></label>)}<button className="palette-add" onClick={() => updateProject({ palette: [...project.palette, '#52796B'] })} aria-label="색상 추가"><Icon name="plus" /></button></div>
          </section>
          <section className="panel lookbook-notes"><p className="eyebrow">FORMAT &amp; TONE</p><label className="field"><span className="field-label">화면 비율</span><select value={project.aspectRatio} onChange={(event) => { if (isAspectRatio(event.target.value)) updateProject({ aspectRatio: event.target.value }) }}><option value="9:16">9:16 · 세로 숏폼</option><option value="16:9">16:9 · 시네마틱 와이드</option><option value="1:1">1:1 · 스퀘어</option><option value="2.35:1">2.35:1 · 울트라 와이드</option></select></label><div className="preset-list"><span className="field-label">룩 프리셋 · 6</span>{palettePresets.map((preset) => <button key={preset.name} onClick={() => updateProject({ palette: [...preset.colors] })}><span className="preset-dots">{preset.colors.slice(0, 4).map((color) => <i key={color} style={{ backgroundColor: color }} />)}</span>{preset.name}</button>)}</div><Field label="감정 키워드 / 톤" value={project.mood} onChange={(value) => updateProject({ mood: value })} multiline rows={4} /><Field label="시각 언어 / 촬영 메모" value={project.visualNotes} onChange={(value) => updateProject({ visualNotes: value })} multiline rows={5} /><div className="lookbook-quote"><span>“</span><p>모든 장면은<br />하나의 세계처럼 보여야 합니다.</p></div></section>
        </div>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand-lockup" onClick={() => setSection('overview')} aria-label="프로젝트 홈"><span className="brand-mark">R<span>.</span></span><span className="brand-name">REA <b>STORY STUDIO</b></span></button>
        <div className="topbar-project"><span className="breadcrumb">PROJECT</span><strong>{project.title || '제목 없는 프로젝트'}</strong><span className="top-separator">/</span><span className="save-indicator"><i className={saveState} />{saveState === 'error' ? '저장 오류' : saveState === 'saving' ? '저장 중' : '모든 변경사항 저장됨'}</span></div>
        <div className="topbar-actions"><button className="button button-quiet" onClick={openProjectFile}><Icon name="folder" /> 열기</button><button className="button button-quiet" onClick={saveProjectFile}>프로젝트 저장</button><button className="button button-lime export-button" onClick={exportNotes}><Icon name="download" /> 제작안 내보내기</button></div>
      </header>
      <div className="workspace">
        <aside className="sidebar">
          <div className="workspace-label">WORKSPACE <span>01</span></div>
          <div className="nav-group">
            <span className="nav-caption">프로젝트</span>
            <NavButton active={section === 'overview'} icon="grid" label="시리즈 홈" onClick={() => setSection('overview')} />
          </div>
          <div className="nav-group">
            <span className="nav-caption">제작 순서</span>
            <NavButton active={section === 'lookbook'} icon="palette" label="1. 작품 기획" onClick={() => setSection('lookbook')} />
            <NavButton active={section === 'episodes'} icon="film" label="2. 에피소드" onClick={() => setSection('episodes')} count={String(project.episodes.length).padStart(2, '0')} />
            <NavButton active={section === 'script'} icon="script" label="3. 대본" onClick={() => setSection('script')} count={project.sourceScript ? '✓' : undefined} />
            <NavButton active={section === 'cast'} icon="users" label="4. 캐릭터" onClick={() => setSection('cast')} count={String(project.cast.length).padStart(2, '0')} />
            <NavButton active={section === 'storyboard'} icon="board" label="5. 스토리보드" onClick={() => setSection('storyboard')} count={String(sceneCount).padStart(2, '0')} />
            <NavButton active={section === 'preview'} icon="play" label="6. 미리보기" onClick={() => setSection('preview')} />
          </div>
          <div className="nav-group">
            <span className="nav-caption">추가 도구</span>
            <NavButton active={section === 'motion'} icon="camera" label="카메라 모션" onClick={() => setSection('motion')} count="12" />
            <NavButton active={section === 'export'} icon="download" label="파일 내보내기" onClick={() => setSection('export')} />
          </div>
          <div className="sidebar-bottom">
            <div className="offline-card"><span className="offline-icon">◉</span><div><strong>오프라인 스튜디오</strong><small>광고 없음 · 제한 없음</small></div><span className="online-dot" /></div>
            <div className="sidebar-version">REA CREATIVE TOOLS <span>v1.0</span></div>
          </div>
        </aside>
        <div className="main-area">
          <div className="page-topline"><span>YOUR WORKSPACE</span><span className="topline-divider">/</span><span>{sectionNames[section]}</span><span className="page-topline-right"><Icon name="clock" /> LOCAL PROJECT</span></div>
          {currentWorkflowIndex >= 0 && (
            <nav className="guided-nav" aria-label="숏드라마 제작 순서">
              <div className="guided-nav-heading">
                <div><strong>{currentWorkflowIndex + 1} / {workflowSteps.length} 단계</strong><span>{workflowSteps[currentWorkflowIndex].title}</span></div>
                <div className="guided-nav-actions">
                  <button className="button button-outline" onClick={() => moveWorkflow(-1)} disabled={currentWorkflowIndex === 0}>이전</button>
                  <button className="button button-lime" onClick={() => moveWorkflow(1)}>{currentWorkflowIndex === workflowSteps.length - 1 ? '완료 · 내보내기' : `다음 · ${workflowSteps[currentWorkflowIndex + 1].title}`}<Icon name="arrow" /></button>
                </div>
              </div>
              <ol className="guided-nav-steps">
                {workflowSteps.map((step, index) => (
                  <li key={step.section}>
                    <button className={`${index === currentWorkflowIndex ? 'current' : ''} ${completedSteps[index] ? 'complete' : ''}`} aria-current={index === currentWorkflowIndex ? 'step' : undefined} onClick={() => setSection(step.section)}>
                      <span>{completedSteps[index] ? <Icon name="check" /> : index + 1}</span>{step.title}
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          {renderContent()}
        </div>
      </div>
      {notice && <div className="toast" role="status"><span className="toast-check"><Icon name="check" /></span><span>{notice}</span><button aria-label="알림 닫기" onClick={() => setNotice('')}><Icon name="close" /></button></div>}
    </div>
  )
}

function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: string; label: string; count?: string; onClick: () => void }) {
  const hints: Record<string, string> = {
    '시리즈 홈': '진행 순서와 전체 작업 현황을 확인합니다.',
    '1. 작품 기획': '시리즈 제목, 장르, 한 줄 소개를 적습니다.',
    '2. 에피소드': '첫 회차의 제목과 마지막 장면을 정합니다.',
    '3. 대본': '대본을 적고 빈 줄마다 장면으로 나눕니다.',
    '4. 캐릭터': '이야기에 등장하는 인물과 역할을 등록합니다.',
    '5. 스토리보드': '장면, 대사, 카메라와 참고 이미지를 정리합니다.',
    '6. 미리보기': '장면을 재생하고 영상 파일을 저장합니다.',
    '카메라 모션': '장면에 카메라 움직임을 적용합니다.',
    '파일 내보내기': '프로젝트와 제작 문서를 파일로 저장합니다.'
  }
  return <button className={`nav-button ${active ? 'active' : ''}`} title={hints[label]} aria-label={`${label}. ${hints[label]}`} onClick={onClick}><Icon name={icon} /><span>{label}</span>{count && <small>{count}</small>}</button>
}

function PageHeading({ eyebrow, title, description, tip, action }: { eyebrow: string; title: string; description: string; tip?: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="intro">{description}</p>{tip && <p className="guide-tip"><span>쉽게 하기</span>{tip}</p>}</div>{action}</div>
}

function EmptyState({ title, body, action, onClick }: { title: string; body: string; action: string; onClick: () => void }) {
  return <div className="empty-state"><span className="empty-glyph"><Icon name="plus" /></span><h3>{title}</h3><p>{body}</p>{action && <button className="button button-lime" onClick={onClick}>{action} <Icon name="arrow" /></button>}</div>
}

function ExportCard({ icon, title, detail, action, badge, onClick }: { icon: string; title: string; detail: string; action: string; badge: string; onClick: () => void }) {
  return <article className="export-card"><div className="export-card-top"><span className="export-card-icon"><Icon name={icon} /></span><span className="export-badge">{badge}</span></div><h3>{title}</h3><p>{detail}</p><button className="button button-outline" onClick={onClick}>{action} <Icon name="arrow" /></button></article>
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]!)
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const ratio = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('이미지 캔버스를 초기화하지 못했습니다.'))
        return
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.84))
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('이미지 파일을 읽지 못했습니다.'))
    }
    image.src = objectUrl
  })
}

function PreviewPlayer({ scenes, aspectRatio, palette, projectTitle }: { scenes: Scene[]; aspectRatio: AspectRatio; palette: string[]; projectTitle: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const currentTimeRef = useRef(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [recording, setRecording] = useState(false)
  const [status, setStatus] = useState('')
  const dimensions = aspectRatio === '9:16' ? [540, 960] : aspectRatio === '16:9' ? [960, 540] : aspectRatio === '1:1' ? [720, 720] : [940, 400]
  const totalDuration = Math.max(1, scenes.reduce((total, scene) => total + Math.max(1, scene.duration), 0))
  const activeIndex = Math.max(0, scenes.findIndex((scene, index) => {
    const start = scenes.slice(0, index).reduce((total, item) => total + Math.max(1, item.duration), 0)
    return currentTime >= start && currentTime < start + Math.max(1, scene.duration)
  }))
  const activeScene = scenes[activeIndex]
  const sceneStart = scenes.slice(0, activeIndex).reduce((total, scene) => total + Math.max(1, scene.duration), 0)
  const localTime = Math.max(0, currentTime - sceneStart)

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  useEffect(() => {
    imageRef.current = null
    if (!activeScene?.frameDataUrl) return
    const image = new Image()
    image.onload = () => {
      imageRef.current = image
      drawFrame()
    }
    image.src = activeScene.frameDataUrl
  }, [activeScene?.frameDataUrl])

  useEffect(() => {
    drawFrame()
  }, [activeScene, aspectRatio, palette, localTime])

  useEffect(() => {
    if (!playing) return
    const startAt = performance.now() - currentTimeRef.current * 1000
    let frameId = 0
    const tick = (now: number) => {
      const time = Math.min(totalDuration, (now - startAt) / 1000)
      currentTimeRef.current = time
      setCurrentTime(time)
      if (time >= totalDuration) {
        setPlaying(false)
        return
      }
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [playing, totalDuration])

  useEffect(() => {
    if (!playing && recording && recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }, [playing, recording])

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }, [])

  function drawFrame() {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !activeScene) return
    const width = canvas.width
    const height = canvas.height
    const phase = Math.min(1, localTime / Math.max(1, activeScene.duration))
    const accent = palette[0] ?? '#52796B'
    const secondary = palette[1] ?? '#D8A77C'
    let scale = 1
    let moveX = 0
    let moveY = 0
    if (activeScene.motion === 'push-in' || activeScene.motion === 'dolly-in') scale = 1 + phase * .11
    if (activeScene.motion === 'pull-out' || activeScene.motion === 'dolly-out') scale = 1.11 - phase * .11
    if (activeScene.motion === 'crash-zoom') scale = 1 + Math.sin(phase * Math.PI) * .2
    if (activeScene.motion === 'pan-left') moveX = -phase * width * .12
    if (activeScene.motion === 'pan-right') moveX = phase * width * .12
    if (activeScene.motion === 'tilt-up') moveY = -phase * height * .1
    if (activeScene.motion === 'tilt-down') moveY = phase * height * .1
    if (activeScene.motion === 'orbit') {
      moveX = Math.sin(phase * Math.PI * 2) * width * .035
      moveY = Math.cos(phase * Math.PI * 2) * height * .025
      scale = 1.06
    }
    if (activeScene.motion === 'handheld') {
      moveX = Math.sin(localTime * 9) * width * .006
      moveY = Math.cos(localTime * 12) * height * .005
      scale = 1.04
    }

    context.clearRect(0, 0, width, height)
    context.save()
    context.translate(width / 2 + moveX, height / 2 + moveY)
    context.scale(scale, scale)
    context.translate(-width / 2, -height / 2)

    const gradient = context.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#fbf9fe')
    gradient.addColorStop(.52, accent + '24')
    gradient.addColorStop(1, '#f2edf8')
    context.fillStyle = gradient
    context.fillRect(-width * .2, -height * .2, width * 1.4, height * 1.4)

    const glow = context.createRadialGradient(width * .67, height * .37, 4, width * .62, height * .4, width * .7)
    glow.addColorStop(0, secondary + '34')
    glow.addColorStop(1, '#ffffff00')
    context.fillStyle = glow
    context.fillRect(0, 0, width, height)

    if (imageRef.current) {
      const image = imageRef.current
      const fit = Math.max(width / image.naturalWidth, height / image.naturalHeight)
      const imageWidth = image.naturalWidth * fit
      const imageHeight = image.naturalHeight * fit
      context.globalAlpha = .78
      context.drawImage(image, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight)
      context.globalAlpha = 1
      context.fillStyle = '#fbf8ff26'
      context.fillRect(0, 0, width, height)
    }

    context.strokeStyle = '#6f57891c'
    context.lineWidth = Math.max(1, width / 700)
    for (let index = 0; index < 7; index += 1) {
      const x = width * (.12 + index * .13)
      context.beginPath()
      context.moveTo(x, 0)
      context.lineTo(x, height)
      context.stroke()
    }
    context.strokeStyle = accent + 'aa'
    context.lineWidth = Math.max(2, width / 240)
    context.beginPath()
    context.ellipse(width * .66, height * .42, width * .17, height * .22, -.2, 0, Math.PI * 2)
    context.stroke()
    context.beginPath()
    context.moveTo(width * .63, height * .68)
    context.quadraticCurveTo(width * .54, height * .48, width * .67, height * .3)
    context.stroke()
    context.restore()

    context.fillStyle = '#ffffffdc'
    context.fillRect(0, height * .72, width, height * .28)
    context.fillStyle = '#715b87'
    context.font = `500 ${Math.max(12, width * .023)}px Segoe UI, sans-serif`
    context.fillText(`${String(activeIndex + 1).padStart(2, '0')} / ${scenes.length}`, width * .07, height * .79)
    context.fillStyle = '#352844'
    context.font = `700 ${Math.max(21, width * .052)}px Segoe UI, sans-serif`
    context.fillText(activeScene.title.slice(0, 30), width * .07, height * .85)
    context.fillStyle = '#655674'
    context.font = `400 ${Math.max(12, width * .022)}px Segoe UI, sans-serif`
    drawWrappedText(context, activeScene.dialogue || activeScene.action, width * .07, height * .9, width * .83, Math.max(18, width * .035), 2)
    context.fillStyle = accent
    context.fillRect(width * .07, height * .94, width * .86 * (localTime / Math.max(1, activeScene.duration)), Math.max(2, height * .003))
  }

  function jumpToScene(index: number) {
    const safeIndex = Math.max(0, Math.min(scenes.length - 1, index))
    const time = scenes.slice(0, safeIndex).reduce((total, scene) => total + Math.max(1, scene.duration), 0)
    currentTimeRef.current = time
    setCurrentTime(time)
  }

  function renderVideo() {
    const canvas = canvasRef.current
    if (!canvas?.captureStream || typeof MediaRecorder === 'undefined') {
      setStatus('이 환경에서는 WebM 렌더를 지원하지 않습니다.')
      return
    }
    try {
      const stream = canvas.captureStream(30)
      const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      const chunks: BlobPart[] = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        setRecording(false)
        recorderRef.current = null
        if (chunks.length === 0) {
          setStatus('렌더 결과가 비어 있습니다. 다시 시도해 주세요.')
          return
        }
        const url = URL.createObjectURL(new Blob(chunks, { type: mimeType ?? 'video/webm' }))
        const link = document.createElement('a')
        link.href = url
        link.download = `${projectTitle.replace(/[\\/:*?"<>|]+/g, '-') || 'short-drama'}.webm`
        link.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
        setStatus('WebM 렌더가 완료되어 다운로드 폴더에 저장되었습니다.')
      }
      recorder.onerror = () => setStatus('WebM 렌더 중 오류가 발생했습니다.')
      recorderRef.current = recorder
      currentTimeRef.current = 0
      setCurrentTime(0)
      setStatus('실시간 캔버스 프레임을 녹화하고 있습니다…')
      setRecording(true)
      recorder.start(250)
      setPlaying(true)
    } catch (error) {
      console.error('WebM 렌더에 실패했습니다.', error)
      setStatus('WebM 렌더를 시작하지 못했습니다.')
    }
  }

  const elapsedLabel = formatTime(currentTime)
  const totalLabel = formatTime(totalDuration)

  return (
    <>
      <div className="preview-stage">
        <div className="preview-screen"><canvas ref={canvasRef} width={dimensions[0]} height={dimensions[1]} /></div>
        <section className="panel preview-side">
          <p className="eyebrow">CANVAS PREVIEW</p><h3>{activeScene?.title}</h3>
          <div className="preview-motion"><span>CAMERA</span><strong>{motionPresets.find((preset) => preset.id === activeScene?.motion)?.name}</strong></div>
          <div className="preview-motion"><span>LOCATION</span><strong>{activeScene?.location || '미정'}</strong></div>
          <div className="preview-motion"><span>FORMAT</span><strong>{aspectRatio}</strong></div>
          <input className="preview-progress" aria-label="프리뷰 위치" type="range" min="0" max={totalDuration} step=".05" value={currentTime} onChange={(event) => { const time = Number(event.target.value); currentTimeRef.current = time; setCurrentTime(time) }} />
          <div className="preview-time"><span>{elapsedLabel}</span><span>{totalLabel}</span></div>
          <div className="preview-controls"><button aria-label="이전 장면" onClick={() => jumpToScene(activeIndex - 1)}>‹</button><button className="button button-lime" onClick={() => { if (currentTime >= totalDuration) { currentTimeRef.current = 0; setCurrentTime(0) } setPlaying((value) => !value) }}><Icon name={playing ? 'pause' : 'play'} /> {playing ? '일시정지' : '재생'}</button><button aria-label="다음 장면" onClick={() => jumpToScene(activeIndex + 1)}>›</button></div>
          <button className="button button-outline render-button" onClick={renderVideo} disabled={recording}><Icon name="download" /> {recording ? '영상 만드는 중…' : 'WebM 영상 저장'}</button>
          <p className="render-status" role="status">{status}</p>
        </section>
      </div>
      <div className="preview-shot-strip">{scenes.map((scene, index) => <button className={`preview-shot ${index === activeIndex ? 'active' : ''}`} key={scene.id} onClick={() => jumpToScene(index)}><small>{String(index + 1).padStart(2, '0')} · {scene.duration}s</small><strong>{scene.title}</strong></button>)}</div>
    </>
  )
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean)
  let line = ''
  let lineIndex = 0
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (context.measureText(next).width > maxWidth && line) {
      context.fillText(line, x, y + lineIndex * lineHeight)
      lineIndex += 1
      line = word
      if (lineIndex >= maxLines - 1) break
    } else {
      line = next
    }
  }
  if (line && lineIndex < maxLines) context.fillText(line, x, y + lineIndex * lineHeight, maxWidth)
}

function formatTime(seconds: number): string {
  const wholeSeconds = Math.floor(seconds)
  return `${String(Math.floor(wholeSeconds / 60)).padStart(2, '0')}:${String(wholeSeconds % 60).padStart(2, '0')}`
}
