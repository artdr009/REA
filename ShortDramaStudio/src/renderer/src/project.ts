export type Section = 'overview' | 'script' | 'episodes' | 'cast' | 'storyboard' | 'lookbook' | 'motion' | 'preview' | 'export'
export type AspectRatio = '9:16' | '16:9' | '1:1' | '2.35:1'

export const motionPresets = [
  { id: 'static', name: '고정 프레임', detail: '정적인 긴장' },
  { id: 'push-in', name: '슬로 푸시인', detail: '감정에 서서히 접근' },
  { id: 'pull-out', name: '슬로 풀아웃', detail: '인물과 공간을 분리' },
  { id: 'crash-zoom', name: '크래시 줌', detail: '충격과 반전' },
  { id: 'pan-left', name: '팬 레프트', detail: '시선을 왼쪽으로 이동' },
  { id: 'pan-right', name: '팬 라이트', detail: '시선을 오른쪽으로 이동' },
  { id: 'tilt-up', name: '틸트 업', detail: '새로운 정보의 발견' },
  { id: 'tilt-down', name: '틸트 다운', detail: '시선과 감정의 하강' },
  { id: 'dolly-in', name: '달리 인', detail: '공간을 가로지르는 접근' },
  { id: 'dolly-out', name: '달리 아웃', detail: '공간의 여백을 드러냄' },
  { id: 'orbit', name: '오빗', detail: '인물을 중심으로 회전' },
  { id: 'handheld', name: '핸드헬드', detail: '불안정한 현장감' }
] as const

export type MotionPreset = (typeof motionPresets)[number]['id']

export function isAspectRatio(value: string): value is AspectRatio {
  return ['9:16', '16:9', '1:1', '2.35:1'].includes(value)
}

export function isMotionPreset(value: string): value is MotionPreset {
  return motionPresets.some((preset) => preset.id === value)
}

export interface Scene {
  id: string
  title: string
  location: string
  time: string
  action: string
  dialogue: string
  camera: string
  motion: MotionPreset
  duration: number
  frameDataUrl?: string
}

export interface Episode {
  id: string
  title: string
  hook: string
  scenes: Scene[]
}

export interface CastMember {
  id: string
  name: string
  role: string
  description: string
  accent: string
  emoji: string
}

export interface StudioProject {
  schemaVersion: 1
  title: string
  genre: string
  logline: string
  premise: string
  sourceScript: string
  mood: string
  visualNotes: string
  palette: string[]
  aspectRatio: AspectRatio
  episodes: Episode[]
  cast: CastMember[]
}

export const seedProject: StudioProject = {
  schemaVersion: 1,
  title: '유리정원',
  genre: '미스터리 · 로맨스',
  logline: '사라진 언니의 편지를 따라간 정원사는 매일 밤 한 시간씩 과거로 돌아간다.',
  premise:
    '도시의 오래된 식물원에서 야간 관리 일을 시작한 서윤. 닫힌 온실에서 언니가 남긴 편지를 찾고, 편지에 적힌 날짜마다 식물원의 시간이 한 시간씩 되감긴다는 사실을 발견한다.',
  sourceScript:
    '온실의 시계가 자정에 멈춘다.\n\n서윤은 유리벽에 남은 손자국을 발견하고, 오래전 언니의 필체로 쓰인 이름을 읽는다.\n\n전화기 너머로 낯선 목소리가 말한다. “그날 밤, 온실 문을 연 건 너였어.”',
  mood: '차갑고 몽환적인 미스터리, 감정은 절제하고 순간적으로 번지는 온기.',
  visualNotes: '젖은 유리의 반사, 깊은 녹색 그림자, 한 프레임 안에 겹쳐 보이는 현재와 과거.',
  palette: ['#52796B', '#D8A77C', '#A8C3A8', '#F7F5EE'],
  aspectRatio: '9:16',
  episodes: [
    {
      id: 'ep-1',
      title: '멈춘 시계',
      hook: '자정의 온실에서 서윤의 이름이 새겨진 편지가 발견된다.',
      scenes: [
        {
          id: 'sc-1',
          title: '1. 유리문 너머',
          location: '도심 식물원 · 정문',
          time: '밤, 비',
          action: '서윤이 젖은 우산을 접는다. 폐관 안내판 뒤편의 온실 안에서 시계 초침 소리가 들린다.',
          dialogue: '서윤: 분명히… 여기엔 아무도 없는데.',
          camera: '와이드에서 천천히 푸시인. 유리 반사에 낯선 실루엣을 남긴다.',
          motion: 'push-in',
          duration: 5
        },
        {
          id: 'sc-2',
          title: '2. 00:00',
          location: '제3 온실',
          time: '밤, 자정',
          action: '초침이 멈추는 순간 모든 조명이 꺼진다. 유리벽에 손바닥 자국 하나가 서서히 드러난다.',
          dialogue: '무전기: 서윤 씨, 방금… 누구랑 얘기한 거예요?',
          camera: '손자국 매크로 컷에서 서윤의 눈으로 랙 포커스.',
          motion: 'crash-zoom',
          duration: 4
        },
        {
          id: 'sc-3',
          title: '3. 언니의 글씨',
          location: '닫힌 온실',
          time: '밤, 자정 이후',
          action: '화분 아래에서 오래된 편지를 꺼낸다. 편지의 첫 줄은 아직 쓰이지 않은 서윤의 이름이다.',
          dialogue: '서윤: 이건… 언니 글씨야.',
          camera: '정적인 오버숄더. 마지막 문장에서 화면을 암전한다.',
          motion: 'static',
          duration: 6
        }
      ]
    },
    {
      id: 'ep-2',
      title: '한 시간 전',
      hook: '되감긴 시간 속에서 서윤은 언니와 똑같은 목소리를 듣는다.',
      scenes: [
        {
          id: 'sc-4',
          title: '1. 다시 켜진 불',
          location: '제3 온실',
          time: '밤, 11시',
          action: '꺼졌던 조명이 켜지고, 바닥의 물방울이 거꾸로 천장으로 올라간다.',
          dialogue: '서윤: 방금 그 장면… 다시 돌아온 거야?',
          camera: '슬로 모션 인서트와 짧은 핸드헬드 리액션을 교차.',
          motion: 'handheld',
          duration: 5
        }
      ]
    }
  ],
  cast: [
    {
      id: 'cast-1',
      name: '한서윤',
      role: '주인공 · 야간 정원사',
      description: '관찰력이 뛰어나지만 감정을 드러내지 않는다. 언니의 실종을 아직 받아들이지 못했다.',
      accent: '#52796B',
      emoji: '🌿'
    },
    {
      id: 'cast-2',
      name: '한유진',
      role: '실종된 언니',
      description: '식물원 연구원. 남긴 편지와 녹음으로 현재의 서윤을 과거로 이끈다.',
      accent: '#D8A77C',
      emoji: '🌙'
    }
  ]
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function isStudioProject(value: unknown): value is StudioProject {
  if (!value || typeof value !== 'object') return false
  const project = value as Partial<StudioProject>
  return (
    project.schemaVersion === 1 &&
    typeof project.title === 'string' &&
    typeof project.aspectRatio === 'string' &&
    isAspectRatio(project.aspectRatio) &&
    Array.isArray(project.episodes) &&
    Array.isArray(project.cast) &&
    Array.isArray(project.palette) &&
    project.episodes.every((episode) =>
      !!episode &&
      typeof episode.id === 'string' &&
      typeof episode.title === 'string' &&
      Array.isArray(episode.scenes) &&
      episode.scenes.every((scene) =>
        !!scene &&
        typeof scene.id === 'string' &&
        typeof scene.title === 'string' &&
        typeof scene.action === 'string' &&
        typeof scene.duration === 'number' &&
        typeof scene.motion === 'string'
      )
    ) &&
    project.cast.every((member) => !!member && typeof member.id === 'string' && typeof member.name === 'string' && typeof member.emoji === 'string')
  )
}

export function buildProductionNotes(project: StudioProject): string {
  const lines = [
    `# ${project.title}`,
    '',
    `> ${project.logline}`,
    '',
    `**장르** ${project.genre}`,
    `**화면 비율** ${project.aspectRatio}`,
    '',
    '## 시리즈 기획',
    project.premise,
    '',
    '## 비주얼 가이드',
    project.mood,
    '',
    project.visualNotes,
    '',
    '## 캐릭터',
    ...project.cast.flatMap((member) => [
      `### ${member.name} — ${member.role}`,
      member.description,
      ''
    ]),
    '## 에피소드 구성',
    ...project.episodes.flatMap((episode, index) => [
      `### ${String(index + 1).padStart(2, '0')} · ${episode.title}`,
      `**엔딩 훅:** ${episode.hook}`,
      '',
      ...episode.scenes.flatMap((scene) => [
        `#### ${scene.title}`,
        `- 장소 / 시간: ${scene.location} · ${scene.time}`,
        `- 액션: ${scene.action}`,
        `- 대사: ${scene.dialogue}`,
        `- 카메라: ${scene.camera}`,
        ''
      ])
    ])
  ]
  return lines.join('\n')
}

export function createScenesFromScript(script: string): Scene[] {
  const passages = script
    .split(/\n\s*\n|\r?\n/)
    .map((passage) => passage.trim())
    .filter(Boolean)

  return passages.map((passage, index) => ({
    id: createId('scene'),
    title: `${index + 1}. ${passage.replace(/\s+/g, ' ').slice(0, 22)}${passage.length > 22 ? '…' : ''}`,
    location: '장소 미정',
    time: '시간 미정',
    action: passage,
    dialogue: '',
    camera: '구도와 카메라 움직임을 기록하세요.',
    motion: 'static',
    duration: 5
  }))
}
