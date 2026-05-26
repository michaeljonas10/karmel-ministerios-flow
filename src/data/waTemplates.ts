import type { JourneyStage } from '../types';

export const WA_TEMPLATES: Partial<Record<JourneyStage, string>> = {
  cadastrado:
    'Ola, {nome}! Tudo bem? Aqui e {coordenador}, do ministerio {ministerio}. Vi que voce se cadastrou e queria dar as boas-vindas! Que otimo ter voce com a gente. Posso te contar mais sobre os proximos passos?',

  grupo_acolhimento:
    'Oi, {nome}! Sou {coordenador}, do {ministerio}. Voce esta participando do nosso Grupo de Acolhimento - como esta sendo a experiencia? Qualquer duvida, pode me chamar!',

  pesquisa_area:
    'Ola, {nome}! Passando para saber se voce ja teve a chance de conhecer melhor as areas do {ministerio}. Ficou com alguma duvida ou tem alguma area que chamou mais a atencao?',

  direcionado_area:
    'Oi, {nome}! Voce foi direcionado para a area de {subArea} no {ministerio}. Que noticia incrivel! Em breve o coordenador da area vai entrar em contato. Se precisar de algo antes, e so me chamar!',

  contato_coordenador:
    'Ola, {nome}! Sou {coordenador}, coordenador(a) da area de {subArea} no {ministerio}. Queria me apresentar e marcar uma conversa para te contar mais sobre como funciona. Tem algum horario bom pra voce essa semana?',

  coordenador_contatou:
    'Oi, {nome}! Otimo ter falado com voce! Para qualquer duvida que surgir, pode me chamar. Estamos te esperando no grupo da area de {subArea}!',

  grupo_area:
    'Ola, {nome}! Tudo certo? Voce ja esta participando do grupo de {subArea}. Se precisar de algo ou tiver alguma dificuldade, me avise, estou aqui!',

  treinamento:
    'Oi, {nome}! Voce esta na etapa de treinamento - que fase importante! Se tiver duvidas sobre o conteudo ou precisar de apoio, e so chamar. Voce esta indo muito bem!',

  primeira_escala:
    'Ola, {nome}! Sua primeira escala esta chegando - que momento especial! Qualquer coisa sobre o dia, horario ou o que vai precisar trazer, me fala. Estamos na torcida por voce!',

  estabelecido:
    'Oi, {nome}! Tudo bem? Aqui e {coordenador}, do {ministerio}. Passando para fazer nosso check-in de rotina - voce continua na escala e tudo correndo bem por ai? Qualquer coisa e so me chamar!',

  mudou_area:
    'Ola, {nome}! Soube que voce foi para outro ministerio. Que Deus abencoe muito essa nova etapa! Fica a vontade para nos procurar se precisar de qualquer coisa.',

  nao_retornou:
    'Oi, {nome}! Tudo bem? Faz um tempinho que nao temos noticias suas e queriamos saber como voce esta. Se puder, nos da um retorno - sua presenca faz muita falta!',
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
  const tpl = WA_TEMPLATES[stage] ?? 'Ola, {nome}! Tudo bem? Passando para manter contato.';
  const coordName = senderName?.trim() || volunteer.coordinator || '';
  return tpl
    .replace(/\{nome\}/g, volunteer.name)
    .replace(/\{coordenador\}/g, coordName)
    .replace(/\{subArea\}/g, volunteer.subArea)
    .replace(/\{ministerio\}/g, ministryName);
}
