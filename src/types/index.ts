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
  | 'estabelecido';

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
};

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
  lastContactDate: string;
  alertDays?: number;
}

export interface SubArea {
  id: string;
  name: string;
  coordinator: string;
  volunteerCount: number;
}

export interface Ministry {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  icon: string;
  subAreas: SubArea[];
  coordinators: string[];
}
