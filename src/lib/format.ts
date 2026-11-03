export function currency(value: number | null | undefined): string {
  if (value == null) return 'Consulte'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

export function numberValue(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

export function whatsappUrl(phone: string | null | undefined, code: string): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  const normalized = digits.startsWith('55') ? digits : `55${digits}`
  const message = encodeURIComponent(`Olá! Tenho interesse no imóvel ${code}.`)
  return `https://wa.me/${normalized}?text=${message}`
}

export function whatsappContactUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const normalized = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${normalized}?text=${encodeURIComponent('Olá! Gostaria de conhecer os imóveis disponíveis.')}`
}

export function youtubeEmbed(url: string): string | null {
  try {
    const parsed = new URL(url)
    let id = ''
    if (parsed.hostname === 'youtu.be') id = parsed.pathname.slice(1)
    if (parsed.hostname.endsWith('youtube.com')) {
      id = parsed.searchParams.get('v') ?? parsed.pathname.split('/').filter(Boolean).at(-1) ?? ''
    }
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null
  } catch {
    return null
  }
}
