export function whatsappUrl(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, '')
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${withCountry}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}
