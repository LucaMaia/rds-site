const fallbackRecipient = 'lucamaia2007@hotmail.com'
const propertyFields = [
  'id', 'code', 'title', 'type', 'purpose', 'status', 'broker_id', 'captor_id', 'state', 'city', 'neighborhood',
  'sale_price', 'rent_price', 'condo_fee', 'property_tax', 'tax_frequency', 'total_area', 'private_area',
  'bedrooms', 'suites', 'bathrooms', 'parking_spaces', 'floor', 'construction_year', 'furnished',
  'financing', 'trade', 'features', 'description', 'created_at',
].join(',')

type PropertyRecord = {
  id: string
  code: string
  title: string
  type: string
  purpose: string
  status: string
  broker_id: string | null
  captor_id: string | null
  state: string
  city: string
  neighborhood: string
  sale_price: number | null
  rent_price: number | null
  condo_fee: number | null
  property_tax: number | null
  tax_frequency: string | null
  total_area: number | null
  private_area: number | null
  bedrooms: number
  suites: number
  bathrooms: number
  parking_spaces: number
  floor: number | null
  construction_year: number | null
  furnished: boolean
  financing: boolean
  trade: boolean
  features: string[]
  description: string
  created_at: string
}

type InteractionType = 'contact_received' | 'email_sent' | 'whatsapp_click'

type InquiryBody = {
  action?: unknown
  propertyId?: unknown
  name?: unknown
  email?: unknown
  whatsapp?: unknown
  honeypot?: unknown
}

type ContactRecord = { name: string; whatsapp: string | null; phone: string | null }

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

function jsonResponse(body: Record<string, unknown>, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin',
    },
  })
}

function escapeHtml(value: unknown): string {
  return String(value ?? '—')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatCurrency(value: number | null, frequency?: string | null): string {
  if (value == null) return '—'
  const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(value)
  return frequency ? `${formatted} ${frequency === 'ANUAL' ? '/ ano' : '/ mês'}` : formatted
}

async function restRows<T>(
  baseUrl: string,
  serviceKey: string,
  resource: string,
  params: Record<string, string>,
): Promise<T[]> {
  const query = new URLSearchParams(params)
  const response = await fetch(`${baseUrl}/rest/v1/${resource}?${query}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  if (!response.ok) {
    console.error(`Supabase read failed for ${resource}: ${response.status}`)
    throw new HttpError(502, 'Não foi possível carregar os dados do imóvel.')
  }
  const data: unknown = await response.json()
  if (!Array.isArray(data)) throw new HttpError(502, 'Resposta inválida ao carregar os dados do imóvel.')
  return data as T[]
}

async function recordInteraction(
  baseUrl: string,
  serviceKey: string,
  interaction: Record<string, unknown>,
) {
  const response = await fetch(`${baseUrl}/rest/v1/property_interactions`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(interaction),
  })
  if (!response.ok) {
    console.error(`Property interaction recording failed: ${response.status}`)
    throw new HttpError(503, 'Não foi possível registrar a interação. Tente novamente mais tarde.')
  }
}

async function consumeRateLimit(
  baseUrl: string,
  serviceKey: string,
  ip: string,
  limit = 3,
  windowSeconds = 900,
  namespace = '',
) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(serviceKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const identity = namespace ? `${namespace}:${ip}` : ip
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(identity)))
  const ipHash = Array.from(signature, (byte) => byte.toString(16).padStart(2, '0')).join('')
  const response = await fetch(`${baseUrl}/rest/v1/rpc/consume_property_inquiry_rate_limit`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_ip_hash: ipHash, p_limit: limit, p_window_seconds: windowSeconds }),
  })
  if (!response.ok) {
    console.error(`Inquiry rate-limit check failed: ${response.status}`)
    throw new HttpError(503, 'Não foi possível processar sua solicitação agora.')
  }
  const allowed: unknown = await response.json()
  if (allowed !== true) throw new HttpError(429, 'Muitas solicitações. Aguarde alguns minutos e tente novamente.')
}

function propertyRows(property: PropertyRecord, images: string[], broker: ContactRecord | null, captor: ContactRecord | null, propertyUrl: string) {
  const purpose = property.purpose === 'VENDA' ? 'Venda' : property.purpose === 'ALUGUEL' ? 'Aluguel' : 'Venda e aluguel'
  const rows: Array<[string, unknown]> = [
    ['Código', property.code],
    ['Título', property.title],
    ['Tipo', property.type],
    ['Finalidade', purpose],
    ['Status', property.status],
    ['Localização', `${property.neighborhood}, ${property.city} - ${property.state}`],
    ['Preço de venda', formatCurrency(property.sale_price)],
    ['Preço de aluguel', formatCurrency(property.rent_price, 'MENSAL')],
    ['Condomínio', formatCurrency(property.condo_fee, 'MENSAL')],
    ['IPTU', formatCurrency(property.property_tax, property.tax_frequency)],
    ['Área total', property.total_area == null ? '—' : `${property.total_area} m²`],
    ['Área privativa', property.private_area == null ? '—' : `${property.private_area} m²`],
    ['Quartos / suítes / banheiros / vagas', `${property.bedrooms} / ${property.suites} / ${property.bathrooms} / ${property.parking_spaces}`],
    ['Andar', property.floor],
    ['Ano de construção', property.construction_year],
    ['Mobiliado', property.furnished ? 'Sim' : 'Não'],
    ['Aceita financiamento', property.financing ? 'Sim' : 'Não'],
    ['Aceita permuta', property.trade ? 'Sim' : 'Não'],
    ['Diferenciais', property.features.length ? property.features.join(', ') : '—'],
    ['Descrição', property.description],
    ['Responsável pelo atendimento', broker?.name ?? captor?.name ?? 'Equipe RDS'],
    ['WhatsApp do atendimento', broker?.whatsapp ?? broker?.phone ?? captor?.whatsapp ?? captor?.phone ?? 'Não informado'],
    ['Link do imóvel', propertyUrl],
    ['Fotos', images.length ? images.join('\n') : 'Nenhuma foto cadastrada'],
  ]
  return rows
}

async function recordWhatsAppClick(baseUrl: string, serviceKey: string, propertyId: string) {
  const properties = await restRows<PropertyRecord>(baseUrl, serviceKey, 'public_properties', {
    select: propertyFields,
    id: `eq.${propertyId}`,
    limit: '1',
  })
  const property = properties[0]
  if (!property) throw new HttpError(404, 'Este imóvel não está disponível para contato.')

  const [brokers, captors] = await Promise.all([
    property.broker_id
      ? restRows<Pick<ContactRecord, 'name'>>(baseUrl, serviceKey, 'public_brokers', {
        select: 'name',
        id: `eq.${property.broker_id}`,
        limit: '1',
      })
      : Promise.resolve([] as Pick<ContactRecord, 'name'>[]),
    property.captor_id
      ? restRows<Pick<ContactRecord, 'name'>>(baseUrl, serviceKey, 'public_captors', {
        select: 'name',
        id: `eq.${property.captor_id}`,
        limit: '1',
      })
      : Promise.resolve([] as Pick<ContactRecord, 'name'>[]),
  ])
  const interaction = {
    property_id: property.id,
    property_code: property.code,
    property_title: property.title,
    property_neighborhood: property.neighborhood,
    property_city: property.city,
    property_state: property.state,
    property_type: property.type,
    property_purpose: property.purpose,
    property_status: property.status,
    property_captor_id: property.captor_id,
    property_captor_name: captors[0]?.name ?? null,
    property_broker_id: property.broker_id,
    property_broker_name: brokers[0]?.name ?? null,
    property_created_at: property.created_at,
    interested_name: null,
    interested_email: null,
    interested_phone: null,
    interaction_type: 'whatsapp_click' satisfies InteractionType,
    interaction_source: 'public_property_page',
  }
  await recordInteraction(baseUrl, serviceKey, interaction)
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin') ?? ''
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://rds-site.vercel.app,http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (!allowedOrigins.includes(origin)) return new Response('Origem não autorizada.', { status: 403 })
  if (request.method === 'OPTIONS') return jsonResponse({ ok: true }, 200, origin)
  if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405, origin)

  try {
    if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
      throw new HttpError(415, 'Formato de solicitação não suportado.')
    }
    const rawBody = await request.text()
    if (rawBody.length > 10000) throw new HttpError(413, 'A solicitação excede o tamanho permitido.')
    let body: InquiryBody
    try {
      body = JSON.parse(rawBody) as InquiryBody
    } catch {
      throw new HttpError(400, 'O conteúdo da solicitação é inválido.')
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new HttpError(400, 'O conteúdo da solicitação é inválido.')
    }
    if (typeof body.honeypot === 'string' && body.honeypot.trim()) {
      throw new HttpError(400, 'Não foi possível validar a solicitação.')
    }

    const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : ''
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(propertyId)) {
      throw new HttpError(400, 'O imóvel informado é inválido.')
    }
    if (body.action !== undefined && body.action !== 'track_whatsapp_click') {
      throw new HttpError(400, 'A ação solicitada é inválida.')
    }
    if (body.action === 'track_whatsapp_click') {
      const baseUrl = Deno.env.get('SUPABASE_URL')
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (!baseUrl || !serviceKey) throw new HttpError(503, 'O serviço de contato ainda não está configurado.')
      const ip = request.headers.get('cf-connecting-ip')?.trim()
        ?? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
        ?? request.headers.get('x-real-ip')
      if (!ip) throw new HttpError(400, 'Não foi possível validar a origem da solicitação.')
      await consumeRateLimit(baseUrl, serviceKey, ip, 20, 60, 'whatsapp-click')
      await recordWhatsAppClick(baseUrl, serviceKey, propertyId)
      return jsonResponse({ ok: true }, 200, origin)
    }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const whatsapp = typeof body.whatsapp === 'string' ? body.whatsapp.trim() : ''
    const phoneDigits = whatsapp.replace(/\D/g, '')
    if (!name || name.length > 120 || /[\r\n]/.test(name)) throw new HttpError(400, 'Informe um nome válido com até 120 caracteres.')
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Informe um e-mail válido.')
    if (phoneDigits.length < 10 || phoneDigits.length > 15) throw new HttpError(400, 'Informe um WhatsApp válido com DDD.')

    const baseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('RESEND_FROM_EMAIL')
    if (!baseUrl || !serviceKey) throw new HttpError(503, 'O serviço de contato ainda não está configurado.')

    const ip = request.headers.get('cf-connecting-ip')?.trim()
      ?? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
      ?? request.headers.get('x-real-ip')
    if (!ip) throw new HttpError(400, 'Não foi possível validar a origem da solicitação.')
    await consumeRateLimit(baseUrl, serviceKey, ip)

    const [properties, settings] = await Promise.all([
      restRows<PropertyRecord>(baseUrl, serviceKey, 'public_properties', { select: propertyFields, id: `eq.${propertyId}`, limit: '1' }),
      restRows<{ contact_email: string | null }>(baseUrl, serviceKey, 'public_site_settings', { select: 'contact_email', id: 'eq.true', limit: '1' }),
    ])
    const property = properties[0]
    if (!property) throw new HttpError(404, 'Este imóvel não está disponível para contato.')
    const interaction = {
      property_id: property.id,
      property_code: property.code,
      property_title: property.title,
      property_neighborhood: property.neighborhood,
      property_city: property.city,
      property_state: property.state,
      property_type: property.type,
      property_purpose: property.purpose,
      property_status: property.status,
      property_captor_id: property.captor_id,
      property_captor_name: null,
      property_created_at: property.created_at,
      interested_name: name,
      interested_email: email,
      interested_phone: whatsapp,
    }
    await recordInteraction(baseUrl, serviceKey, { ...interaction, interaction_type: 'contact_received' satisfies InteractionType })

    const [images, brokers, captors] = await Promise.all([
      restRows<{ url: string }>(baseUrl, serviceKey, 'property_images', {
        select: 'url',
        property_id: `eq.${property.id}`,
        order: 'display_order.asc',
        limit: '50',
      }),
      property.broker_id
        ? restRows<ContactRecord>(baseUrl, serviceKey, 'public_brokers', {
          select: 'name,whatsapp,phone',
          id: `eq.${property.broker_id}`,
          limit: '1',
        })
        : Promise.resolve([] as ContactRecord[]),
      property.captor_id
        ? restRows<ContactRecord>(baseUrl, serviceKey, 'public_captors', {
          select: 'name,whatsapp,phone',
          id: `eq.${property.captor_id}`,
          limit: '1',
        })
        : Promise.resolve([] as ContactRecord[]),
    ])

    const broker = brokers[0] ?? null
    const captor = captors[0] ?? null
    if (!resendKey || !from) throw new HttpError(503, 'O envio de e-mail ainda não está configurado.')
    const recipient = settings[0]?.contact_email?.trim() || fallbackRecipient
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      throw new HttpError(503, 'O e-mail de contato do site não é válido.')
    }
    const propertyUrl = `${origin}/imoveis/${property.id}`
    const rows = propertyRows(property, images.map((image) => image.url), broker, captor, propertyUrl)
    const text = [
      'Novo interesse recebido pelo site RDS Imóveis.',
      '',
      'DADOS DO CLIENTE',
      `Nome: ${name}`,
      `E-mail: ${email}`,
      `WhatsApp: ${whatsapp}`,
      '',
      'IMÓVEL DE INTERESSE',
      ...rows.map(([label, value]) => `${label}: ${value ?? '—'}`),
    ].join('\n')
    const html = `<div style="font-family:Arial,sans-serif;color:#333"><h2>Novo interesse recebido pelo site RDS Imóveis</h2><h3>Dados do cliente</h3><table cellpadding="7" cellspacing="0"><tr><th align="left">Nome</th><td>${escapeHtml(name)}</td></tr><tr><th align="left">E-mail</th><td>${escapeHtml(email)}</td></tr><tr><th align="left">WhatsApp</th><td>${escapeHtml(whatsapp)}</td></tr></table><h3>Imóvel de interesse</h3><table cellpadding="7" cellspacing="0" style="border-collapse:collapse">${rows.map(([label, value]) => `<tr><th align="left" valign="top" style="border-bottom:1px solid #eee">${escapeHtml(label)}</th><td style="border-bottom:1px solid #eee;white-space:pre-line">${escapeHtml(value)}</td></tr>`).join('')}</table></div>`

    const delivery = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [recipient],
        reply_to: email,
        subject: `Interesse em ${property.code} - ${property.title}`.slice(0, 200),
        text,
        html,
      }),
    })
    if (!delivery.ok) {
      const responseBody = await delivery.text()
      let providerMessage = ''
      let providerName = ''
      try {
        const providerError: unknown = JSON.parse(responseBody)
        if (providerError && typeof providerError === 'object') {
          if ('message' in providerError && typeof providerError.message === 'string') providerMessage = providerError.message
          if ('name' in providerError && typeof providerError.name === 'string') providerName = providerError.name
        }
      } catch {
        providerMessage = ''
      }

      console.error('Resend delivery rejected:', { status: delivery.status, errorType: providerName || 'unknown' })
      if (delivery.status === 401) {
        throw new HttpError(502, 'O Resend recusou a chave de API. Confira o secret RESEND_API_KEY no Supabase.')
      }
      if (/testing emails|own email address|verify a domain/i.test(providerMessage)) {
        throw new HttpError(502, 'O remetente de teste do Resend só permite enviar para o e-mail da sua conta Resend. Para testar, configure esse e-mail como contato do site; para outros destinatários, verifique um domínio no Resend e use um remetente desse domínio.')
      }
      if (/domain|verified|sender|from address/i.test(providerMessage)) {
        throw new HttpError(502, 'O Resend recusou o remetente. Verifique um domínio em Resend → Domains e configure RESEND_FROM_EMAIL com um endereço desse domínio.')
      }
      if (delivery.status === 429) {
        throw new HttpError(502, 'O Resend atingiu o limite de envio da conta. Confira os limites e a atividade em Resend → Logs/Usage.')
      }
      throw new HttpError(502, `O Resend recusou o e-mail (HTTP ${delivery.status}). Confira Resend → Logs para ver o motivo.`)
    }
    await recordInteraction(baseUrl, serviceKey, { ...interaction, interaction_type: 'email_sent' satisfies InteractionType })
    return jsonResponse({ ok: true }, 200, origin)
  } catch (reason) {
    if (reason instanceof HttpError) return jsonResponse({ error: reason.message }, reason.status, origin)
    console.error('Unexpected property inquiry error:', reason)
    return jsonResponse({ error: 'Ocorreu um erro ao enviar sua solicitação. Tente novamente.' }, 500, origin)
  }
})
