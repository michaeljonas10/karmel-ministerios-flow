export const HOW_FOUND_OPTIONS: string[] = ['Integra', 'Culto Visão', 'App da Igreja', 'Indicação de Membro', 'Já sou voluntário'];

// Plataformas/ferramentas técnicas agrupadas por categoria (Follow / Comunicação)
export const PLATFORM_GROUPS: { label: string; items: string[] }[] = [
  {
    label: 'Design Gráfico',
    items: ['Canva', 'Photoshop', 'Illustrator', 'Figma', 'CorelDRAW', 'InDesign'],
  },
  {
    label: 'Vídeo & Edição',
    items: ['Premiere Pro', 'DaVinci Resolve', 'After Effects', 'Final Cut Pro', 'CapCut'],
  },
  {
    label: 'Fotografia & Captação',
    items: ['Fotografia', 'Captação de Vídeo', 'Drone', 'Lightroom'],
  },
  {
    label: 'Som & Áudio',
    items: ['Operação de Mesa de Som', 'ProTools', 'Ableton', 'Logic Pro', 'Audacity'],
  },
  {
    label: 'Projeção & Iluminação',
    items: ['ProPresenter', 'Resolume', 'Iluminação Cênica', 'Millumin'],
  },
  {
    label: 'Streaming',
    items: ['OBS Studio', 'StreamLabs', 'vMix', 'Wirecast'],
  },
  {
    label: 'Redes Sociais & Conteúdo',
    items: ['Instagram / Reels', 'TikTok', 'YouTube', 'Copywriting / Legendas', 'WordPress'],
  },
];

export type JourneyStage =
  | 'cadastrado'
  | 'grupo_acolhimento'
  | 'pesquisa_area'
  | 'direcionado_area'
  | 'contato_coordenador'
  | 'coordenador_contatou'
  | 'grupo_area'
  | 'treinamento'
  | 'primeira_escala'
  | 'estabelecido'
  | 'mudou_area'
  | 'nao_retornou';

export const STAGE_LABELS: Record<JourneyStage, string> = {
  cadastrado: 'Novo Cadastro',
  grupo_acolhimento: 'Grupo de Acolhimento',
  pesquisa_area: 'Conhecendo as Áreas',
  direcionado_area: 'Direcionado para Área',
  contato_coordenador: 'Aguardando Contato',
  coordenador_contatou: 'Em Conversa com Coord.',
  grupo_area: 'No Grupo da Área',
  treinamento: 'Em Treinamento',
  primeira_escala: 'Primeira Escala',
  estabelecido: 'Ativo no Ministério',
  mudou_area: 'Transferido',
  nao_retornou: 'Sem Retorno',
};

// Stages that are part of the progression track
export const STAGE_ORDER: JourneyStage[] = [
  'cadastrado',
  'grupo_acolhimento',
  'pesquisa_area',
  'direcionado_area',
  'contato_coordenador',
  'coordenador_contatou',
  'grupo_area',
  'treinamento',
  'primeira_escala',
  'estabelecido',
];

// Off-track statuses — not part of the progression, hide the track
export const OFF_TRACK_STAGES: JourneyStage[] = ['mudou_area', 'nao_retornou'];

export interface StageHistoryEntry {
  stage: JourneyStage;
  date: string;
  note?: string;
  changedBy?: string;
}

export interface ContactLogEntry {
  id: string;
  contactedBy: string;
  contactedAt: string;
}

export interface Volunteer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  registeredAt: string;
  ministryId: string;
  subArea: string;      // subárea primária
  subAreas: string[];   // todas as subáreas (inclui a primária)
  coordinator: string;
  currentStage: JourneyStage;
  stageHistory: StageHistoryEntry[];
  notes: string;
  howFound?: string;
  participatesGc?: boolean;
  platforms?: string[];
  archivedAt?: string;
  lastContactDate: string;
  alertDays?: number;
  birthday?: string;
  contactAttempts: number;
}

export interface SubArea {
  id: string;
  name: string;
  coordinator: string;        // legacy freetext fallback
  coordinatorNames: string[]; // derived from user_profiles assignments
  volunteerCount: number;
  capacity?: number;
}

export interface Ministry {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  icon: string;
  subAreas: SubArea[];
  coordinators: string[];
  journeyStages?: JourneyStage[]; // null/undefined = usar STAGE_ORDER completo
}

/** Retorna as etapas configuradas para o ministério, ou o fluxo completo como fallback. */
export function getMinistryStages(ministry?: Ministry): JourneyStage[] {
  if (ministry?.journeyStages && ministry.journeyStages.length > 0) {
    return ministry.journeyStages;
  }
  return STAGE_ORDER;
}
