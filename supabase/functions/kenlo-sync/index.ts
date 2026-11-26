// Importa os anúncios do Kenlo Imob (Open API v2, GET /v2/listings) para o site.
//
// Secrets necessários (supabase secrets set ...):
//   KENLO_API_KEY      Chave de acesso (API Key) do Mundo-K
//   KENLO_USER_INFO    Código de autenticação (User info), em Base64, como o Kenlo entrega
//   KENLO_SYNC_SECRET  Segredo usado pelo agendamento (pg_cron) para chamar a função
//   ALLOWED_ORIGINS    Origens do painel (mesmo valor usado em property-inquiry)
//
// Chamadas aceitas:
//   - Agendamento: header x-kenlo-sync-secret igual a KENLO_SYNC_SECRET
//   - Painel: JWT de um usuário administrador (supabase.functions.invoke)

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

const KENLO_BASE_URL = 'https://imob-api.kenlo-open.com'
const PAGE_SIZE = 100
const RUN_LOCK_MINUTES = 15

type Money = { value?: number | null; currency?: string | null } | null | undefined

type KenloListing = {
  id: string
  propertyCode?: string | null
  title?: string | null
  purpose?: string | null
  purposes?: string[] | null
  media?: {
    image?: Array<{ url?: string | null; isPrimary?: boolean | null; caption?: string | null }> | null
    video?: Array<{ url?: string | null; name?: string | null }> | null
  } | null
  details?: {
    usageType?: string | null
    propertyType?: string | null
    description?: string | null
    bedrooms?: number | null
    bathrooms?: number | null
    suites?: number | null
    pricing?: {
      rentPrice?: Money
      salePrice?: Money
      condoPrice?: Money
      iptuList?: Array<{ installmentAmount?: Money; installmentQuantity?: number | null }> | null
    } | null
    area?: { unit?: string | null; valueTotal?: number | null; valueUsable?: number | null } | null
    garage?: { value?: number | null } | null
    features?: string[] | null
    location?: {
      state?: { abbreviation?: string | null; value?: string | null } | null
      city?: string | null
      neighborhood?: string | null
      fullLocation?: {
        address?: string | null
        streetNumber?: string | null
        complement?: string | null
        postalCode?: string | null
      } | null
    } | null
    updateAt?: string | null
  } | null
  brokersCaptured?: { name?: string | null; email?: string | null } | null
  address?: {
    streetName?: string | null
    streetNumber?: string | null
    unitNumber?: string | null
    neighborhood?: string | null
    city?: string | null
    stateOrProvince?: string | null
    postalCode?: string | null
  } | null
}

type ListingPage = {
  data?: KenloListing[]
  pagination?: { page?: number; totalPages?: number; total?: number }
}

// Campos do imóvel que vêm do Kenlo. Os demais (destaque, exclusividade,
// marca d'água, DF Imóveis, proprietário...) continuam sendo do site.
type ImportedFields = {
  title: string
  type: string
  purpose: 'VENDA' | 'ALUGUEL' | 'AMBOS'
  state: string
  city: string
  neighborhood: string
  address: string | null
  number: string | null
  complement: string | null
  zip_code: string | null
  sale_price: number | null
  rent_price: number | null
  condo_fee: number | null
  property_tax: number | null
  tax_frequency: 'ANUAL' | null
  total_area: number | null
  private_area: number | null
  bedrooms: number
  suites: number
  bathrooms: number
  parking_spaces: number
  features: string[]
  description: string
}

type Mapped = {
  listing: KenloListing
  fields: ImportedFields
  images: string[]
  videos: string[]
  hash: string
}

type LinkRow = {
  listing_id: string
  property_id: string | null
  content_hash: string | null
  removed_at: string | null
  auto_paused: boolean
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

const stateNames: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
}

// ---------- Mapeamento Kenlo → site ----------

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function nullableText(value: unknown): string | null {
  return text(value) || null
}

function money(value: Money): number | null {
  const amount = value?.value
  return typeof amount === 'number' && Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

function area(value: unknown, unit: string): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  const squareMetres = /hect/i.test(unit) ? value * 10000 : value
  return Math.round(squareMetres * 100) / 100
}

function plainDescription(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h\d)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Tipos usados no site (mesma lista de propertyTypes em src/App.tsx).
const siteTypes = ['Apartamento', 'Casa', 'Casa em condomínio', 'Cobertura', 'Kitnet', 'Terreno', 'Comercial', 'Chácara']

// O Kenlo envia o tipo como código em inglês (APARTMENT, HOUSE, SMALLHOLDING, BUSINESS...).
// A ordem importa: os casos mais específicos vêm antes.
const typeRules: Array<[RegExp, string]> = [
  [/PENTHOUSE|COBERTURA/, 'Cobertura'],
  [/CONDO|CONDOMIN/, 'Casa em condomínio'],
  [/KITNET|STUDIO|KITCHENETTE/, 'Kitnet'],
  [/FARM|SMALLHOLD|RANCH|COUNTRY|CHACARA|SITIO|FAZENDA|RURAL/, 'Chácara'],
  [/LAND|ALLOTMENT|\bLOT\b|TERRENO|LOTE/, 'Terreno'],
  // Antes de Casa, porque WAREHOUSE contém HOUSE.
  [/BUSINESS|COMMERCIAL|OFFICE|STORE|SHOP|WAREHOUSE|SHED|DEPOSIT|INDUSTRIAL|HOTEL|PARKING|GARAGE|CLINIC|CONSULT|SALA|LOJA|GALPAO|PREDIO/, 'Comercial'],
  [/APART|FLAT|LOFT|DUPLEX|TRIPLEX/, 'Apartamento'],
  [/HOUSE|HOME|SOBRADO|CASA/, 'Casa'],
]

function siteType(rawType: string, usageType: string): string {
  const exact = siteTypes.find((type) => type.toLowerCase() === rawType.toLowerCase())
  if (exact) return exact
  const code = rawType.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[\s-]+/g, '_')
  const rule = typeRules.find(([pattern]) => pattern.test(code))
  if (rule) return rule[1]
  if (/COMMERCIAL|CORPORATE|INDUSTRIAL/i.test(usageType)) return 'Comercial'
  if (rawType) console.warn(`Kenlo property type without mapping: ${rawType} (${usageType})`)
  return rawType || 'Casa'
}

function purposeOf(listing: KenloListing, sale: number | null, rent: number | null): ImportedFields['purpose'] {
  const purposes = new Set([...(listing.purposes ?? []), ...(listing.purpose ? [listing.purpose] : [])])
  const forSale = purposes.has('FOR_SALE')
  const forRent = purposes.has('FOR_RENT')
  if (forSale && forRent) return 'AMBOS'
  if (forSale) return 'VENDA'
  if (forRent) return 'ALUGUEL'
  if (sale != null && rent != null) return 'AMBOS'
  return rent != null ? 'ALUGUEL' : 'VENDA'
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function mapListing(listing: KenloListing): Promise<Mapped> {
  const details = listing.details ?? {}
  const pricing = details.pricing ?? {}
  const location = details.location ?? {}
  const full = location.fullLocation ?? {}
  const address = listing.address ?? {}
  const sale = money(pricing.salePrice)
  const rent = money(pricing.rentPrice)
  const iptu = (pricing.iptuList ?? []).reduce((sum, item) => {
    const amount = money(item.installmentAmount)
    return amount == null ? sum : sum + amount * Math.max(1, count(item.installmentQuantity))
  }, 0)
  const stateAbbreviation = text(location.state?.abbreviation) || text(address.stateOrProvince)
  const type = siteType(text(details.propertyType), text(details.usageType))
  const neighborhood = text(location.neighborhood) || text(address.neighborhood)
  const city = text(location.city) || text(address.city)
  const unit = text(details.area?.unit)

  const fields: ImportedFields = {
    title: (text(listing.title) || [type, neighborhood && `em ${neighborhood}`].filter(Boolean).join(' ')).slice(0, 200),
    type,
    purpose: purposeOf(listing, sale, rent),
    state: text(location.state?.value) || stateNames[stateAbbreviation.toUpperCase()] || stateAbbreviation,
    city,
    neighborhood,
    address: nullableText(full.address) ?? nullableText(address.streetName),
    number: nullableText(full.streetNumber) ?? nullableText(address.streetNumber),
    complement: nullableText(full.complement) ?? nullableText(address.unitNumber),
    zip_code: nullableText(full.postalCode) ?? nullableText(address.postalCode),
    sale_price: sale,
    rent_price: rent,
    condo_fee: money(pricing.condoPrice),
    property_tax: iptu > 0 ? Math.round(iptu * 100) / 100 : null,
    tax_frequency: iptu > 0 ? 'ANUAL' : null,
    total_area: area(details.area?.valueTotal, unit),
    private_area: area(details.area?.valueUsable, unit),
    bedrooms: count(details.bedrooms),
    suites: count(details.suites),
    bathrooms: count(details.bathrooms),
    parking_spaces: count(details.garage?.value),
    features: [...new Set((details.features ?? []).map(text).filter(Boolean))],
    description: plainDescription(text(details.description)),
  }

  const rawImages = (listing.media?.image ?? []).filter((image) => /^https:\/\//i.test(text(image.url)))
  const images = [
    ...rawImages.filter((image) => image.isPrimary),
    ...rawImages.filter((image) => !image.isPrimary),
  ].map((image) => text(image.url))
  const videos = (listing.media?.video ?? []).map((video) => text(video.url)).filter((url) => /^https?:\/\//i.test(url))
  const hash = await sha256(JSON.stringify({ fields, images: [...new Set(images)], videos }))
  return { listing, fields, images: [...new Set(images)], videos, hash }
}

// ---------- Kenlo API ----------

function decodeAgencyId(userInfo: string): string {
  try {
    const json = JSON.parse(atob(userInfo.trim())) as Record<string, unknown>
    const agencyId = json.agencyId ?? json.id_imob ?? json.agency_id
    if (agencyId != null && String(agencyId).trim()) return String(agencyId).trim()
  } catch {
    // tratado abaixo
  }
  throw new HttpError(503, 'KENLO_USER_INFO inválido: não foi possível ler o id da imobiliária. Cole o Código de autenticação exatamente como aparece no Mundo-K.')
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function kenloGet(path: string, params: URLSearchParams, apiKey: string, userInfo: string): Promise<ListingPage> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${KENLO_BASE_URL}${path}?${params}`, {
      headers: {
        Accept: 'application/json',
        'X-API-Key': apiKey,
        'x-user-info': userInfo,
        'x-tracking-id': crypto.randomUUID(),
      },
    })
    if (response.ok) return await response.json() as ListingPage

    const body = await response.text().catch(() => '')
    let code = ''
    let correlationId = ''
    try {
      const parsed = JSON.parse(body) as { code?: string; correlationId?: string }
      code = parsed.code ?? ''
      correlationId = parsed.correlationId ?? ''
    } catch {
      // corpo do gateway, sem o envelope da v2
    }

    const retryable = response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504
    if (retryable && attempt < 4) {
      const retryAfter = Number(response.headers.get('retry-after'))
      await wait(Math.min(30, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 2 ** attempt) * 1000)
      continue
    }

    console.error(`Kenlo ${path} failed: ${response.status} ${code} ${correlationId} ${body.slice(0, 500)}`)
    const reference = correlationId ? ` (correlationId ${correlationId})` : ''
    if (response.status === 401) throw new HttpError(502, `O Kenlo recusou a chave de acesso ou o código de autenticação${reference}. Confira KENLO_API_KEY e KENLO_USER_INFO.`)
    if (response.status === 403) throw new HttpError(502, `O Kenlo negou acesso aos anúncios (${code || 'FORBIDDEN'})${reference}. Confira as permissões da chave no Mundo-K.`)
    if (response.status === 429) throw new HttpError(502, 'Limite de requisições do Kenlo atingido. A próxima sincronização tentará de novo.')
    throw new HttpError(502, `O Kenlo respondeu com erro ${response.status}${code ? ` (${code})` : ''}${reference}.`)
  }
}

async function fetchAllListings(apiKey: string, userInfo: string): Promise<KenloListing[]> {
  const agencyId = decodeAgencyId(userInfo)
  const listings = new Map<string, KenloListing>()
  for (let page = 1; page <= 500; page++) {
    const params = new URLSearchParams({ agencyId, page: String(page), pageSize: String(PAGE_SIZE) })
    const result = await kenloGet('/v2/listings', params, apiKey, userInfo)
    const data = Array.isArray(result.data) ? result.data : []
    for (const listing of data) if (listing?.id) listings.set(String(listing.id), listing)
    const totalPages = result.pagination?.totalPages
    if (!data.length || (typeof totalPages === 'number' && page >= totalPages)) break
  }
  return [...listings.values()]
}

// ---------- Banco ----------

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size))
  return result
}

async function mapLimited<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await task(items[next++])
  }))
}

function fail(context: string, error: { message: string } | null): void {
  if (error) throw new Error(`${context}: ${error.message}`)
}

async function selectAll<T>(db: SupabaseClient, table: string, columns: string): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(columns).range(from, from + 999)
    fail(`Leitura de ${table}`, error)
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) return rows
  }
}

async function replaceMedia(db: SupabaseClient, items: Array<{ propertyId: string; images: string[]; videos: string[] }>): Promise<void> {
  for (const group of chunks(items, 100)) {
    const ids = group.map((item) => item.propertyId)
    fail('Remoção de fotos antigas', (await db.from('property_images').delete().in('property_id', ids)).error)
    fail('Remoção de vídeos antigos', (await db.from('property_videos').delete().in('property_id', ids)).error)
  }
  const imageRows = items.flatMap((item) => item.images.map((url, index) => ({
    property_id: item.propertyId, url, display_order: index, is_cover: index === 0,
  })))
  const videoRows = items.flatMap((item) => item.videos.map((url, index) => ({
    property_id: item.propertyId, url, display_order: index,
  })))
  for (const group of chunks(imageRows, 500)) fail('Gravação de fotos', (await db.from('property_images').insert(group)).error)
  for (const group of chunks(videoRows, 500)) fail('Gravação de vídeos', (await db.from('property_videos').insert(group)).error)
}

type Summary = {
  listingsFound: number
  created: number
  updated: number
  unchanged: number
  paused: number
  republished: number
  skipped: number
}

async function synchronize(db: SupabaseClient, listings: KenloListing[]): Promise<Summary> {
  const now = new Date().toISOString()
  const summary: Summary = { listingsFound: listings.length, created: 0, updated: 0, unchanged: 0, paused: 0, republished: 0, skipped: 0 }

  const [links, properties, captors] = await Promise.all([
    selectAll<LinkRow>(db, 'kenlo_listings', 'listing_id,property_id,content_hash,removed_at,auto_paused'),
    selectAll<{ id: string; code: string; status: string }>(db, 'properties', 'id,code,status'),
    selectAll<{ id: string; name: string; email: string | null }>(db, 'captors', 'id,name,email'),
  ])
  const linkMap = new Map(links.map((link) => [link.listing_id, link]))
  const propertyMap = new Map(properties.map((property) => [property.id, property]))
  const usedCodes = new Set(properties.map((property) => property.code.toLowerCase()))
  const captorByEmail = new Map(captors.filter((captor) => captor.email).map((captor) => [captor.email!.toLowerCase(), captor.id]))
  const captorByName = new Map(captors.map((captor) => [captor.name.trim().toLowerCase(), captor.id]))

  const mapped = await Promise.all(listings.map(mapListing))
  const linkUpserts: Array<Record<string, unknown>> = []
  const newProperties: Array<Record<string, unknown>> = []
  const mediaReplacements: Array<{ propertyId: string; images: string[]; videos: string[] }> = []
  const propertyUpdates: Array<{ id: string; values: Record<string, unknown> }> = []

  for (const item of mapped) {
    const { listing, fields, hash } = item
    const link = linkMap.get(listing.id)
    const linkBase = {
      listing_id: listing.id,
      property_code: nullableText(listing.propertyCode),
      content_hash: hash,
      kenlo_updated_at: nullableText(listing.details?.updateAt),
      removed_at: null,
      auto_paused: false,
      synced_at: now,
    }

    if (link && !link.property_id) {
      // O administrador excluiu este imóvel no painel: não recriar.
      summary.skipped++
      continue
    }

    const existing = link?.property_id ? propertyMap.get(link.property_id) : undefined
    if (!existing) {
      const id = crypto.randomUUID()
      const code = text(listing.propertyCode)
      const broker = listing.brokersCaptured
      const captorId = (broker?.email && captorByEmail.get(broker.email.toLowerCase()))
        || (broker?.name && captorByName.get(broker.name.trim().toLowerCase()))
        || null
      const row: Record<string, unknown> = { id, ...fields, status: 'PUBLICADO', captor_id: captorId }
      if (code && !usedCodes.has(code.toLowerCase())) {
        row.code = code
        usedCodes.add(code.toLowerCase())
      }
      newProperties.push(row)
      mediaReplacements.push({ propertyId: id, images: item.images, videos: item.videos })
      linkUpserts.push({ ...linkBase, property_id: id })
      summary.created++
      continue
    }

    const values: Record<string, unknown> = {}
    if (link!.content_hash !== hash) {
      Object.assign(values, fields)
      mediaReplacements.push({ propertyId: existing.id, images: item.images, videos: item.videos })
    }
    if (link!.removed_at && link!.auto_paused && existing.status === 'PAUSADO') {
      values.status = 'PUBLICADO'
      summary.republished++
    }
    if (Object.keys(values).length) {
      propertyUpdates.push({ id: existing.id, values })
      if (link!.content_hash !== hash) summary.updated++
    } else {
      summary.unchanged++
    }
    linkUpserts.push({ ...linkBase, property_id: existing.id })
  }

  const newLinks = new Map(linkUpserts.map((link) => [link.property_id as string, link]))
  for (const group of chunks(newProperties, 200)) {
    // defaultToNull: false → colunas ausentes (ex.: code) usam o default do banco.
    fail('Cadastro de imóveis importados', (await db.from('properties').insert(group, { defaultToNull: false })).error)
    // Vincula na hora, sem hash: se algo falhar depois, a próxima rodada
    // completa fotos e campos em vez de criar o imóvel de novo.
    const links = group.map((row) => ({ ...newLinks.get(row.id as string)!, content_hash: null }))
    fail('Vínculo com o Kenlo', (await db.from('kenlo_listings').upsert(links, { onConflict: 'listing_id' })).error)
  }
  await mapLimited(propertyUpdates, 6, async ({ id, values }) => {
    fail('Atualização de imóvel importado', (await db.from('properties').update(values).eq('id', id)).error)
  })
  await replaceMedia(db, mediaReplacements)

  // Anúncios que deixaram de vir do Kenlo: pausar no site.
  // Uma resposta vazia é tratada como falha da API, para não pausar a carteira inteira.
  if (listings.length) {
    const seen = new Set(listings.map((listing) => listing.id))
    const removed = links.filter((link) => !seen.has(link.listing_id) && !link.removed_at)
    await mapLimited(removed, 6, async (link) => {
      const property = link.property_id ? propertyMap.get(link.property_id) : undefined
      const pause = property?.status === 'PUBLICADO'
      if (pause) {
        fail('Pausa de imóvel removido do Kenlo', (await db.from('properties').update({ status: 'PAUSADO' }).eq('id', property!.id)).error)
        summary.paused++
      }
      fail('Registro de anúncio removido', (await db.from('kenlo_listings')
        .update({ removed_at: now, auto_paused: pause, synced_at: now })
        .eq('listing_id', link.listing_id)).error)
    })
  }

  for (const group of chunks(linkUpserts, 500)) {
    fail('Vínculo com o Kenlo', (await db.from('kenlo_listings').upsert(group, { onConflict: 'listing_id' })).error)
  }
  return summary
}

// ---------- HTTP ----------

function timingSafeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left)
  const b = new TextEncoder().encode(right)
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index++) diff |= a[index] ^ b[index]
  return diff === 0
}

async function isAdmin(baseUrl: string, anonKey: string, authorization: string): Promise<boolean> {
  const response = await fetch(`${baseUrl}/rest/v1/rpc/is_admin`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: authorization, 'Content-Type': 'application/json' },
    body: '{}',
  })
  return response.ok && (await response.json()) === true
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin') ?? ''
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://rds-site.vercel.app,http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map((item) => item.trim()).filter(Boolean)
  const corsHeaders: Record<string, string> = allowedOrigins.includes(origin)
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        Vary: 'Origin',
      }
    : {}
  const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders },
  })

  if (request.method === 'OPTIONS') return new Response(null, { status: origin && !corsHeaders['Access-Control-Allow-Origin'] ? 403 : 204, headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const baseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/+$/, '')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const apiKey = Deno.env.get('KENLO_API_KEY')?.trim()
  const userInfo = Deno.env.get('KENLO_USER_INFO')?.trim()
  const syncSecret = Deno.env.get('KENLO_SYNC_SECRET')?.trim()
  if (!baseUrl || !serviceKey || !anonKey) return json({ error: 'Função sem as variáveis internas do Supabase.' }, 503)

  // Autorização: agendamento com segredo ou administrador logado.
  let trigger: 'manual' | 'cron'
  const providedSecret = request.headers.get('x-kenlo-sync-secret') ?? ''
  if (providedSecret) {
    if (!syncSecret || !timingSafeEqual(providedSecret, syncSecret)) return json({ error: 'Não autorizado.' }, 401)
    trigger = 'cron'
  } else {
    const authorization = request.headers.get('authorization') ?? ''
    if (!/^Bearer\s+\S+/i.test(authorization) || !(await isAdmin(baseUrl, anonKey, authorization))) {
      return json({ error: 'Apenas administradores podem sincronizar o Kenlo.' }, 401)
    }
    trigger = 'manual'
  }

  if (!apiKey || !userInfo) {
    return json({ error: 'Configure os secrets KENLO_API_KEY e KENLO_USER_INFO no Supabase.' }, 503)
  }

  const db = createClient(baseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  // Evita duas sincronizações ao mesmo tempo.
  const lockSince = new Date(Date.now() - RUN_LOCK_MINUTES * 60_000).toISOString()
  const running = await db.from('kenlo_sync_runs').select('id').eq('status', 'running').gte('started_at', lockSince).limit(1)
  if (running.error) return json({ error: `Aplique a migration do Kenlo no Supabase (${running.error.message}).` }, 503)
  if (running.data?.length) return json({ error: 'Já existe uma sincronização em andamento. Tente de novo em alguns minutos.' }, 409)

  const started = await db.from('kenlo_sync_runs').insert({ trigger }).select('id').single()
  if (started.error) return json({ error: `Não foi possível registrar a sincronização: ${started.error.message}` }, 500)
  const runId = started.data.id

  try {
    const listings = await fetchAllListings(apiKey, userInfo)
    const summary = await synchronize(db, listings)
    await db.from('kenlo_sync_runs').update({
      status: 'success',
      finished_at: new Date().toISOString(),
      listings_found: summary.listingsFound,
      created_count: summary.created,
      updated_count: summary.updated,
      unchanged_count: summary.unchanged,
      paused_count: summary.paused,
      republished_count: summary.republished,
      skipped_count: summary.skipped,
    }).eq('id', runId)
    return json({ ok: true, ...summary })
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Erro inesperado na sincronização com o Kenlo.'
    if (!(reason instanceof HttpError)) console.error('Kenlo sync failed:', reason)
    await db.from('kenlo_sync_runs').update({ status: 'error', finished_at: new Date().toISOString(), error: message.slice(0, 1000) }).eq('id', runId)
    return json({ error: message }, reason instanceof HttpError ? reason.status : 500)
  }
})
