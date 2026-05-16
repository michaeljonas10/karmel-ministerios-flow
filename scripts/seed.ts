import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fzbxzcwopgwsojxmckpa.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Ynh6Y3dvcGd3c29qeG1ja3BhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg3Nzc0NSwiZXhwIjoyMDk0NDUzNzQ1fQ.GM8x2sVslJ1TeWNmBZUopQqa8GdMpLzHNBLLvEJ3S0M'

const supabase = createClient(supabaseUrl, serviceRoleKey)

// ==================== MINISTRIES ====================
const ministriesData = [
  {
    id: 'comunicacao',
    name: 'Comunicação',
    color: '#3b82f6',
    icon: 'Camera',
    coordinators: ['Larissa', 'Isabella', 'Michael', 'Micaelly'],
  },
  {
    id: 'louvor',
    name: 'Louvor',
    color: '#8b5cf6',
    icon: 'Music',
    coordinators: ['Pr. André', 'Camila Ferreira', 'Rafael Mendes'],
  },
  {
    id: 'infantil',
    name: 'Infantil',
    color: '#f59e0b',
    icon: 'Baby',
    coordinators: ['Tia Beth', 'Simone Cardoso', 'Gustavo Lima'],
  },
  {
    id: 'jovens',
    name: 'Jovens',
    color: '#10b981',
    icon: 'Zap',
    coordinators: ['Pr. Lucas', 'Ana Paula Reis', 'Bruno Costa'],
  },
  {
    id: 'intercessao',
    name: 'Intercessão',
    color: '#6366f1',
    icon: 'Heart',
    coordinators: ['Irmã Maria', 'Paulo Batista', 'Fernanda Luz'],
  },
  {
    id: 'hospitalidade',
    name: 'Hospitalidade',
    color: '#f97316',
    icon: 'Home',
    coordinators: ['Dona Rosa', 'Carlos Neto', 'Juliana Moura'],
  },
]

// ==================== SUB AREAS ====================
const subAreasData = [
  // Comunicação
  { id: 'fotografia', ministry_id: 'comunicacao', name: 'Fotografia', coordinator: 'Larissa' },
  { id: 'edicao_video', ministry_id: 'comunicacao', name: 'Edição de Vídeo', coordinator: 'Michael' },
  { id: 'som', ministry_id: 'comunicacao', name: 'Som', coordinator: 'Isabella' },
  { id: 'criacao_conteudo', ministry_id: 'comunicacao', name: 'Criação de Conteúdo', coordinator: 'Micaelly' },
  { id: 'redes_sociais', ministry_id: 'comunicacao', name: 'Redes Sociais', coordinator: 'Micaelly' },
  { id: 'design_grafico', ministry_id: 'comunicacao', name: 'Design Gráfico', coordinator: 'Isabella' },
  { id: 'copywriting', ministry_id: 'comunicacao', name: 'Copywriting', coordinator: 'Larissa' },
  { id: 'iluminacao', ministry_id: 'comunicacao', name: 'Iluminação', coordinator: 'Michael' },
  { id: 'projecao', ministry_id: 'comunicacao', name: 'Projeção', coordinator: 'Isabella' },
  { id: 'streaming', ministry_id: 'comunicacao', name: 'Streaming', coordinator: 'Michael' },
  { id: 'stories', ministry_id: 'comunicacao', name: 'Stories', coordinator: 'Micaelly' },
  // Louvor
  { id: 'vocal', ministry_id: 'louvor', name: 'Vocal', coordinator: 'Camila Ferreira' },
  { id: 'instrumentos', ministry_id: 'louvor', name: 'Instrumentos', coordinator: 'Rafael Mendes' },
  { id: 'direcao_musical', ministry_id: 'louvor', name: 'Direção Musical', coordinator: 'Pr. André' },
  { id: 'tecnica_som', ministry_id: 'louvor', name: 'Técnica de Som', coordinator: 'Rafael Mendes' },
  // Infantil
  { id: 'ensino_biblico', ministry_id: 'infantil', name: 'Ensino Bíblico', coordinator: 'Simone Cardoso' },
  { id: 'recreacao', ministry_id: 'infantil', name: 'Recreação', coordinator: 'Gustavo Lima' },
  { id: 'coordenacao', ministry_id: 'infantil', name: 'Coordenação', coordinator: 'Tia Beth' },
  { id: 'bercario', ministry_id: 'infantil', name: 'Berçário', coordinator: 'Simone Cardoso' },
  // Jovens
  { id: 'louvor_jovem', ministry_id: 'jovens', name: 'Louvor Jovem', coordinator: 'Ana Paula Reis' },
  { id: 'celulas', ministry_id: 'jovens', name: 'Células', coordinator: 'Bruno Costa' },
  { id: 'eventos', ministry_id: 'jovens', name: 'Eventos', coordinator: 'Pr. Lucas' },
  { id: 'missoes', ministry_id: 'jovens', name: 'Missões', coordinator: 'Pr. Lucas' },
  // Intercessão
  { id: 'oracao', ministry_id: 'intercessao', name: 'Oração', coordinator: 'Paulo Batista' },
  { id: 'vigilia', ministry_id: 'intercessao', name: 'Vigília', coordinator: 'Irmã Maria' },
  { id: 'camara_oracao', ministry_id: 'intercessao', name: 'Câmara de Oração', coordinator: 'Fernanda Luz' },
  { id: 'grupos_jejum', ministry_id: 'intercessao', name: 'Grupos de Jejum', coordinator: 'Irmã Maria' },
  // Hospitalidade
  { id: 'recepcao', ministry_id: 'hospitalidade', name: 'Recepção', coordinator: 'Juliana Moura' },
  { id: 'cafe', ministry_id: 'hospitalidade', name: 'Café', coordinator: 'Dona Rosa' },
  { id: 'decoracao', ministry_id: 'hospitalidade', name: 'Decoração', coordinator: 'Juliana Moura' },
  { id: 'estacionamento', ministry_id: 'hospitalidade', name: 'Estacionamento', coordinator: 'Carlos Neto' },
]

// ==================== VOLUNTEERS & STAGE HISTORY ====================
const today = new Date('2026-05-15')

function daysAgo(days: number): string {
  const d = new Date(today)
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

const STAGE_ORDER = [
  'cadastrado', 'grupo_acolhimento', 'pesquisa_area', 'direcionado_area',
  'contato_coordenador', 'coordenador_contatou', 'grupo_area',
  'treinamento', 'primeira_escala', 'estabelecido',
]

function stagesUpTo(target: string): string[] {
  const idx = STAGE_ORDER.indexOf(target)
  return STAGE_ORDER.slice(0, idx + 1)
}

function buildHistory(volunteerId: string, stages: string[], startDay: number) {
  return stages.map((stage, i) => ({
    volunteer_id: volunteerId,
    stage,
    date: daysAgo(startDay - i * 3),
    note: i === 0 ? 'Cadastro inicial via formulário de interesse' : null,
  }))
}

interface VolunteerRow {
  id: string
  name: string
  phone: string
  email?: string
  registered_at: string
  ministry_id: string
  sub_area: string
  coordinator: string
  current_stage: string
  notes: string
  last_contact_date: string
  alert_days?: number
}

const volunteersData: VolunteerRow[] = [
  { id: 'v001', name: 'Ana Beatriz Santos', phone: '(31) 99874-5621', email: 'anabeatriz@gmail.com', registered_at: daysAgo(42), ministry_id: 'comunicacao', sub_area: 'Fotografia', coordinator: 'Larissa', current_stage: 'estabelecido', notes: 'Excelente fotógrafa, já atuou em 3 cultos.', last_contact_date: daysAgo(5) },
  { id: 'v002', name: 'Carlos Eduardo Mendes', phone: '(31) 98765-4321', email: 'ceduardo@hotmail.com', registered_at: daysAgo(35), ministry_id: 'comunicacao', sub_area: 'Edição de Vídeo', coordinator: 'Michael', current_stage: 'treinamento', notes: 'Tem experiência com Adobe Premiere.', last_contact_date: daysAgo(4) },
  { id: 'v003', name: 'Fernanda Lima', phone: '(31) 97654-3210', registered_at: daysAgo(28), ministry_id: 'comunicacao', sub_area: 'Design Gráfico', coordinator: 'Isabella', current_stage: 'grupo_area', notes: 'Estudante de Design na UFMG.', last_contact_date: daysAgo(3) },
  { id: 'v004', name: 'Gabriel Rocha', phone: '(31) 96543-2109', email: 'gabriel.rocha@gmail.com', registered_at: daysAgo(20), ministry_id: 'comunicacao', sub_area: 'Redes Sociais', coordinator: 'Micaelly', current_stage: 'coordenador_contatou', notes: 'Muito engajado, respondeu rapidamente.', last_contact_date: daysAgo(2) },
  { id: 'v005', name: 'Juliana Oliveira', phone: '(31) 95432-1098', email: 'juliana.oliveira@outlook.com', registered_at: daysAgo(55), ministry_id: 'comunicacao', sub_area: 'Streaming', coordinator: 'Michael', current_stage: 'estabelecido', notes: 'Voluntária desde março, já domina o OBS.', last_contact_date: daysAgo(7) },
  { id: 'v006', name: 'Lucas Alves', phone: '(31) 94321-0987', registered_at: daysAgo(60), ministry_id: 'comunicacao', sub_area: 'Som', coordinator: 'Isabella', current_stage: 'primeira_escala', notes: 'Técnico de som formado.', last_contact_date: daysAgo(12) },
  { id: 'v007', name: 'Marina Costa', phone: '(31) 93210-9876', email: 'marina.costa@gmail.com', registered_at: daysAgo(15), ministry_id: 'comunicacao', sub_area: 'Copywriting', coordinator: 'Larissa', current_stage: 'contato_coordenador', notes: 'Jornalista, ótima escrita.', last_contact_date: daysAgo(15), alert_days: 15 },
  { id: 'v008', name: 'Pedro Henrique', phone: '(31) 92109-8765', registered_at: daysAgo(10), ministry_id: 'comunicacao', sub_area: 'Iluminação', coordinator: 'Michael', current_stage: 'direcionado_area', notes: 'Iniciante, entusiasmado.', last_contact_date: daysAgo(8), alert_days: 8 },
  { id: 'v009', name: 'Rafaela Gomes', phone: '(31) 91098-7654', email: 'rafaela@gmail.com', registered_at: daysAgo(8), ministry_id: 'comunicacao', sub_area: 'Stories', coordinator: 'Micaelly', current_stage: 'pesquisa_area', notes: '', last_contact_date: daysAgo(5) },
  { id: 'v010', name: 'Thiago Barbosa', phone: '(31) 90987-6543', email: 'thiago.b@hotmail.com', registered_at: daysAgo(5), ministry_id: 'comunicacao', sub_area: 'Criação de Conteúdo', coordinator: 'Micaelly', current_stage: 'grupo_acolhimento', notes: 'Veio através do evento Conecta.', last_contact_date: daysAgo(2) },
  { id: 'v011', name: 'Beatriz Pinheiro', phone: '(31) 99111-2233', registered_at: daysAgo(45), ministry_id: 'comunicacao', sub_area: 'Projeção', coordinator: 'Isabella', current_stage: 'estabelecido', notes: 'Nunca faltou em uma escala.', last_contact_date: daysAgo(3) },
  { id: 'v012', name: 'Diego Santana', phone: '(31) 98222-3344', email: 'diego.santana@gmail.com', registered_at: daysAgo(25), ministry_id: 'comunicacao', sub_area: 'Fotografia', coordinator: 'Larissa', current_stage: 'grupo_area', notes: 'Fotógrafo amador, muito talentoso.', last_contact_date: daysAgo(6) },
  { id: 'v013', name: 'Amanda Ferreira', phone: '(31) 97333-4455', email: 'amanda.ferreira@gmail.com', registered_at: daysAgo(50), ministry_id: 'louvor', sub_area: 'Vocal', coordinator: 'Camila Ferreira', current_stage: 'estabelecido', notes: 'Soprano, já lidera a equipe vocal.', last_contact_date: daysAgo(4) },
  { id: 'v014', name: 'Bruno Machado', phone: '(31) 96444-5566', registered_at: daysAgo(40), ministry_id: 'louvor', sub_area: 'Instrumentos', coordinator: 'Rafael Mendes', current_stage: 'primeira_escala', notes: 'Guitarrista, 10 anos de experiência.', last_contact_date: daysAgo(9), alert_days: 9 },
  { id: 'v015', name: 'Cintia Rocha', phone: '(31) 95555-6677', email: 'cintia.rocha@gmail.com', registered_at: daysAgo(30), ministry_id: 'louvor', sub_area: 'Vocal', coordinator: 'Camila Ferreira', current_stage: 'treinamento', notes: 'Tem aula de canto.', last_contact_date: daysAgo(5) },
  { id: 'v016', name: 'Danilo Santos', phone: '(31) 94666-7788', registered_at: daysAgo(18), ministry_id: 'louvor', sub_area: 'Técnica de Som', coordinator: 'Rafael Mendes', current_stage: 'coordenador_contatou', notes: '', last_contact_date: daysAgo(7), alert_days: 7 },
  { id: 'v017', name: 'Elisa Cunha', phone: '(31) 93777-8899', email: 'elisa.cunha@hotmail.com', registered_at: daysAgo(12), ministry_id: 'louvor', sub_area: 'Direção Musical', coordinator: 'Pr. André', current_stage: 'contato_coordenador', notes: 'Formada em música pela Escola de Música BH.', last_contact_date: daysAgo(10), alert_days: 10 },
  { id: 'v018', name: 'Felipe Carvalho', phone: '(31) 92888-9900', registered_at: daysAgo(7), ministry_id: 'louvor', sub_area: 'Instrumentos', coordinator: 'Rafael Mendes', current_stage: 'grupo_acolhimento', notes: 'Baterista iniciante.', last_contact_date: daysAgo(3) },
  { id: 'v019', name: 'Giovana Teixeira', phone: '(31) 91999-0011', email: 'giovana.t@gmail.com', registered_at: daysAgo(60), ministry_id: 'louvor', sub_area: 'Vocal', coordinator: 'Camila Ferreira', current_stage: 'estabelecido', notes: 'Uma das principais vocalistas.', last_contact_date: daysAgo(2) },
  { id: 'v020', name: 'Henrique Dias', phone: '(31) 99000-1122', registered_at: daysAgo(22), ministry_id: 'louvor', sub_area: 'Instrumentos', coordinator: 'Rafael Mendes', current_stage: 'grupo_area', notes: 'Baixista.', last_contact_date: daysAgo(11), alert_days: 11 },
  { id: 'v021', name: 'Isabela Nascimento', phone: '(31) 98111-2233', email: 'isabela.n@gmail.com', registered_at: daysAgo(55), ministry_id: 'infantil', sub_area: 'Ensino Bíblico', coordinator: 'Simone Cardoso', current_stage: 'estabelecido', notes: 'Pedagoga, incrível com as crianças.', last_contact_date: daysAgo(4) },
  { id: 'v022', name: 'Jonas Pereira', phone: '(31) 97222-3344', registered_at: daysAgo(35), ministry_id: 'infantil', sub_area: 'Recreação', coordinator: 'Gustavo Lima', current_stage: 'treinamento', notes: 'Educador físico.', last_contact_date: daysAgo(6) },
  { id: 'v023', name: 'Karla Matos', phone: '(31) 96333-4455', email: 'karla.matos@gmail.com', registered_at: daysAgo(25), ministry_id: 'infantil', sub_area: 'Berçário', coordinator: 'Simone Cardoso', current_stage: 'grupo_area', notes: 'Mãe de 2, muito cuidadosa.', last_contact_date: daysAgo(8), alert_days: 8 },
  { id: 'v024', name: 'Leonardo Araújo', phone: '(31) 95444-5566', registered_at: daysAgo(15), ministry_id: 'infantil', sub_area: 'Coordenação', coordinator: 'Tia Beth', current_stage: 'coordenador_contatou', notes: '', last_contact_date: daysAgo(14), alert_days: 14 },
  { id: 'v025', name: 'Mariana Vieira', phone: '(31) 94555-6677', email: 'mariana.v@hotmail.com', registered_at: daysAgo(10), ministry_id: 'infantil', sub_area: 'Ensino Bíblico', coordinator: 'Simone Cardoso', current_stage: 'direcionado_area', notes: 'Professora de escola pública.', last_contact_date: daysAgo(7), alert_days: 7 },
  { id: 'v026', name: 'Nelson Reis', phone: '(31) 93666-7788', registered_at: daysAgo(6), ministry_id: 'infantil', sub_area: 'Recreação', coordinator: 'Gustavo Lima', current_stage: 'pesquisa_area', notes: '', last_contact_date: daysAgo(3) },
  { id: 'v027', name: 'Olivia Freitas', phone: '(31) 92777-8899', email: 'olivia.freitas@gmail.com', registered_at: daysAgo(48), ministry_id: 'infantil', sub_area: 'Berçário', coordinator: 'Simone Cardoso', current_stage: 'estabelecido', notes: 'Enfermeira, indispensável no berçário.', last_contact_date: daysAgo(5) },
  { id: 'v028', name: 'Paulo Junqueira', phone: '(31) 91888-9900', email: 'paulo.j@gmail.com', registered_at: daysAgo(45), ministry_id: 'jovens', sub_area: 'Louvor Jovem', coordinator: 'Ana Paula Reis', current_stage: 'estabelecido', notes: 'Líder natural, já ajuda outros voluntários.', last_contact_date: daysAgo(3) },
  { id: 'v029', name: 'Quézia Almeida', phone: '(31) 99888-0011', registered_at: daysAgo(32), ministry_id: 'jovens', sub_area: 'Células', coordinator: 'Bruno Costa', current_stage: 'primeira_escala', notes: 'Lidera célula no bairro Buritis.', last_contact_date: daysAgo(8), alert_days: 8 },
  { id: 'v030', name: 'Ricardo Moura', phone: '(31) 98888-1122', email: 'ricardo.m@gmail.com', registered_at: daysAgo(20), ministry_id: 'jovens', sub_area: 'Eventos', coordinator: 'Pr. Lucas', current_stage: 'treinamento', notes: 'Organizador nato.', last_contact_date: daysAgo(5) },
  { id: 'v031', name: 'Sabrina Castro', phone: '(31) 97888-2233', registered_at: daysAgo(14), ministry_id: 'jovens', sub_area: 'Missões', coordinator: 'Pr. Lucas', current_stage: 'grupo_area', notes: 'Interesse em missões internacionais.', last_contact_date: daysAgo(7), alert_days: 7 },
  { id: 'v032', name: 'Tiago Lopes', phone: '(31) 96888-3344', email: 'tiago.lopes@hotmail.com', registered_at: daysAgo(9), ministry_id: 'jovens', sub_area: 'Louvor Jovem', coordinator: 'Ana Paula Reis', current_stage: 'contato_coordenador', notes: '', last_contact_date: daysAgo(9), alert_days: 9 },
  { id: 'v033', name: 'Ursula Lima', phone: '(31) 95888-4455', registered_at: daysAgo(4), ministry_id: 'jovens', sub_area: 'Células', coordinator: 'Bruno Costa', current_stage: 'grupo_acolhimento', notes: 'Veio com amigo do ministério.', last_contact_date: daysAgo(2) },
  { id: 'v034', name: 'Victor Azevedo', phone: '(31) 94888-5566', email: 'victor.az@gmail.com', registered_at: daysAgo(58), ministry_id: 'jovens', sub_area: 'Eventos', coordinator: 'Pr. Lucas', current_stage: 'estabelecido', notes: 'Organizou o retiro de jovens 2026.', last_contact_date: daysAgo(4) },
  { id: 'v035', name: 'Wanda Borges', phone: '(31) 93888-6677', email: 'wanda.borges@gmail.com', registered_at: daysAgo(50), ministry_id: 'intercessao', sub_area: 'Oração', coordinator: 'Paulo Batista', current_stage: 'estabelecido', notes: 'Intercessora fiel, nunca falta.', last_contact_date: daysAgo(2) },
  { id: 'v036', name: 'Xavier Nunes', phone: '(31) 92888-7788', registered_at: daysAgo(38), ministry_id: 'intercessao', sub_area: 'Vigília', coordinator: 'Irmã Maria', current_stage: 'treinamento', notes: '', last_contact_date: daysAgo(10), alert_days: 10 },
  { id: 'v037', name: 'Yasmin Medeiros', phone: '(31) 91888-8899', email: 'yasmin.m@gmail.com', registered_at: daysAgo(22), ministry_id: 'intercessao', sub_area: 'Câmara de Oração', coordinator: 'Fernanda Luz', current_stage: 'grupo_area', notes: 'Costuma orar 2 horas por dia.', last_contact_date: daysAgo(6) },
  { id: 'v038', name: 'Zilda Prado', phone: '(31) 99777-9900', registered_at: daysAgo(16), ministry_id: 'intercessao', sub_area: 'Grupos de Jejum', coordinator: 'Irmã Maria', current_stage: 'coordenador_contatou', notes: '', last_contact_date: daysAgo(16), alert_days: 16 },
  { id: 'v039', name: 'Alexandre Melo', phone: '(31) 98777-0011', email: 'alexandre.m@gmail.com', registered_at: daysAgo(11), ministry_id: 'intercessao', sub_area: 'Oração', coordinator: 'Paulo Batista', current_stage: 'direcionado_area', notes: 'Pastor de célula em sua antiga igreja.', last_contact_date: daysAgo(8), alert_days: 8 },
  { id: 'v040', name: 'Brenda Correia', phone: '(31) 97777-1122', registered_at: daysAgo(5), ministry_id: 'intercessao', sub_area: 'Vigília', coordinator: 'Irmã Maria', current_stage: 'pesquisa_area', notes: '', last_contact_date: daysAgo(3) },
  { id: 'v041', name: 'Caio Andrade', phone: '(31) 96777-2233', email: 'caio.andrade@hotmail.com', registered_at: daysAgo(62), ministry_id: 'intercessao', sub_area: 'Câmara de Oração', coordinator: 'Fernanda Luz', current_stage: 'estabelecido', notes: 'Fundador do grupo de oração das 6h.', last_contact_date: daysAgo(3) },
  { id: 'v042', name: 'Denise Monteiro', phone: '(31) 95777-3344', email: 'denise.m@gmail.com', registered_at: daysAgo(48), ministry_id: 'hospitalidade', sub_area: 'Recepção', coordinator: 'Juliana Moura', current_stage: 'estabelecido', notes: 'Sorriso contagiante, excelente para recepção.', last_contact_date: daysAgo(4) },
  { id: 'v043', name: 'Eduardo Campos', phone: '(31) 94777-4455', registered_at: daysAgo(36), ministry_id: 'hospitalidade', sub_area: 'Café', coordinator: 'Dona Rosa', current_stage: 'treinamento', notes: 'Barista profissional.', last_contact_date: daysAgo(7), alert_days: 7 },
  { id: 'v044', name: 'Fabiana Torres', phone: '(31) 93777-5566', email: 'fabiana.t@gmail.com', registered_at: daysAgo(24), ministry_id: 'hospitalidade', sub_area: 'Decoração', coordinator: 'Juliana Moura', current_stage: 'grupo_area', notes: 'Decoradora de eventos.', last_contact_date: daysAgo(5) },
  { id: 'v045', name: 'Geraldo Pimentel', phone: '(31) 92777-6677', registered_at: daysAgo(17), ministry_id: 'hospitalidade', sub_area: 'Estacionamento', coordinator: 'Carlos Neto', current_stage: 'coordenador_contatou', notes: '', last_contact_date: daysAgo(17), alert_days: 17 },
  { id: 'v046', name: 'Helena Ramos', phone: '(31) 91777-7788', email: 'helena.ramos@gmail.com', registered_at: daysAgo(13), ministry_id: 'hospitalidade', sub_area: 'Recepção', coordinator: 'Juliana Moura', current_stage: 'contato_coordenador', notes: 'Trabalha em atendimento ao cliente.', last_contact_date: daysAgo(11), alert_days: 11 },
  { id: 'v047', name: 'Igor Sousa', phone: '(31) 99666-8899', registered_at: daysAgo(8), ministry_id: 'hospitalidade', sub_area: 'Café', coordinator: 'Dona Rosa', current_stage: 'direcionado_area', notes: '', last_contact_date: daysAgo(6) },
  { id: 'v048', name: 'Joana Mendes', phone: '(31) 98666-9900', email: 'joana.mendes@hotmail.com', registered_at: daysAgo(3), ministry_id: 'hospitalidade', sub_area: 'Decoração', coordinator: 'Juliana Moura', current_stage: 'cadastrado', notes: 'Novo cadastro, aguardando contato.', last_contact_date: daysAgo(3) },
  { id: 'v049', name: 'Kauã Ribeiro', phone: '(31) 97666-0011', registered_at: daysAgo(52), ministry_id: 'hospitalidade', sub_area: 'Estacionamento', coordinator: 'Carlos Neto', current_stage: 'estabelecido', notes: 'Controla todo o fluxo do estacionamento.', last_contact_date: daysAgo(6) },
  { id: 'v050', name: 'Luana Cavalcanti', phone: '(31) 96666-1122', email: 'luana.c@gmail.com', registered_at: daysAgo(30), ministry_id: 'hospitalidade', sub_area: 'Recepção', coordinator: 'Juliana Moura', current_stage: 'primeira_escala', notes: 'Bilíngue, ajuda com visitantes estrangeiros.', last_contact_date: daysAgo(10), alert_days: 10 },
  { id: 'v051', name: 'Mateus Xavier', phone: '(31) 95666-2233', registered_at: daysAgo(7), ministry_id: 'comunicacao', sub_area: 'Edição de Vídeo', coordinator: 'Michael', current_stage: 'grupo_acolhimento', notes: 'YouTuber com 5k seguidores.', last_contact_date: daysAgo(4) },
  { id: 'v052', name: 'Nicole Faria', phone: '(31) 94666-3344', email: 'nicole.faria@gmail.com', registered_at: daysAgo(33), ministry_id: 'louvor', sub_area: 'Vocal', coordinator: 'Camila Ferreira', current_stage: 'grupo_area', notes: 'Mezzo-soprano, fez conservatório.', last_contact_date: daysAgo(9), alert_days: 9 },
]

async function seed() {
  console.log('Seeding ministries...')
  const { error: mErr } = await supabase.from('ministries').upsert(ministriesData)
  if (mErr) { console.error('Ministries error:', mErr); process.exit(1) }
  console.log(`  Inserted ${ministriesData.length} ministries`)

  console.log('Seeding sub_areas...')
  const { error: saErr } = await supabase.from('sub_areas').upsert(subAreasData)
  if (saErr) { console.error('Sub areas error:', saErr); process.exit(1) }
  console.log(`  Inserted ${subAreasData.length} sub_areas`)

  console.log('Seeding volunteers...')
  const { error: vErr } = await supabase.from('volunteers').upsert(volunteersData)
  if (vErr) { console.error('Volunteers error:', vErr); process.exit(1) }
  console.log(`  Inserted ${volunteersData.length} volunteers`)

  console.log('Seeding stage_history...')
  const allHistory: object[] = []
  for (const v of volunteersData) {
    const stages = stagesUpTo(v.current_stage)
    const startDay = Math.round((today.getTime() - new Date(v.registered_at).getTime()) / (1000 * 60 * 60 * 24))
    allHistory.push(...buildHistory(v.id, stages, startDay))
  }

  // Insert in batches of 100
  for (let i = 0; i < allHistory.length; i += 100) {
    const batch = allHistory.slice(i, i + 100)
    const { error: shErr } = await supabase.from('stage_history').upsert(batch as any[])
    if (shErr) { console.error('Stage history error:', shErr); process.exit(1) }
  }
  console.log(`  Inserted ${allHistory.length} stage_history entries`)

  console.log('Seed complete!')
}

seed().catch(console.error)
