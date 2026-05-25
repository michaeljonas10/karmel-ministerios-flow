export const HOW_FOUND_OPTIONS: string[] = ['Integra', 'Culto Visão', 'App da Igreja', 'Indicação de Membro', 'Já sou voluntário'];

// Plataformas/ferramentas técnicas agrupadas por categoria
export const PLATFORM_GROUPS: { label: string; items: string[] }[] = [
  {
    label: 'Design',
    items: ['Canva', 'Photoshop', 'Illustrator', 'Figma', 'CorelDRAW'],
  },
  {
    label: 'Vídeo & Edição',
    items: ['Premiere Pro', 'DaVinci Resolve', 'After Effects', 'Final Cut Pro', 'CapCut'],
  },
  {
    label: 'Captação',
    items: ['Fotografia', 'Captação de Vídeo', 'OBS Studio', 'StreamLabs'],
  },
  {
    label: 'Outros',
    items: ['PowerPoint / Slides', 'Excel / Planilhas', 'WordPress', 'Redes Sociais'],
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
  cadastrado: 'Cadastrado',
  grupo_acolhimento: 'Grupo de Acolhimento',
  pesquisa_area: 'Pesquisa de Área',
  direcionado_area: 'Direcionado para Área',
  contato_coordenador: 'Contato ao Coordenador',
  coordenador_contatou: 'Coordenador Contatou',
  grupo_area: 'Grupo da Área',
  treinamento: 'Treinamento',
  primeira_escala: 'Primeira Escala',
  estabelecido: 'Estabelecido',
  mudou_area: 'Mudou de Ministério',
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
}

export interface Volunteer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  registeredAt: string;
  ministryId: string;
  subArea: string;
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
