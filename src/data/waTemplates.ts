import type { JourneyStage } from '../types';

export const WA_TEMPLATES: Partial<Record<JourneyStage, string>> = {
  cadastrado:
    'Olá, {nome}! 😊 Tudo bem? Aqui é {coordenador}, do ministério {ministerio}. Vi que você se cadastrou e queria dar as boas-vindas! Que ótimo ter você com a gente. Posso te contar mais sobre os próximos passos?',

  grupo_acolhimento:
    'Oi, {nome}! 😊 Sou {coordenador}, do {ministerio}. Você está participando do nosso Grupo de Acolhimento — como está sendo a experiência? Qualquer dúvida, pode me chamar!',

  pesquisa_area:
    'Olá, {nome}! Passando para saber se você já teve a chance de conhecer melhor as áreas do {ministerio}. Ficou com alguma dúvida ou tem alguma área que chamou mais a atenção? 😊',

  direcionado_area:
    'Oi, {nome}! 👋 Você foi direcionado para a área de {subArea} no {ministerio}. Que notícia incrível! Em breve o coordenador da área vai entrar em contato. Se precisar de algo antes, é só me chamar!',

  contato_coordenador:
    'Olá, {nome}! Sou {coordenador}, coordenador(a) da área de {subArea} no {ministerio}. Queria me apresentar e marcar uma conversa para te contar mais sobre como funciona. Tem algum horário bom pra você essa semana?',

  coordenador_contatou:
    'Oi, {nome}! 😊 Ótimo ter falado com você! Como ficou qualquer dúvida que surgir, pode me chamar. Estamos te esperando no grupo da área de {subArea}!',

  grupo_area:
    'Olá, {nome}! Tudo certo? Você já está participando do grupo de {subArea}. Se precisar de algo ou tiver alguma dificuldade, me avise, estou aqui! 💪',

  treinamento:
    'Oi, {nome}! Você está na etapa de treinamento — que fase importante! 🎉 Se tiver dúvidas sobre o conteúdo ou precisar de apoio, é só chamar. Você está indo muito bem!',

  primeira_escala:
    'Olá, {nome}! 🙌 Sua primeira escala está chegando — que momento especial! Qualquer coisa sobre o dia, horário ou o que vai precisar trazer, me fala. Estamos na torcida por você!',

  estabelecido:
    'Oi, {nome}! Passando para dizer que é uma alegria enorme tê-lo(a) como parte do {ministerio}. Você é estabelecido(a) na nossa equipe e isso é motivo de celebração! 🎊 Continue sendo essa benção!',

  mudou_area:
    'Olá, {nome}! Soube que você foi para outro ministério. Que Deus abençoe muito essa nova etapa! 🙏 Fica à vontade para nos procurar se precisar de qualquer coisa.',

  nao_retornou:
    'Oi, {nome}! Tudo bem? Faz um tempinho que não temos notícias suas e queríamos saber como você está. 😊 Se puder, nos dá um retorno — sua presença faz muita falta!',
};

/**
 * Builds a WhatsApp message template for the given stage.
 *
 * @param senderName - Name of the logged-in user sending the message.
 *   Falls back to volunteer.coordinator only if not provided (legacy paths).
 */
export function buildTemplate(
  stage: JourneyStage,
  volunteer: { name: string; coordinator: string; subArea: string },
  ministryName: string,
  senderName?: string
): string {
  const tpl = WA_TEMPLATES[stage] ?? 'Olá, {nome}! Tudo bem? Passando para manter contato. 😊';
  const coordName = senderName?.trim() || volunteer.coordinator || '';
  return tpl
    .replace(/\{nome\}/g, volunteer.name)
    .replace(/\{coordenador\}/g, coordName)
    .replace(/\{subArea\}/g, volunteer.subArea)
    .replace(/\{ministerio\}/g, ministryName);
}
