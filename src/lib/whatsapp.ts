export function whatsappUrl(phone: string, name?: string): string {
  const digits = phone.replace(/\D/g, '')
  // Add Brazil country code if not present
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`
  const message = name
    ? encodeURIComponent(`Olá, ${name}! Tudo bem? 😊`)
    : ''
  return `https://wa.me/${withCountry}${message ? `?text=${message}` : ''}`
}
