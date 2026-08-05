export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 10) return '91' + digits
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1)
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length === 13 && digits.startsWith('+')) return digits.slice(1)

  return digits
}

export function formatPhoneE164(phone: string): string {
  const normalized = normalizePhone(phone)
  return '+' + normalized
}
