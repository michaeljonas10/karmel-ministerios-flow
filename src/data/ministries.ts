import type { Ministry } from '../types';

export const ministries: Ministry[] = [
  {
    id: 'comunicacao',
    name: 'Comunicação',
    color: '#3b82f6',
    bgColor: '#eff6ff',
    icon: 'Camera',
    coordinators: ['Larissa', 'Isabella', 'Michael', 'Micaelly'],
    subAreas: [
      { id: 'fotografia', name: 'Fotografia', coordinator: 'Larissa', coordinatorNames: [], volunteerCount: 0 },
      { id: 'edicao_video', name: 'Edição de Vídeo', coordinator: 'Michael', coordinatorNames: [], volunteerCount: 0 },
      { id: 'som', name: 'Som', coordinator: 'Isabella', coordinatorNames: [], volunteerCount: 0 },
      { id: 'criacao_conteudo', name: 'Criação de Conteúdo', coordinator: 'Micaelly', coordinatorNames: [], volunteerCount: 0 },
      { id: 'redes_sociais', name: 'Redes Sociais', coordinator: 'Micaelly', coordinatorNames: [], volunteerCount: 0 },
      { id: 'design_grafico', name: 'Design Gráfico', coordinator: 'Isabella', coordinatorNames: [], volunteerCount: 0 },
      { id: 'copywriting', name: 'Copywriting', coordinator: 'Larissa', coordinatorNames: [], volunteerCount: 0 },
      { id: 'iluminacao', name: 'Iluminação', coordinator: 'Michael', coordinatorNames: [], volunteerCount: 0 },
      { id: 'projecao', name: 'Projeção', coordinator: 'Isabella', coordinatorNames: [], volunteerCount: 0 },
      { id: 'streaming', name: 'Streaming', coordinator: 'Michael', coordinatorNames: [], volunteerCount: 0 },
      { id: 'stories', name: 'Stories', coordinator: 'Micaelly', coordinatorNames: [], volunteerCount: 0 },
    ],
  },
  {
    id: 'louvor',
    name: 'Louvor',
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    icon: 'Music',
    coordinators: ['Pr. André', 'Camila Ferreira', 'Rafael Mendes'],
    subAreas: [
      { id: 'vocal', name: 'Vocal', coordinator: 'Camila Ferreira', coordinatorNames: [], volunteerCount: 0 },
      { id: 'instrumentos', name: 'Instrumentos', coordinator: 'Rafael Mendes', coordinatorNames: [], volunteerCount: 0 },
      { id: 'direcao_musical', name: 'Direção Musical', coordinator: 'Pr. André', coordinatorNames: [], volunteerCount: 0 },
      { id: 'tecnica_som', name: 'Técnica de Som', coordinator: 'Rafael Mendes', coordinatorNames: [], volunteerCount: 0 },
    ],
  },
  {
    id: 'infantil',
    name: 'Infantil',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    icon: 'Baby',
    coordinators: ['Tia Beth', 'Simone Cardoso', 'Gustavo Lima'],
    subAreas: [
      { id: 'ensino_biblico', name: 'Ensino Bíblico', coordinator: 'Simone Cardoso', coordinatorNames: [], volunteerCount: 0 },
      { id: 'recreacao', name: 'Recreação', coordinator: 'Gustavo Lima', coordinatorNames: [], volunteerCount: 0 },
      { id: 'coordenacao', name: 'Coordenação', coordinator: 'Tia Beth', coordinatorNames: [], volunteerCount: 0 },
      { id: 'bercario', name: 'Berçário', coordinator: 'Simone Cardoso', coordinatorNames: [], volunteerCount: 0 },
    ],
  },
  {
    id: 'jovens',
    name: 'Jovens',
    color: '#10b981',
    bgColor: '#ecfdf5',
    icon: 'Zap',
    coordinators: ['Pr. Lucas', 'Ana Paula Reis', 'Bruno Costa'],
    subAreas: [
      { id: 'louvor_jovem', name: 'Louvor Jovem', coordinator: 'Ana Paula Reis', coordinatorNames: [], volunteerCount: 0 },
      { id: 'celulas', name: 'Células', coordinator: 'Bruno Costa', coordinatorNames: [], volunteerCount: 0 },
      { id: 'eventos', name: 'Eventos', coordinator: 'Pr. Lucas', coordinatorNames: [], volunteerCount: 0 },
      { id: 'missoes', name: 'Missões', coordinator: 'Pr. Lucas', coordinatorNames: [], volunteerCount: 0 },
    ],
  },
  {
    id: 'intercessao',
    name: 'Intercessão',
    color: '#6366f1',
    bgColor: '#eef2ff',
    icon: 'Heart',
    coordinators: ['Irmã Maria', 'Paulo Batista', 'Fernanda Luz'],
    subAreas: [
      { id: 'oracao', name: 'Oração', coordinator: 'Paulo Batista', coordinatorNames: [], volunteerCount: 0 },
      { id: 'vigilia', name: 'Vigília', coordinator: 'Irmã Maria', coordinatorNames: [], volunteerCount: 0 },
      { id: 'camara_oracao', name: 'Câmara de Oração', coordinator: 'Fernanda Luz', coordinatorNames: [], volunteerCount: 0 },
      { id: 'grupos_jejum', name: 'Grupos de Jejum', coordinator: 'Irmã Maria', coordinatorNames: [], volunteerCount: 0 },
    ],
  },
  {
    id: 'hospitalidade',
    name: 'Hospitalidade',
    color: '#f97316',
    bgColor: '#fff7ed',
    icon: 'Home',
    coordinators: ['Dona Rosa', 'Carlos Neto', 'Juliana Moura'],
    subAreas: [
      { id: 'recepcao', name: 'Recepção', coordinator: 'Juliana Moura', coordinatorNames: [], volunteerCount: 0 },
      { id: 'cafe', name: 'Café', coordinator: 'Dona Rosa', coordinatorNames: [], volunteerCount: 0 },
      { id: 'decoracao', name: 'Decoração', coordinator: 'Juliana Moura', coordinatorNames: [], volunteerCount: 0 },
      { id: 'estacionamento', name: 'Estacionamento', coordinator: 'Carlos Neto', coordinatorNames: [], volunteerCount: 0 },
    ],
  },
];

export function getMinistryById(id: string): Ministry | undefined {
  return ministries.find(m => m.id === id);
}
