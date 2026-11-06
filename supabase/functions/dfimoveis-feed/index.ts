import { dfImoveisMissingFields } from '../../../src/lib/dfimoveis.ts'

type FeedImage = { url: string; display_order: number }
type FeedVideo = { url: string; display_order: number }

type FeedProperty = {
  id: string
  code: string
  title: string
  dfimoveis_type: string | null
  dfimoveis_subtype: string | null
  purpose: 'VENDA' | 'ALUGUEL' | 'AMBOS'
  zip_code: string | null
  state: string
  city: string
  neighborhood: string
  address: string | null
  number: string | null
  complement: string | null
  sale_price: number | null
  rent_price: number | null
  condo_fee: number | null
  property_tax: number | null
  total_area: number | null
  private_area: number | null
  land_area: number | null
  bedrooms: number
  suites: number
  bathrooms: number
  parking_spaces: number
  living_rooms: number | null
  financing: boolean
  trade: boolean
  features: string[] | null
  infrastructure: string[] | null
  service_areas: string[] | null
  leisure_areas: string[] | null
  closets: string[] | null
  intimate_features: string[] | null
  social_balcony: boolean
  description: string
  property_images: FeedImage[] | null
  property_videos: FeedVideo[] | null
  imovel_integracoes: Array<{ portal: string; ativo: boolean }>
}

class FeedError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

function xmlEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function element(name: string, value: unknown): string {
  return value == null ? '' : `<${name}>${xmlEscape(value)}</${name}>`
}

function decimal(value: number | null): string | null {
  return value == null || !Number.isFinite(Number(value)) ? null : Number(value).toFixed(2).replace('.', ',')
}

function checkbox(name: string, enabled: boolean): string {
  return element(name, enabled ? 1 : 0)
}

function normalizedFeatures(property: FeedProperty): string {
  return [
    ...(property.features ?? []),
    ...(property.infrastructure ?? []),
    ...(property.service_areas ?? []),
    ...(property.leisure_areas ?? []),
    ...(property.closets ?? []),
    ...(property.intimate_features ?? []),
  ].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
}

function normalizedList(values: string[] | null): string[] {
  return (values ?? []).map((value) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR'),
  )
}

function stateCode(state: string): string {
  const states: Record<string, string> = {
    Acre: 'AC', Alagoas: 'AL', Amapa: 'AP', Amazonas: 'AM', Bahia: 'BA', Ceara: 'CE',
    'Distrito Federal': 'DF', 'Espirito Santo': 'ES', Goias: 'GO', Maranhao: 'MA',
    'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG', Para: 'PA',
    Paraiba: 'PB', Parana: 'PR', Pernambuco: 'PE', Piaui: 'PI', 'Rio de Janeiro': 'RJ',
    'Rio Grande do Norte': 'RN', 'Rio Grande do Sul': 'RS', Rondonia: 'RO', Roraima: 'RR',
    'Santa Catarina': 'SC', 'Sao Paulo': 'SP', Sergipe: 'SE', Tocantins: 'TO',
  }
  const normalized = state.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return states[normalized] ?? state.trim().toUpperCase()
}

function propertyXml(property: FeedProperty, customerCode: string): string {
  const features = normalizedFeatures(property)
  const images = (property.property_images ?? [])
    .filter((image) => /^https?:\/\//i.test(image.url))
    .sort((left, right) => left.display_order - right.display_order)
    .map((image, index) => `<Foto>${element('NomeArquivo', `Foto ${index + 1}`)}${element('URLArquivo', image.url)}</Foto>`)
    .join('')
  const videos = (property.property_videos ?? [])
    .filter((video) => /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(video.url))
    .sort((left, right) => left.display_order - right.display_order)
  const address = [property.address, property.number].filter(Boolean).join(', ')
  const xml = [
    element('CodigoCliente', customerCode),
    element('CodigoImovel', property.code),
    element('TipoImovel', property.dfimoveis_type),
    element('SubTipoImovel', property.dfimoveis_subtype),
    element('UF', stateCode(property.state)),
    element('Cidade', property.city),
    element('Bairro', property.neighborhood),
    element('CEP', property.zip_code?.replace(/\D/g, '')),
    element('Endereco', address || null),
    element('Complemento', property.complement),
    checkbox('ExibirComplemento', Boolean(property.complement?.trim())),
    element('QtdDormitorios', property.bedrooms),
    element('QtdSuites', property.suites),
    element('QtdBanheiros', property.bathrooms),
    element('QtdVagas', property.parking_spaces),
    element('QtdSalas', property.living_rooms),
    element('Observacao', property.description.slice(0, 5000)),
    element('Diferencial', (property.features ?? []).join(', ').slice(0, 100)),
    checkbox('Destaque', false),
    checkbox('UltraDestaque', false),
    checkbox('ArCondicionado', features.includes('ar-condicionado') || features.includes('ar condicionado')),
    checkbox('AquecimentoSolar', features.includes('aquecimento solar')),
    checkbox('AreaLazer', Boolean(property.leisure_areas?.length)),
    checkbox('AreaServico', Boolean(property.service_areas?.length)),
    checkbox('Churrasqueira', features.includes('churrasqueira')),
    checkbox('CircuitoTv', features.includes('tv a cabo') || features.includes('circuito de tv')),
    checkbox('CoberturaColetiva', features.includes('cobertura coletiva')),
    checkbox('CozinhaComArmarios', normalizedList(property.closets).includes('cozinha')),
    checkbox('Escritorio', features.includes('escritorio')),
    checkbox('GasCanalizado', features.includes('gas canalizado')),
    checkbox('Guarita', features.includes('guarita')),
    checkbox('Interfone', features.includes('interfone')),
    checkbox('Jardim', features.includes('jardim')),
    checkbox('Lavabo', features.includes('lavabo')),
    checkbox('Piscina', features.includes('piscina')),
    checkbox('PlayGround', features.includes('playground')),
    checkbox('PortaoEletronico', features.includes('portao eletrico') || features.includes('portao eletronico')),
    checkbox('QuadraEsportiva', features.includes('quadra')),
    checkbox('SalaoJogos', features.includes('salao de jogos')),
    checkbox('SalaGinastica', features.includes('academia') || features.includes('sala de ginastica')),
    checkbox('SalaoFestas', features.includes('salao de festas')),
    checkbox('Sauna', features.includes('sauna')),
    checkbox('Varanda', property.social_balcony || features.includes('varanda')),
    checkbox('ExibirRede', false),
    checkbox('AceitaFinanciamento', property.financing),
    checkbox('AceitaPermuta', property.trade),
    checkbox('AceitaPet', false),
    element('PrecoVenda', property.purpose !== 'ALUGUEL' ? decimal(property.sale_price) : null),
    element('PrecoLocacao', property.purpose !== 'VENDA' ? decimal(property.rent_price) : null),
    element('PrecoCondominio', decimal(property.condo_fee)),
    element('PrecoIptu', decimal(property.property_tax)),
    element('AreaUtil', decimal(property.private_area)),
    element('AreaTotal', decimal(property.total_area)),
    element('AreaDoTerreno', decimal(property.land_area)),
    element('UnidadeMetrica', 'M2'),
    videos[0] ? element('UrlVideo', videos[0].url) : '',
    images ? `<Fotos>${images}</Fotos>` : '',
  ].join('')
  return `<Imovel>${xml}</Imovel>`
}

async function restRows<T>(
  baseUrl: string,
  serviceKey: string,
  resource: string,
  params: URLSearchParams,
  range?: string,
): Promise<T[]> {
  const headers: Record<string, string> = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  }
  if (range) headers.Range = range
  const response = await fetch(`${baseUrl}/rest/v1/${resource}?${params}`, { headers })
  if (!response.ok) {
    console.error(`DF Imóveis feed database read failed for ${resource}: ${response.status}`)
    throw new FeedError(502, 'Não foi possível gerar o feed do DF Imóveis.')
  }
  const data: unknown = await response.json()
  if (!Array.isArray(data)) throw new FeedError(502, 'Resposta inválida ao carregar o feed do DF Imóveis.')
  return data as T[]
}

async function loadProperties(baseUrl: string, serviceKey: string): Promise<FeedProperty[]> {
  const params = new URLSearchParams({
    select: [
      'id', 'code', 'status', 'dfimoveis_type', 'dfimoveis_subtype', 'purpose', 'zip_code', 'state', 'city',
      'neighborhood', 'address', 'number', 'complement', 'sale_price', 'rent_price', 'condo_fee', 'property_tax',
      'total_area', 'private_area', 'land_area', 'bedrooms', 'suites', 'bathrooms', 'parking_spaces', 'living_rooms',
      'financing', 'trade', 'features', 'infrastructure', 'service_areas', 'leisure_areas', 'closets',
      'intimate_features', 'social_balcony', 'description',
      'property_images(url,display_order)', 'property_videos(url,display_order)', 'imovel_integracoes!inner(portal,ativo)',
    ].join(','),
    status: 'eq.PUBLICADO',
    'imovel_integracoes.portal': 'eq.dfimoveis',
    'imovel_integracoes.ativo': 'eq.true',
    order: 'code.asc',
    'property_images.order': 'display_order.asc',
    'property_videos.order': 'display_order.asc',
  })
  const properties: FeedProperty[] = []
  for (let start = 0; ; start += 500) {
    const page = await restRows<FeedProperty>(baseUrl, serviceKey, 'properties', params, `${start}-${start + 499}`)
    properties.push(...page)
    if (page.length < 500) break
  }
  return properties
}

Deno.serve(async (request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
  }

  const baseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/+$/, '')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!baseUrl || !serviceKey) {
    console.error('DF Imóveis feed requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
    return new Response('Feed do DF Imóveis não configurado.', { status: 503 })
  }

  try {
    const settings = await restRows<{ customer_code: string }>(
      baseUrl,
      serviceKey,
      'portal_configurations',
      new URLSearchParams({ select: 'customer_code', portal: 'eq.dfimoveis', limit: '1' }),
    )
    const customerCode = settings[0]?.customer_code.trim()
    if (!customerCode) throw new FeedError(503, 'Configure o Código do Cliente do DF Imóveis no painel administrativo.')

    const properties = await loadProperties(baseUrl, serviceKey)
    const validProperties = properties.filter((property) => {
      const missing = dfImoveisMissingFields(property)
      if (missing.length) {
        console.warn(`Property ${property.code} is not included in the DF Imóveis feed: missing ${missing.join(', ')}.`)
        return false
      }
      return true
    })
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Carga xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><Imoveis>${validProperties.map((property) => propertyXml(property, customerCode)).join('')}</Imoveis></Carga>`
    const headers = {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    }
    return new Response(request.method === 'HEAD' ? null : xml, { headers })
  } catch (reason) {
    const status = reason instanceof FeedError ? reason.status : 500
    const message = reason instanceof Error ? reason.message : 'Erro inesperado ao gerar o feed do DF Imóveis.'
    if (!(reason instanceof FeedError)) console.error('Unexpected DF Imóveis feed error:', reason)
    return new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
  }
})
