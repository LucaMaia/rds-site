import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Bath, BedDouble, Building2, Check,
  ChevronDown, ChevronLeft, ChevronRight, CircleUserRound, DoorOpen, Filter, Home, Instagram,
  KeyRound, LayoutDashboard, LogOut, MapPin, Menu, MessageCircle, Pencil, Plus, Search, SlidersHorizontal, Youtube,
  Square, Trash2, Upload, Users, X,
} from 'lucide-react'
import { deleteProperty, deleteTeamMember, getAdminProperties, getPropertyInteractions, getPublicProperties, getSiteSettings, getTeam, isSupabaseConfigured, saveProperty, saveSiteSettings, saveTeamMember, sendPropertyInquiry, updatePropertyStatus, updateTeamMember } from './lib/data'
import { currency, numberValue, whatsappContactUrl, whatsappUrl, youtubeEmbed } from './lib/format'
import { supabase } from './lib/supabase'
import type { Captor, IntegrationPortal, Property, PropertyImage, PropertyInput, PropertyInteraction, PropertyLink, PropertyStatus } from './types'

const regions = ['Guará', 'Águas Claras', 'Asa Sul', 'Asa Norte', 'Sudoeste', 'Noroeste', 'Lago Sul', 'Lago Norte', 'Taguatinga', 'Ceilândia', 'Samambaia', 'Vicente Pires', 'Park Sul', 'Jardim Botânico', 'Park Way', 'Sobradinho', 'Valparaíso', 'Cidade Ocidental']
const propertyTypes = ['Apartamento', 'Casa', 'Cobertura', 'Terreno', 'Comercial', 'Chácara']
const infrastructureOptions = ['Alarme', 'Ar-condicionado', 'Aquecimento de água', 'Energia solar', 'Imóvel em condomínio', 'Interfone', 'Internet', 'Mobiliado', 'Placas fotovoltaicas', 'Portão elétrico', 'Semimobiliado', 'Terraço', 'TV a cabo']
const serviceAreaOptions = ['Área de serviço', 'Banheiro de empregado', 'Copa', 'Cozinha', 'Despensa', 'Dormitório de empregada', 'Lavanderia']
const leisureAreaOptions = ['Adega', 'Campo de futebol', 'Churrasqueira', 'Ofurô', 'Piscina', 'Playground', 'Quadra de tênis', 'Quadra poliesportiva', 'Quintal', 'Sauna', 'Solário', 'Varanda gourmet', 'Vestiário']
const intimateFeatureOptions = ['Hidromassagem', 'Lavabo', 'Dormitório reversível']
const closetOptions = ['Área de serviço', 'Banheiro', 'Closet', 'Corredor', 'Cozinha', 'Dormitório', 'Dependência de empregado', 'Escritório', 'Home theater/cinema', 'Sala']
const floorTypeOptions = ['Aquecido', 'Ardósia', 'Bloquete', 'Carpete', 'Madeira', 'Cerâmica', 'Cimento queimado', 'Contrapiso', 'Emborrachado', 'Granito', 'Laminado', 'Mármore', 'Porcelanato', 'Tábua', 'Taco de madeira', 'Vinílico']
const propertyFeatureGroups = [
  ['Infraestrutura', 'infrastructure'],
  ['Área de serviço', 'service_areas'],
  ['Lazer e áreas externas', 'leisure_areas'],
  ['Área íntima', 'intimate_features'],
  ['Armários', 'closets'],
  ['Tipos de piso', 'floor_types'],
] as const
const statuses: PropertyStatus[] = ['CRIADO', 'PUBLICADO', 'PAUSADO', 'STAND_BY', 'VENDIDO', 'ALUGADO', 'CANCELADO']
const statusNames: Record<PropertyStatus, string> = {
  CRIADO: 'Criado', PUBLICADO: 'Publicado', PAUSADO: 'Pausado', STAND_BY: 'Stand by',
  VENDIDO: 'Vendido', ALUGADO: 'Alugado', CANCELADO: 'Cancelado',
}
const imageFallback = 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85'
const instagramUrl = 'https://www.instagram.com/rds.imoveis/'
const youtubeUrl = 'https://www.youtube.com/@RDSIMOVEISimoveis'

function propertyFeatures(property: Property): string[] {
  return [...new Set([
    ...property.features,
    ...(property.infrastructure ?? []),
    ...(property.service_areas ?? []),
    ...(property.leisure_areas ?? []),
    ...(property.intimate_features ?? []),
    ...(property.closets ?? []),
    ...(property.floor_types ?? []),
    ...(property.social_balcony ? ['Sacada ou varanda na área social'] : []),
  ])]
}

function SocialLinks({ className }: { className: string }) {
  return <div className={className}>
    <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Acesse o Instagram da RDS Imóveis" title="Instagram da RDS Imóveis"><Instagram size={20} strokeWidth={1.8} /></a>
    <a href={youtubeUrl} target="_blank" rel="noreferrer" aria-label="Acesse o YouTube da RDS Imóveis" title="YouTube da RDS Imóveis"><Youtube size={20} strokeWidth={1.8} /></a>
  </div>
}

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (hash) {
        document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
      } else {
        window.scrollTo(0, 0)
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [pathname, hash])
  return null
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  return <header className="site-header">
    <Link className="brand" to="/" aria-label="RDS Imóveis, início"><span className="brand-logo-frame"><img className="brand-logo" src="/rds-logo.png" alt="" /></span></Link>
    <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu"><Menu size={21} /></button>
    <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'}>
      <Link to="/" onClick={() => setMenuOpen(false)}>Início</Link>
      <Link to="/imoveis?finalidade=VENDA" onClick={() => setMenuOpen(false)}>Comprar</Link>
      <Link to="/imoveis?finalidade=ALUGUEL" onClick={() => setMenuOpen(false)}>Alugar</Link>
      <Link to="/imoveis" onClick={() => setMenuOpen(false)}>Imóveis</Link>
      <Link to="/#regioes" onClick={() => setMenuOpen(false)}>Regiões</Link>
      <Link to="/#sobre" onClick={() => setMenuOpen(false)}>Sobre</Link>
      <Link to="/#contato" onClick={() => setMenuOpen(false)}>Contato</Link>
      <Link className="admin-link" to="/admin">Área administrativa <ArrowUpRight size={14} /></Link>
      <SocialLinks className="social-nav-links" />
    </nav>
  </header>
}

function Footer() {
  const [settings, setSettings] = useState({ company_name: 'RDS Imóveis', whatsapp: '', contact_email: '', instagram_url: '' })
  const [settingsError, setSettingsError] = useState('')
  useEffect(() => { getSiteSettings().then(setSettings).catch((reason: Error) => setSettingsError(reason.message)) }, [])
  return <footer className="site-footer" id="contato">
    <div className="footer-main">
      <div><Link className="brand brand-footer" to="/" aria-label="RDS Imóveis, início"><span className="brand-logo-frame"><img className="brand-logo" src="/rds-logo.png" alt="" /></span></Link><p>Endereços para viver bem.<br />Imóveis selecionados com cuidado.</p></div>
      <div><span className="footer-title">Explore</span><Link to="/imoveis">Todos os imóveis</Link><Link to="/imoveis?finalidade=VENDA">Comprar</Link><Link to="/imoveis?finalidade=ALUGUEL">Alugar</Link></div>
      <div><span className="footer-title">Fale com a gente</span>{settings.whatsapp && <a href={whatsappContactUrl(settings.whatsapp)} target="_blank" rel="noreferrer">WhatsApp</a>}{settings.instagram_url && <a href={settings.instagram_url} target="_blank" rel="noreferrer">Instagram</a>}{settings.contact_email && <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>}{settingsError && <span className="footer-settings-error">Contato temporariamente indisponível.</span>}{!settings.whatsapp && !settings.contact_email && !settingsError && <span>Configure seus canais de contato</span>}</div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} RDS Imóveis</span><span>Brasília · Distrito Federal</span></div>
  </footer>
}

function Photo({ property, className = '' }: { property: Property; className?: string }) {
  const photo = property.property_images?.find((image) => image.is_cover)?.url ?? property.property_images?.[0]?.url ?? imageFallback
  return <img className={className} src={photo} alt={property.title} loading="lazy" onError={(event) => { event.currentTarget.src = imageFallback }} />
}

function propertyInquiryWhatsAppUrl(phone: string, property: Property, customer: { name: string; email: string; whatsapp: string }) {
  const digits = phone.replace(/\D/g, '')
  const normalized = digits.startsWith('55') ? digits : `55${digits}`
  const rows = [
    `Olá! Tenho interesse no imóvel ${property.code} - ${property.title} com ${property.bedrooms} ${property.bedrooms === 1 ? 'quarto' : 'quartos'}${property.suites ? ` sendo ${property.suites} ${property.suites === 1 ? 'suíte' : 'suítes'}` : ''}.`,
    `Meu nome: ${customer.name}`,
    `Meu WhatsApp: ${customer.whatsapp}`,
    `Meu e-mail: ${customer.email}`,
    `Tipo/finalidade: ${property.type} · ${property.purpose === 'VENDA' ? 'Venda' : property.purpose === 'ALUGUEL' ? 'Aluguel' : 'Venda e aluguel'}`,
    `Localização: ${property.neighborhood}, ${property.city} - ${property.state}`,
    '',
    `Link do imóvel: ${window.location.origin}/imoveis/${property.id}`,
  ]
  return `https://wa.me/${normalized}?text=${encodeURIComponent(rows.join('\n'))}`
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map((value) => {
    const text = String(value ?? '')
    const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text
    return `"${safeText.replaceAll('"', '""')}"`
  }).join(',')).join('\r\n')
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function interactionDateBoundary(date: string, endExclusive = false): string | undefined {
  if (!date) return undefined
  const boundary = new Date(`${date}T00:00:00`)
  if (endExclusive) boundary.setDate(boundary.getDate() + 1)
  return boundary.toISOString()
}

const propertyInquiryWhatsAppRecipient = '+55 61 99944 9411'

function PropertyCard({ property }: { property: Property }) {
  const sale = property.sale_price != null ? currency(property.sale_price) : null
  const rent = property.rent_price != null ? currency(property.rent_price) : null
  return <article className="property-card">
    <Link to={`/imoveis/${property.id}`} className="card-photo-wrap">
      <Photo property={property} className="card-photo" />
      {property.featured && <span className="featured-label">SELECIONADO</span>}
      <span className="card-code">{property.code}</span>
    </Link>
    <div className="card-copy">
      <span className="eyebrow">{property.type} <span>·</span> {property.neighborhood}</span>
      <Link to={`/imoveis/${property.id}`} className="card-title">{property.title}</Link>
      <span className="card-location"><MapPin size={14} />{property.city}, {property.state}</span>
      <div className="card-specs">
        <span><BedDouble size={16} />{property.bedrooms} quartos</span><span><Bath size={15} />{property.bathrooms} banheiros</span><span><Square size={15} />{property.total_area ?? '—'} m²</span>
      </div>
      <div className="card-footer">
        <div>{sale && <span className="price">{sale}</span>}{rent && <span className="rent-price">{sale ? `${rent}/mês` : `${rent}/mês`}</span>}</div>
        <Link aria-label={`Ver imóvel ${property.title}`} to={`/imoveis/${property.id}`} className="round-arrow"><ArrowUpRight size={18} /></Link>
      </div>
    </div>
  </article>
}

function PropertyCarousel({ properties, desktopGrid = false }: { properties: Property[]; desktopGrid?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ x: number; scrollLeft: number } | null>(null)
  const dragged = useRef(false)
  const [page, setPage] = useState(0)
  const [pageCount, setPageCount] = useState(1)

  function updatePage() {
    const track = trackRef.current
    const firstCard = track?.firstElementChild
    if (!track || !(firstCard instanceof HTMLElement) || !track.clientWidth) {
      setPage(0)
      setPageCount(1)
      return
    }
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0
    const cardsPerPage = Math.max(1, Math.round((track.clientWidth + gap) / (firstCard.offsetWidth + gap)))
    const pages = Math.max(1, Math.ceil(track.children.length / cardsPerPage))
    const maxScroll = Math.max(1, track.scrollWidth - track.clientWidth)
    setPageCount(pages)
    setPage(Math.min(pages - 1, Math.round((track.scrollLeft / maxScroll) * (pages - 1))))
  }

  useEffect(() => {
    trackRef.current?.scrollTo({ left: 0 })
    updatePage()
    window.addEventListener('resize', updatePage)
    return () => window.removeEventListener('resize', updatePage)
  }, [properties])

  function move(direction: -1 | 1) {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: direction * track.clientWidth, behavior: 'smooth' })
  }

  return <div className={`property-carousel${desktopGrid ? ' results-desktop-grid' : ''}`}>
    <div className="carousel-controls">
      <span>{page + 1} / {pageCount}</span>
      <button type="button" className="carousel-arrow" aria-label="Imóveis anteriores" onClick={() => move(-1)} disabled={page === 0}><ChevronLeft size={18} /></button>
      <button type="button" className="carousel-arrow" aria-label="Próximos imóveis" onClick={() => move(1)} disabled={page >= pageCount - 1}><ChevronRight size={18} /></button>
    </div>
    <div
      className="property-carousel-track"
      ref={trackRef}
      onScroll={updatePage}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse' && event.button === 0) {
          dragStart.current = { x: event.clientX, scrollLeft: event.currentTarget.scrollLeft }
          dragged.current = false
        }
      }}
      onPointerMove={(event) => {
        if (!dragStart.current) return
        const distance = event.clientX - dragStart.current.x
        if (Math.abs(distance) > 5) dragged.current = true
        if (dragged.current) event.currentTarget.scrollLeft = dragStart.current.scrollLeft - distance
      }}
      onPointerUp={() => { dragStart.current = null }}
      onPointerCancel={() => { dragStart.current = null }}
      onClickCapture={(event) => {
        if (dragged.current) {
          event.preventDefault()
          event.stopPropagation()
          dragged.current = false
        }
      }}
    >
      {properties.map((property) => <PropertyCard key={property.id} property={property} />)}
    </div>
  </div>
}

function SearchBox({ initialPurpose = 'VENDA' }: { initialPurpose?: string }) {
  const navigate = useNavigate()
  const [purpose, setPurpose] = useState(initialPurpose)
  const [term, setTerm] = useState('')
  const [type, setType] = useState('')
  function submit(event: React.FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (purpose) params.set('finalidade', purpose)
    if (term.trim()) params.set('q', term.trim())
    if (type) params.set('tipo', type)
    navigate(`/imoveis?${params.toString()}`)
  }
  return <form className="search-box" onSubmit={submit}>
    <div className="search-purpose">
      <button type="button" className={purpose !== 'ALUGUEL' ? 'active' : ''} onClick={() => setPurpose('VENDA')}>Comprar</button>
      <button type="button" className={purpose === 'ALUGUEL' ? 'active' : ''} onClick={() => setPurpose('ALUGUEL')}>Alugar</button>
    </div>
    <div className="search-fields">
      <label className="search-input"><MapPin size={18} /><input list="property-locations" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Cidade, região ou bairro" aria-label="Cidade, região ou bairro" /><datalist id="property-locations">{[...regions, 'Brasília', 'Distrito Federal'].map((region) => <option key={region} value={region} />)}</datalist></label>
      <label className="select-wrap"><Building2 size={17} /><select value={type} onChange={(event) => setType(event.target.value)} aria-label="Tipo de imóvel"><option value="">Tipo de imóvel</option>{propertyTypes.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={15} /></label>
      <button className="button button-dark search-submit" type="submit"><Search size={17} />Buscar imóveis</button>
    </div>
  </form>
}

function HomePage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    getPublicProperties().then(setProperties).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false))
  }, [])
  const featured = properties.filter((property) => property.featured).slice(0, 7)
  const availableRegions = new Set(properties.map((property) => property.neighborhood))
  return <>
    <Header />
    <main>
      <section className="hero">
        <img className="hero-image" src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=2200&q=90" alt="Residência contemporânea cercada por natureza" />
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="hero-kicker"><span /> IMÓVEIS SELECIONADOS · BRASÍLIA E GOIÁS</span>
          <h1>Encontre um lugar<br />para chamar de <em>seu.</em></h1>
          <p>Explore imóveis selecionados nas melhores regiões de Brasília e de outras localidades.</p>
        </div>
        <div className="hero-search"><SearchBox /></div>
        <span className="hero-index">01 — 04</span>
      </section>
      <section className="section featured-section">
        <div className="section-heading"><div><span className="eyebrow gold">ESCOLHAS RDS</span><h2>Imóveis em destaque</h2><p>Espaços com personalidade, selecionados para você.</p></div><Link to="/imoveis" className="text-link">Ver todos os imóveis <ArrowRight size={16} /></Link></div>
        {error && <div className="inline-error">{error}</div>}
        {featured.length > 0 && <PropertyCarousel properties={featured} />}
        {!featured.length && loading && <Loading message="Carregando seleção de imóveis" />}
        {!featured.length && !loading && <div className="empty-featured"><p>{error ? 'Não foi possível carregar os destaques.' : 'Novos imóveis selecionados em breve.'}</p><Link to="/imoveis" className="text-link">Ver imóveis disponíveis <ArrowRight size={16} /></Link></div>}
      </section>
      <section className="regions-section" id="regioes">
        <div className="section region-intro"><span className="eyebrow gold">ONDE VOCÊ QUER VIVER?</span><h2>Regiões que<br /><em>inspiram.</em></h2><p>Da vida tranquila perto do verde ao ritmo vibrante da cidade, há um endereço esperando por você.</p><Link to="/imoveis" className="text-link">Explorar regiões <ArrowRight size={16} /></Link></div>
        <div className="region-grid">{regions.map((region, index) => <Link key={region} to={`/imoveis?q=${encodeURIComponent(region)}`} className={`region-tile region-${index % 6 + 1}`}><span>{availableRegions.has(region) ? `${properties.filter((property) => property.neighborhood === region).length} IMÓVEIS` : `DF · ${String(index + 1).padStart(2, '0')}`}</span><strong>{region}</strong><ArrowUpRight size={18} /></Link>)}</div>
      </section>
      <section className="editorial section" id="sobre"><div className="editorial-image"><img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85" alt="Sala ampla com luz natural" loading="lazy" /></div><div className="editorial-copy"><span className="eyebrow gold">MAIS DO QUE UM IMÓVEL</span><h2>Seu próximo capítulo começa com um <em>endereço.</em></h2><p>Acreditamos que encontrar um imóvel é encontrar um jeito de viver. Por isso, cada espaço da nossa curadoria é escolhido com atenção aos detalhes, à localização e às possibilidades que ele oferece.</p><Link to="/imoveis" className="button button-outline">Encontre seu lugar <ArrowRight size={16} /></Link></div></section>
      <section className="contact-banner"><span className="eyebrow">ESTAMOS AQUI PARA AJUDAR</span><h2>O próximo passo é seu.</h2><p>Conte para a gente o que procura. Vamos encontrar juntos.</p></section>
    </main>
    <Footer />
  </>
}

function Loading({ message = 'Carregando...' }: { message?: string }) {
  return <div className="loading-state"><span className="spinner" />{message}</div>
}

function ResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(true)
  const query = searchParams.get('q') ?? ''
  const purpose = searchParams.get('finalidade') ?? ''
  const [sort, setSort] = useState('recentes')
  const [filters, setFilters] = useState({ type: searchParams.get('tipo') ?? '', state: '', city: '', neighborhood: '', min: '', max: '', areaMin: '', areaMax: '', beds: '', livingRooms: '', suites: '', baths: '', parking: '', feature: '' })
  useEffect(() => {
    let active = true
    setLoading(true)
    getPublicProperties().then((data) => { if (active) setProperties(data) }).catch((reason: Error) => { if (active) setError(reason.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const results = useMemo(() => {
    const search = query.trim().toLocaleLowerCase('pt-BR')
    return properties.filter((property) => {
      const location = `${property.state} ${property.city} ${property.neighborhood} ${property.title} ${property.code}`.toLocaleLowerCase('pt-BR')
      const price = purpose === 'ALUGUEL' ? property.rent_price : property.sale_price
      return (!search || location.includes(search)) &&
        (!purpose || property.purpose === purpose || property.purpose === 'AMBOS') &&
        (!filters.type || property.type === filters.type) &&
        (!filters.state || property.state.toLowerCase().includes(filters.state.toLowerCase())) &&
        (!filters.city || property.city.toLowerCase().includes(filters.city.toLowerCase())) &&
        (!filters.neighborhood || property.neighborhood.toLowerCase().includes(filters.neighborhood.toLowerCase())) &&
        (!filters.min || (price != null && price >= Number(filters.min))) &&
        (!filters.max || (price != null && price <= Number(filters.max))) &&
        (!filters.areaMin || (property.total_area != null && property.total_area >= Number(filters.areaMin))) &&
        (!filters.areaMax || (property.total_area != null && property.total_area <= Number(filters.areaMax))) &&
        (!filters.beds || property.bedrooms >= Number(filters.beds)) &&
        (!filters.livingRooms || (property.living_rooms != null && property.living_rooms >= Number(filters.livingRooms))) &&
        (!filters.suites || property.suites >= Number(filters.suites)) &&
        (!filters.baths || property.bathrooms >= Number(filters.baths)) &&
        (!filters.parking || property.parking_spaces >= Number(filters.parking)) &&
        (!filters.feature || propertyFeatures(property).includes(filters.feature))
    }).sort((a, b) => {
      if (sort === 'menor-preco') return (a.sale_price ?? a.rent_price ?? 0) - (b.sale_price ?? b.rent_price ?? 0)
      if (sort === 'maior-preco') return (b.sale_price ?? b.rent_price ?? 0) - (a.sale_price ?? a.rent_price ?? 0)
      if (sort === 'maior-area') return (b.total_area ?? 0) - (a.total_area ?? 0)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [properties, query, purpose, filters, sort])
  function setFilter(key: keyof typeof filters, value: string) { setFilters((current) => ({ ...current, [key]: value })) }
  function clearFilters() {
    setFilters({ type: '', state: '', city: '', neighborhood: '', min: '', max: '', areaMin: '', areaMax: '', beds: '', livingRooms: '', suites: '', baths: '', parking: '', feature: '' })
    setSearchParams({})
  }
  return <><Header /><main className="results-page">
    <div className="results-heading"><div><span className="eyebrow gold">A SUA PRÓXIMA HISTÓRIA</span><h1>Encontre seu imóvel</h1><p>Explore espaços escolhidos para combinar com o seu jeito de viver.</p></div><div className="results-breadcrumb"><Link to="/">Início</Link><ChevronRight size={14} /> Imóveis</div></div>
    <div className="results-layout">
      <aside className={`filter-panel ${filtersOpen ? '' : 'filters-collapsed'}`}>
        <div className="filter-title"><span><SlidersHorizontal size={17} /> Filtros</span><button className="clear-button" onClick={clearFilters}>Limpar</button></div>
        <label className="field-label">Finalidade<select value={purpose} onChange={(event) => { const params = new URLSearchParams(searchParams); event.target.value ? params.set('finalidade', event.target.value) : params.delete('finalidade'); setSearchParams(params) }}><option value="">Todas</option><option value="VENDA">Comprar</option><option value="ALUGUEL">Alugar</option></select></label>
        <label className="field-label">Tipo de imóvel<select value={filters.type} onChange={(event) => setFilter('type', event.target.value)}><option value="">Todos os tipos</option>{propertyTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <div className="filter-divider" />
        <span className="filter-group-title">Localização</span>
        <label className="field-label">Estado<input value={filters.state} onChange={(event) => setFilter('state', event.target.value)} placeholder="Ex.: Distrito Federal" /></label>
        <label className="field-label">Cidade<input value={filters.city} onChange={(event) => setFilter('city', event.target.value)} placeholder="Ex.: Brasília" /></label>
        <label className="field-label">Região / bairro<input value={filters.neighborhood} onChange={(event) => setFilter('neighborhood', event.target.value)} placeholder="Ex.: Asa Sul" /></label>
        <div className="filter-divider" /><span className="filter-group-title">Faixa de preço (R$)</span>
        <div className="two-fields"><label className="field-label">Mínimo<input type="number" value={filters.min} onChange={(event) => setFilter('min', event.target.value)} placeholder="0" /></label><label className="field-label">Máximo<input type="number" value={filters.max} onChange={(event) => setFilter('max', event.target.value)} placeholder="Sem limite" /></label></div>
        <span className="filter-group-title">Área (m²)</span>
        <div className="two-fields"><label className="field-label">Mínima<input type="number" value={filters.areaMin} onChange={(event) => setFilter('areaMin', event.target.value)} placeholder="0" /></label><label className="field-label">Máxima<input type="number" value={filters.areaMax} onChange={(event) => setFilter('areaMax', event.target.value)} placeholder="—" /></label></div>
        <div className="filter-divider" /><span className="filter-group-title">Características mínimas</span>
        <div className="two-fields">{([['beds', 'Dormitórios'], ['livingRooms', 'Salas'], ['suites', 'Suítes'], ['baths', 'Banheiros'], ['parking', 'Vagas']] as const).map(([key, title]) => <label key={key} className="field-label">{title}<select value={filters[key]} onChange={(event) => setFilter(key, event.target.value)}><option value="">Qualquer</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}</select></label>)}</div>
        <label className="field-label">Diferencial<select value={filters.feature} onChange={(event) => setFilter('feature', event.target.value)}><option value="">Qualquer</option>{[...new Set(properties.flatMap(propertyFeatures))].sort().map((feature) => <option key={feature}>{feature}</option>)}</select></label>
      </aside>
      <section className="results-content">
        <div className="result-toolbar"><div><button className="filter-toggle" onClick={() => setFiltersOpen(!filtersOpen)}><Filter size={16} />Filtros</button><span><strong>{loading ? '—' : results.length}</strong> imóveis encontrados</span></div><label className="sort-select">Ordenar por <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recentes">Mais recentes</option><option value="menor-preco">Menor preço</option><option value="maior-preco">Maior preço</option><option value="maior-area">Maior metragem</option></select></label></div>
        {error && <div className="inline-error">{error}</div>}
        {loading ? <Loading message="Buscando imóveis" /> : results.length ? <PropertyCarousel properties={results} desktopGrid /> : <div className="empty-state"><Search size={28} /><h3>Nenhum imóvel encontrado</h3><p>Tente ajustar ou limpar os filtros para ampliar sua busca.</p><button className="button button-outline" onClick={clearFilters}>Limpar filtros</button></div>}
      </section>
    </div>
  </main><Footer /></>
}

function DetailPage() {
  const { id = '' } = useParams()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [settingsError, setSettingsError] = useState('')
  const [settings, setSettings] = useState({ company_name: 'RDS Imóveis', whatsapp: '', contact_email: '', instagram_url: '' })
  const [photo, setPhoto] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [inquiry, setInquiry] = useState({ name: '', email: '', whatsapp: '' })
  const [inquiryConsent, setInquiryConsent] = useState(false)
  const [inquirySending, setInquirySending] = useState(false)
  const [inquirySent, setInquirySent] = useState(false)
  const [inquiryError, setInquiryError] = useState('')
  const inquiryRequestId = useRef(0)
  useEffect(() => {
    inquiryRequestId.current += 1
    setInquiry({ name: '', email: '', whatsapp: '' })
    setInquiryConsent(false)
    setInquirySending(false)
    setInquirySent(false)
    setInquiryError('')
    let active = true
    getPublicProperties().then((properties) => {
      const found = properties.find((candidate) => candidate.id === id || candidate.code === id)
      if (active) setProperty(found ?? null)
    }).catch((reason: Error) => { if (active) setError(reason.message) }).finally(() => { if (active) setLoading(false) })
    getSiteSettings().then((siteSettings) => { if (active) setSettings(siteSettings) }).catch((reason: Error) => { if (active) setSettingsError(reason.message) })
    return () => { active = false }
  }, [id])
  if (loading) return <><Header /><Loading message="Carregando imóvel" /></>
  if (error || !property) return <><Header /><div className="empty-state detail-empty"><Home size={30} /><h2>Imóvel não encontrado</h2><p>{error || 'Este imóvel não está disponível ou não existe.'}</p><Link className="button button-outline" to="/imoveis">Voltar aos imóveis</Link></div><Footer /></>
  const images = property.property_images?.length ? property.property_images : [{ id: 'fallback', property_id: id, url: imageFallback, display_order: 0, is_cover: true }]
  const currentProperty = property
  const contactPhone = property.broker?.whatsapp ?? property.broker?.phone ?? property.captor?.whatsapp ?? property.captor?.phone ?? settings.whatsapp
  const inquiryWhatsAppUrl = inquirySent ? propertyInquiryWhatsAppUrl(propertyInquiryWhatsAppRecipient, property, inquiry) : ''
  async function submitInquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setInquirySending(true)
    setInquiryError('')
    const requestId = ++inquiryRequestId.current
    try {
      const form = event.currentTarget
      const website = new FormData(form).get('website')?.toString() ?? ''
      await sendPropertyInquiry({ propertyId: currentProperty.id, ...inquiry, honeypot: website })
      if (inquiryRequestId.current === requestId) setInquirySent(true)
    } catch (reason) {
      if (inquiryRequestId.current === requestId) setInquiryError(reason instanceof Error ? reason.message : 'Não foi possível enviar sua solicitação.')
    } finally {
      if (inquiryRequestId.current === requestId) setInquirySending(false)
    }
  }
  function shiftPhoto(direction: number) { setPhoto((current) => (current + direction + images.length) % images.length) }
  const detailFeatureGroups = [
    ...propertyFeatureGroups.map(([label, key]) => ({ label, items: property[key] ?? [] })),
    ...(property.social_balcony ? [{ label: 'Área social', items: ['Sacada ou varanda na área social'] }] : []),
  ].filter((group) => group.items.length > 0)
  const groupedFeatureNames = new Set(detailFeatureGroups.flatMap((group) => group.items))
  const otherFeatures = property.features.filter((feature) => !groupedFeatureNames.has(feature))
  return <><Header /><main className="detail-page">
    <div className="detail-topline"><Link to="/imoveis"><ArrowLeft size={15} /> Voltar aos imóveis</Link><span>{property.code}</span></div>
    <div className="gallery">
      <button className="gallery-main" onClick={() => setLightbox(true)} aria-label="Ampliar foto"><img src={images[photo].url} alt={`${property.title} — foto ${photo + 1}`} onError={(event) => { event.currentTarget.src = imageFallback }} /><span className="gallery-count">{photo + 1} / {images.length} <ArrowUpRight size={14} /></span></button>
      <div className="gallery-thumbs">{images.slice(0, 4).map((image, index) => <button key={image.id} className={index === photo ? 'thumb active' : 'thumb'} onClick={() => setPhoto(index)}><img src={image.url} alt={`Miniatura ${index + 1}`} /></button>)}{images.length > 4 && <button className="more-photos" onClick={() => setLightbox(true)}>+{images.length - 4}<span>fotos</span></button>}</div>
    </div>
    <div className="detail-grid">
      <article className="detail-main">
        <span className="eyebrow gold">{property.type} <span>·</span> {property.neighborhood}, {property.city}</span>
        <h1>{property.title}</h1>
        <p className="detail-location"><MapPin size={16} />{property.city}, {property.state}</p>
        <div className="detail-specs"><span><BedDouble />{property.bedrooms} quartos</span><span><Bath />{property.bathrooms} banheiros</span><span><Square />{property.total_area ?? '—'} m²</span><span><DoorOpen />{property.parking_spaces} vagas</span></div>
        <div className="detail-section"><h2>Sobre este imóvel</h2><p className="description">{property.description}</p></div>
        <div className="detail-section"><h2>Detalhes do imóvel</h2><div className="detail-facts">{[
          ['Código', property.code], ['Tipo', property.type], ['Área total', property.total_area ? `${property.total_area} m²` : '—'],
          ['Área privativa', property.private_area ? `${property.private_area} m²` : '—'], ['Dormitórios', String(property.bedrooms)], ['Salas', property.living_rooms == null ? '—' : String(property.living_rooms)], ['Suítes', String(property.suites)],
          ['Banheiros', String(property.bathrooms)], ['Vagas', String(property.parking_spaces)], ['Condomínio', currency(property.condo_fee)],
          ['IPTU', property.property_tax ? `${currency(property.property_tax)} ${property.tax_frequency === 'ANUAL' ? '/ ano' : '/ mês'}` : '—'],
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></div>
        {(property.owner_name || property.owner_phone) && <div className="detail-section"><h2>Dados do proprietário</h2><div className="detail-facts">{property.owner_name && <div><span>Nome</span><strong>{property.owner_name}</strong></div>}{property.owner_phone && <div><span>Telefone</span><strong><a href={`tel:${property.owner_phone.replace(/[^\d+]/g, '')}`}>{property.owner_phone}</a></strong></div>}</div></div>}
        {!!otherFeatures.length && <div className="detail-section"><h2>Outros diferenciais</h2><div className="feature-tags">{otherFeatures.map((feature) => <span key={feature}><Check size={14} />{feature}</span>)}</div></div>}
        {detailFeatureGroups.map((group) => <div className="detail-section" key={group.label}><h2>{group.label}</h2><div className="feature-tags">{group.items.map((feature) => <span key={feature}><Check size={14} />{feature}</span>)}</div></div>)}
        {!!property.property_videos?.length && <div className="detail-section"><h2>Conheça por vídeo</h2><div className="video-grid">{property.property_videos.map((video) => { const embed = youtubeEmbed(video.url); return embed ? <iframe key={video.id} src={embed} title={`Vídeo de ${property.title}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : null })}</div></div>}
        {!!property.property_links?.length && <div className="detail-section"><h2>Saiba mais</h2><div className="external-links">{property.property_links.filter((link) => link.is_public).map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer">{link.image_url ? <img src={link.image_url} alt="" /> : <ArrowUpRight size={16} />}{link.name}</a>)}</div></div>}
      </article>
      <aside className="contact-card">
        <span className="eyebrow gold">VALOR DO IMÓVEL</span>
        {property.sale_price != null && <div className="detail-price">{currency(property.sale_price)}<span>Venda</span></div>}
        {property.rent_price != null && <div className="detail-rent">{currency(property.rent_price)}<span>/ mês</span></div>}
        {property.condo_fee != null && <span className="condo-note">Condomínio {currency(property.condo_fee)} / mês</span>}
        <div className="contact-divider" />
        <span className="eyebrow">ATENDIMENTO</span>
        <div className="agent"><div className="agent-avatar">{property.broker?.photo_url || property.captor?.photo_url ? <img src={property.broker?.photo_url ?? property.captor?.photo_url ?? ''} alt="" /> : <CircleUserRound size={25} />}</div><div><strong>{property.broker?.name ?? property.captor?.name ?? 'Equipe RDS'}</strong><span>Especialista imobiliário</span></div></div>
        {contactPhone ? <a className="button button-dark full-button" href={whatsappUrl(contactPhone, property.code)} target="_blank" rel="noreferrer">Conversar pelo WhatsApp <ArrowUpRight size={17} /></a> : <span className="contact-unavailable">{settingsError ? 'Não foi possível carregar os canais de contato.' : 'WhatsApp não configurado para este atendimento.'}</span>}
        <span className="property-code-note">Código do imóvel: {property.code}</span>
      </aside>
    </div>
    <section className="property-inquiry" aria-labelledby="property-inquiry-title">
      <div className="property-inquiry-copy"><span className="eyebrow gold">FALE COM A RDS</span><h2 id="property-inquiry-title">Gostou deste imóvel?</h2><p>Deixe seus dados para recebermos seu interesse. Enviaremos os detalhes do imóvel e suas informações para nossa equipe.</p></div>
      {inquirySent ? <div className="inquiry-result success-alert" role="status"><strong>Solicitação enviada!</strong><span>Enviamos os dados do imóvel e seu contato para a equipe RDS.</span><a className="button button-dark full-button" href={inquiryWhatsAppUrl} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Enviar também pelo WhatsApp</a></div> : <form className="property-inquiry-form" onSubmit={(event) => void submitInquiry(event)}>
        {inquiryError && <div className="admin-alert error-alert" role="alert">{inquiryError}</div>}
        <label className="inquiry-honeypot" aria-hidden="true">Não preencher<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <label className="admin-field">Seu nome<input required maxLength={120} autoComplete="name" value={inquiry.name} onChange={(event) => setInquiry((current) => ({ ...current, name: event.target.value }))} placeholder="Nome completo" /></label>
        <label className="admin-field">Seu WhatsApp<input required type="tel" maxLength={25} autoComplete="tel" value={inquiry.whatsapp} onChange={(event) => setInquiry((current) => ({ ...current, whatsapp: event.target.value }))} placeholder="(61) 99999-9999" /></label>
        <label className="admin-field inquiry-email-field">Seu e-mail<input required type="email" maxLength={254} autoComplete="email" value={inquiry.email} onChange={(event) => setInquiry((current) => ({ ...current, email: event.target.value }))} placeholder="voce@email.com" /></label>
        <label className="inquiry-consent"><input required type="checkbox" checked={inquiryConsent} onChange={(event) => setInquiryConsent(event.target.checked)} /><span>Autorizo o uso destes dados pela RDS Imóveis e pelo responsável por este anúncio para tratar do meu interesse neste imóvel.</span></label>
        <button className="button button-dark full-button" disabled={inquirySending}>{inquirySending ? 'Enviando solicitação...' : 'Enviar meu interesse'} <ArrowRight size={17} /></button>
      </form>}
    </section>
    {lightbox && <div className="lightbox" role="dialog" aria-modal="true" aria-label="Galeria de fotos"><button className="lightbox-close" onClick={() => setLightbox(false)} aria-label="Fechar"><X /></button><button className="lightbox-arrow prev" onClick={() => shiftPhoto(-1)} aria-label="Foto anterior"><ChevronLeft /></button><img src={images[photo].url} alt={property.title} /><button className="lightbox-arrow next" onClick={() => shiftPhoto(1)} aria-label="Próxima foto"><ChevronRight /></button><span>{photo + 1} / {images.length}</span></div>}
  </main><Footer /></>
}

const blankInput: PropertyInput = {
  code: '', title: '', type: 'Apartamento', purpose: 'VENDA', status: 'CRIADO', captor_id: null, broker_id: null,
  zip_code: null, state: 'Distrito Federal', city: 'Brasília', neighborhood: '', address: null, number: null, complement: null,
  sale_price: null, rent_price: null, condo_fee: null, property_tax: null, tax_frequency: null,
  total_area: null, private_area: null, bedrooms: 0, suites: 0, bathrooms: 0, parking_spaces: 0,
  floor: null, construction_year: null, furnished: false, financing: false, trade: false, features: [],
  owner_name: null, owner_phone: null, living_rooms: null, social_balcony: false, infrastructure: [], service_areas: [],
  leisure_areas: [], intimate_features: [], closets: [], floor_types: [], description: '', featured: false,
}

const brazilianStateNames: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
  SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
}

function propertyInput(property: Property | null): PropertyInput {
  if (!property) return { ...blankInput }
  const { id: _id, created_at: _created, updated_at: _updated, captor: _captor, broker: _broker, property_images: _images, property_videos: _videos, property_links: _links, status_history: _history, integrations: _integrations, ...input } = property
  void _id; void _created; void _updated; void _captor; void _broker; void _images; void _videos; void _links; void _history; void _integrations
  const values = { ...blankInput, ...input }
  if (property.furnished && !values.infrastructure.includes('Mobiliado')) values.infrastructure = [...values.infrastructure, 'Mobiliado']
  return values
}

const propertyEditorDraftPrefix = 'rds-property-editor-draft:'
const propertyEditorDraftLifetime = 5 * 60 * 1000

interface PropertyEditorDraft {
  updatedAt: number
  values: PropertyInput
  images: PropertyImage[]
  videos: string
  links: PropertyLink[]
  activePortals: IntegrationPortal[]
  hadPendingPhotos: boolean
}

function propertyEditorDraftKey(userId: string, propertyId: string | null) {
  return `${propertyEditorDraftPrefix}${userId}:${propertyId ?? 'new'}`
}

function readPropertyEditorDraft(userId: string, propertyId: string | null): PropertyEditorDraft | null {
  const key = propertyEditorDraftKey(userId, propertyId)
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const draft: unknown = JSON.parse(raw)
    if (!draft || typeof draft !== 'object') {
      localStorage.removeItem(key)
      return null
    }
    const candidate = draft as Partial<PropertyEditorDraft>
    const valid = typeof candidate.updatedAt === 'number'
      && Date.now() - candidate.updatedAt < propertyEditorDraftLifetime
      && candidate.updatedAt <= Date.now()
      && candidate.values != null
      && Array.isArray(candidate.images)
      && typeof candidate.videos === 'string'
      && Array.isArray(candidate.links)
      && Array.isArray(candidate.activePortals)
    if (!valid) {
      localStorage.removeItem(key)
      return null
    }
    return candidate as PropertyEditorDraft
  } catch (reason) {
    console.error('Could not restore the property editor draft:', reason)
    return null
  }
}

function clearPropertyEditorDraft(userId: string, propertyId: string | null) {
  try {
    localStorage.removeItem(propertyEditorDraftKey(userId, propertyId))
  } catch (reason) {
    console.error('Could not clear the property editor draft:', reason)
  }
}

function clearUserPropertyEditorDrafts(userId: string) {
  try {
    const prefix = `${propertyEditorDraftPrefix}${userId}:`
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .filter((key): key is string => key?.startsWith(prefix) ?? false)
    keys.forEach((key) => localStorage.removeItem(key))
  } catch (reason) {
    console.error('Could not clear the administrator property drafts:', reason)
  }
}

function PropertyEditor({ property, userId, captors, brokers, onCancel, onSaved }: {
  property: Property | null
  userId: string
  captors: Captor[]
  brokers: Captor[]
  onCancel: () => void
  onSaved: () => void
}) {
  const draftKey = propertyEditorDraftKey(userId, property?.id ?? null)
  const [initialDraft] = useState(() => readPropertyEditorDraft(userId, property?.id ?? null))
  const [values, setValues] = useState<PropertyInput>(() => ({ ...propertyInput(property), ...initialDraft?.values }))
  const [images, setImages] = useState<PropertyImage[]>(() => initialDraft?.images ?? property?.property_images ?? [])
  const [photos, setPhotos] = useState<File[]>([])
  const [videos, setVideos] = useState(() => initialDraft?.videos ?? (property?.property_videos ?? []).map((video) => video.url).join('\n'))
  const [links, setLinks] = useState<PropertyLink[]>(() => initialDraft?.links ?? property?.property_links ?? [])
  const [activePortals, setActivePortals] = useState<IntegrationPortal[]>(() => initialDraft?.activePortals ?? property?.integrations?.filter((integration) => integration.ativo).map((integration) => integration.portal) ?? [])
  const [draftRestored] = useState(Boolean(initialDraft))
  const [draftError, setDraftError] = useState('')
  const hadPendingPhotos = useRef(Boolean(initialDraft?.hadPendingPhotos))
  const [cepLookupStatus, setCepLookupStatus] = useState('')
  const lastZipCode = useRef(String(initialDraft?.values.zip_code ?? property?.zip_code ?? '').replace(/\D/g, ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const featureOptions = ['Piscina', 'Churrasqueira', 'Varanda', 'Varanda gourmet', 'Academia', 'Elevador', 'Portaria 24h', 'Playground', 'Salão de festas', 'Ar-condicionado', 'Armários planejados', 'Área de serviço', 'Jardim', 'Outros']
  useEffect(() => {
    const draft: PropertyEditorDraft = {
      updatedAt: Date.now(),
      values,
      images,
      videos,
      links,
      activePortals,
      hadPendingPhotos: hadPendingPhotos.current || photos.length > 0,
    }
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft))
      hadPendingPhotos.current = draft.hadPendingPhotos
      setDraftError('')
    } catch (reason) {
      console.error('Could not save the property editor draft:', reason)
      setDraftError('Não foi possível guardar o rascunho neste navegador.')
    }
  }, [activePortals, draftKey, images, links, photos.length, values, videos])
  useEffect(() => {
    const zipCode = String(values.zip_code ?? '').replace(/\D/g, '')
    if (zipCode === lastZipCode.current) return
    lastZipCode.current = zipCode
    if (zipCode.length !== 8) {
      setCepLookupStatus('')
      return
    }

    const controller = new AbortController()
    let active = true
    const currentValues = values
    setCepLookupStatus('Buscando endereço pelo CEP...')
    fetch(`https://viacep.com.br/ws/${zipCode}/json/`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Não foi possível consultar o CEP. Tente novamente.')
        const result: unknown = await response.json()
        if (!result || typeof result !== 'object' || 'erro' in result && result.erro === true) {
          throw new Error('CEP não encontrado. Confira o número e tente novamente.')
        }
        return result as { logradouro?: string; bairro?: string; localidade?: string; uf?: string }
      })
      .then((result) => {
        if (!active) return
        setValues((current) => ({
          ...current,
          ...(result.uf && current.state === currentValues.state ? { state: brazilianStateNames[result.uf] ?? result.uf } : {}),
          ...(result.localidade && current.city === currentValues.city ? { city: result.localidade } : {}),
          ...(result.bairro && current.neighborhood === currentValues.neighborhood ? { neighborhood: result.bairro } : {}),
          ...(result.logradouro && current.address === currentValues.address ? { address: result.logradouro } : {}),
        }))
        setCepLookupStatus('Endereço preenchido pelo CEP. Confira os dados antes de salvar.')
      })
      .catch((reason: unknown) => {
        if (!active || reason instanceof DOMException && reason.name === 'AbortError') return
        setCepLookupStatus(reason instanceof Error ? reason.message : 'Não foi possível consultar o CEP. Tente novamente.')
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [values.zip_code])
  function text(key: keyof PropertyInput, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }
  function numeric(key: keyof PropertyInput, value: string) {
    const parsed = numberValue(value)
    setValues((current) => ({ ...current, [key]: parsed }))
  }
  function toggleFeature(feature: string) {
    setValues((current) => ({ ...current, features: current.features.includes(feature) ? current.features.filter((item) => item !== feature) : [...current.features, feature] }))
  }
  function togglePropertyOption(key: 'infrastructure' | 'service_areas' | 'leisure_areas' | 'intimate_features' | 'closets' | 'floor_types', option: string) {
    setValues((current) => {
      const selected = current[key].includes(option)
      let nextOptions = selected ? current[key].filter((item) => item !== option) : [...current[key], option]
      if (key === 'infrastructure' && !selected && option === 'Mobiliado') nextOptions = nextOptions.filter((item) => item !== 'Semimobiliado')
      if (key === 'infrastructure' && !selected && option === 'Semimobiliado') nextOptions = nextOptions.filter((item) => item !== 'Mobiliado')
      return {
        ...current,
        [key]: nextOptions,
        ...(key === 'infrastructure' && ['Mobiliado', 'Semimobiliado'].includes(option) ? { furnished: option === 'Mobiliado' && !selected } : {}),
      }
    })
  }
  function moveImage(index: number, direction: number) {
    const target = index + direction
    if (target < 0 || target >= images.length) return
    const reordered = [...images]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    setImages(reordered.map((image, order) => ({ ...image, display_order: order, is_cover: order === 0 })))
  }
  function moveLink(index: number, direction: number) {
    const target = index + direction
    if (target < 0 || target >= links.length) return
    const reordered = [...links]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    setLinks(reordered.map((link, order) => ({ ...link, display_order: order })))
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true); setError(''); setSuccess('')
    try {
      if (values.status === 'PUBLICADO' && images.length === 0 && photos.length === 0) {
        setError('Adicione ao menos uma fotografia antes de publicar o imóvel.')
        setSaving(false)
        return
      }
      const videoUrls = videos.split('\n').map((url) => url.trim()).filter(Boolean)
      for (const url of videoUrls) {
        if (!youtubeEmbed(url)) throw new Error(`O link de vídeo não parece ser válido: ${url}`)
      }
      for (const link of links) {
        if (!link.name.trim() || !link.url.trim()) throw new Error('Preencha o nome e a URL de todos os links externos ou remova os links vazios.')
        const url = new URL(link.url)
        if (!['https:', 'http:'].includes(url.protocol)) throw new Error(`O link "${link.name}" precisa usar HTTP ou HTTPS.`)
        if (link.image_url) {
          const imageUrl = new URL(link.image_url)
          if (!['https:', 'http:'].includes(imageUrl.protocol)) throw new Error(`A imagem do link "${link.name}" precisa usar HTTP ou HTTPS.`)
        }
      }
      const propertyValues = {
        ...values,
        owner_name: values.owner_name?.trim() || null,
        owner_phone: values.owner_phone?.trim() || null,
      }
      await saveProperty(propertyValues, property?.id ?? null, photos, videoUrls, links, images, [], activePortals)
      clearPropertyEditorDraft(userId, property?.id ?? null)
      setSuccess('Imóvel salvo com sucesso.')
      onSaved()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o imóvel.')
    } finally { setSaving(false) }
  }
  const field = (label: string, key: keyof PropertyInput, type = 'text', required = false, placeholder = '') => <label className="admin-field">{label}<input type={type} min={type === 'number' ? 0 : undefined} required={required} value={String(values[key] ?? '')} placeholder={placeholder} onChange={(event) => type === 'number' ? numeric(key, event.target.value) : text(key, event.target.value)} /></label>
  const optionGroup = (label: string, key: 'infrastructure' | 'service_areas' | 'leisure_areas' | 'intimate_features' | 'closets' | 'floor_types', options: string[]) => <div className="property-option-group"><span className="form-label">{label}</span><div className="property-option-grid">{options.map((option) => <label className={values[key].includes(option) ? 'property-option selected' : 'property-option'} key={option}><input type="checkbox" checked={values[key].includes(option)} onChange={() => togglePropertyOption(key, option)} />{option}</label>)}</div></div>
  return <form className="admin-editor" onSubmit={submit}>
    <div className="admin-page-heading editor-heading"><div><button type="button" className="back-button" onClick={onCancel}><ArrowLeft size={15} /> Todos os imóveis</button><h1>{property ? 'Editar imóvel' : 'Cadastrar imóvel'}</h1><p>Preencha os detalhes para manter sua carteira atualizada.</p></div></div>
    <div className="admin-alert info-alert">{draftRestored ? 'Rascunho recuperado deste navegador. Ele será mantido por até 5 minutos após a última alteração.' : 'As alterações não salvas ficam guardadas neste navegador por até 5 minutos após a última alteração.'}{initialDraft?.hadPendingPhotos && ' As fotos locais selecionadas anteriormente precisam ser adicionadas novamente.'}</div>
    {draftError && <div className="admin-alert error-alert">{draftError}</div>}
    {error && <div className="admin-alert error-alert">{error}</div>}{success && <div className="admin-alert success-alert">{success}</div>}
    <section className="form-section"><div className="form-section-heading"><span>01</span><div><h2>Identificação</h2><p>Informações básicas do anúncio</p></div></div><div className="admin-form-grid">
      {field('Título do imóvel', 'title', 'text', true, 'Ex.: Apartamento com vista livre')}
      {field('Código do imóvel', 'code', 'text', false, property ? '' : 'Gerado automaticamente')}
      <label className="admin-field">Tipo de imóvel<select value={values.type} onChange={(event) => text('type', event.target.value)}>{propertyTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label className="admin-field">Finalidade<select value={values.purpose} onChange={(event) => text('purpose', event.target.value)}><option value="VENDA">Venda</option><option value="ALUGUEL">Aluguel</option><option value="AMBOS">Venda e aluguel</option></select></label>
      <label className="admin-field">Status<select value={values.status} onChange={(event) => text('status', event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{statusNames[status]}</option>)}</select></label>
      <label className="admin-field">Captador<select value={values.captor_id ?? ''} onChange={(event) => setValues((current) => ({ ...current, captor_id: event.target.value || null }))}><option value="">Não atribuído</option>{captors.filter((member) => member.active).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <label className="admin-field">Corretor de atendimento<select value={values.broker_id ?? ''} onChange={(event) => setValues((current) => ({ ...current, broker_id: event.target.value || null }))}><option value="">Não atribuído</option>{brokers.filter((member) => member.active).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <label className="check-field"><input type="checkbox" checked={values.featured} onChange={(event) => setValues((current) => ({ ...current, featured: event.target.checked }))} />Destacar na página inicial</label>
    </div>{property?.status_history?.length ? <div className="status-history"><h3>Histórico de status</h3>{property.status_history.map((entry) => <div key={entry.id}><span>{new Date(entry.changed_at).toLocaleString('pt-BR')}</span><strong>{entry.from_status ? statusNames[entry.from_status] : 'Cadastro'} → {statusNames[entry.to_status]}</strong><small>Responsável: {entry.changed_by_name ?? 'Administrador'}</small></div>)}</div> : null}</section>
    <section className="form-section"><div className="form-section-heading"><span>02</span><div><h2>Localização</h2><p>O endereço público exibe região e cidade</p></div></div><div className="admin-form-grid">
      <label className="admin-field">CEP<input type="text" inputMode="numeric" autoComplete="postal-code" value={String(values.zip_code ?? '')} placeholder="00000-000" onChange={(event) => text('zip_code', event.target.value)} />{cepLookupStatus && <small role="status">{cepLookupStatus}</small>}</label>{field('Estado', 'state', 'text', true)}{field('Cidade', 'city', 'text', true)}{field('Região / bairro', 'neighborhood', 'text', true)}
      {field('Endereço', 'address')}{field('Número', 'number')}{field('Complemento', 'complement')}
    </div></section>
    <section className="form-section"><div className="form-section-heading"><span>03</span><div><h2>Valores</h2><p>Preencha apenas os valores aplicáveis</p></div></div><div className="admin-form-grid">
      {field('Preço de venda (R$)', 'sale_price', 'number')}{field('Preço de aluguel mensal (R$)', 'rent_price', 'number')}{field('Condomínio mensal (R$)', 'condo_fee', 'number')}{field('IPTU (R$)', 'property_tax', 'number')}
      <label className="admin-field">Frequência do IPTU<select value={values.tax_frequency ?? ''} onChange={(event) => setValues((current) => ({ ...current, tax_frequency: event.target.value || null }))}><option value="">Não informado</option><option value="MENSAL">Mensal</option><option value="ANUAL">Anual</option></select></label>
    </div></section>
    <section className="form-section"><div className="form-section-heading"><span>04</span><div><h2>Características básicas</h2><p>Medidas e comodidades gerais do imóvel</p></div></div><div className="admin-form-grid">
      {field('Área total (m²)', 'total_area', 'number')}{field('Área privativa (m²)', 'private_area', 'number')}{field('Suítes', 'suites', 'number')}{field('Banheiros', 'bathrooms', 'number')}{field('Vagas', 'parking_spaces', 'number')}{field('Andar', 'floor', 'number')}{field('Ano de construção', 'construction_year', 'number')}
      <div className="check-group">{([['financing', 'Aceita financiamento'], ['trade', 'Aceita permuta']] as const).map(([key, label]) => <label className="check-field" key={key}><input type="checkbox" checked={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}</div>
      <div className="feature-picker"><span className="form-label">Diferenciais</span><div className="feature-options">{featureOptions.map((feature) => <label key={feature} className={values.features.includes(feature) ? 'feature-option selected' : 'feature-option'}><input type="checkbox" checked={values.features.includes(feature)} onChange={() => toggleFeature(feature)} />{feature}</label>)}</div></div>
      {(values.features.includes('Outros') || values.features.some((feature) => !featureOptions.includes(feature))) && <label className="admin-field">Outros diferenciais<input value={values.features.filter((feature) => !featureOptions.includes(feature)).join(', ')} onChange={(event) => setValues((current) => ({ ...current, features: [...current.features.filter((feature) => featureOptions.includes(feature)), ...event.target.value.split(',').map((feature) => feature.trim()).filter(Boolean)] }))} placeholder="Separe por vírgula" /></label>}
    </div></section>
    <section className="form-section"><div className="form-section-heading"><span>05</span><div><h2>Dados do proprietário</h2><p>Informações de contato do proprietário</p></div></div><div className="admin-form-grid">
      <label className="admin-field">Nome do proprietário<input value={values.owner_name ?? ''} onChange={(event) => text('owner_name', event.target.value)} /></label>
      <label className="admin-field">Telefone do proprietário<input type="tel" autoComplete="tel" value={values.owner_phone ?? ''} placeholder="Celular ou telefone fixo" onChange={(event) => text('owner_phone', event.target.value)} /></label>
    </div></section>
    <section className="form-section"><div className="form-section-heading"><span>06</span><div><h2>Infraestrutura do imóvel</h2><p>Marque todas as características existentes</p></div></div>{optionGroup('Infraestrutura', 'infrastructure', infrastructureOptions)}</section>
    <section className="form-section"><div className="form-section-heading"><span>07</span><div><h2>Área de serviço</h2><p>Selecione os ambientes e recursos disponíveis</p></div></div>{optionGroup('Ambientes', 'service_areas', serviceAreaOptions)}</section>
    <section className="form-section"><div className="form-section-heading"><span>08</span><div><h2>Lazer e áreas externas</h2><p>Marque todas as opções disponíveis</p></div></div>{optionGroup('Lazer e áreas externas', 'leisure_areas', leisureAreaOptions)}</section>
    <section className="form-section"><div className="form-section-heading"><span>09</span><div><h2>Salas e área social</h2><p>Quantidade de salas e acesso à área externa</p></div></div><div className="admin-form-grid">
      {field('Quantidade de salas', 'living_rooms', 'number')}
      <label className="check-field"><input type="checkbox" checked={values.social_balcony} onChange={(event) => setValues((current) => ({ ...current, social_balcony: event.target.checked }))} />Sacada ou varanda na área social</label>
    </div></section>
    <section className="form-section"><div className="form-section-heading"><span>10</span><div><h2>Área íntima</h2><p>Dormitórios e características dos ambientes íntimos</p></div></div><div className="admin-form-grid">{field('Quantidade de dormitórios', 'bedrooms', 'number', true)}{optionGroup('Características', 'intimate_features', intimateFeatureOptions)}</div></section>
    <section className="form-section"><div className="form-section-heading"><span>11</span><div><h2>Armários</h2><p>Marque os ambientes que possuem armários</p></div></div>{optionGroup('Ambientes com armários', 'closets', closetOptions)}</section>
    <section className="form-section"><div className="form-section-heading"><span>12</span><div><h2>Tipos de piso</h2><p>Selecione todos os tipos de piso existentes</p></div></div>{optionGroup('Pisos', 'floor_types', floorTypeOptions)}</section>
    <section className="form-section"><div className="form-section-heading"><span>13</span><div><h2>Descrição</h2><p>Apresente os diferenciais deste imóvel</p></div></div><label className="admin-field">Descrição completa<textarea rows={6} value={values.description} onChange={(event) => text('description', event.target.value)} placeholder="Conte o que torna este imóvel especial..." /></label></section>
    <section className="form-section"><div className="form-section-heading"><span>14</span><div><h2>Fotografias</h2><p>Imagens nítidas ajudam a apresentar melhor o imóvel</p></div></div><label className="upload-zone"><Upload size={23} /><strong>Adicionar fotografias</strong><span>JPG, PNG ou WEBP · até 12 MB por imagem</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setPhotos((current) => [...current, ...Array.from(event.target.files ?? [])])} /></label><div className="image-manager">
      {images.map((image, index) => <div className="managed-image" key={image.id}><img src={image.url} alt={`Foto ${index + 1}`} /><span>{index === 0 ? 'Principal' : `Foto ${index + 1}`}</span><div><button type="button" onClick={() => moveImage(index, -1)} aria-label="Mover foto para cima"><ArrowUp size={14} /></button><button type="button" onClick={() => moveImage(index, 1)} aria-label="Mover foto para baixo"><ArrowDown size={14} /></button><button type="button" onClick={() => setImages((current) => current.filter((item) => item.id !== image.id).map((item, order) => ({ ...item, display_order: order, is_cover: order === 0 })))} aria-label="Remover foto"><Trash2 size={14} /></button></div></div>)}
      {photos.map((file, index) => <div className="managed-image" key={`${file.name}-${index}`}><img src={URL.createObjectURL(file)} alt={file.name} /><span>Nova foto</span><button type="button" onClick={() => setPhotos((current) => current.filter((_, fileIndex) => fileIndex !== index))} aria-label="Remover nova foto"><Trash2 size={14} /></button></div>)}
    </div></section>
    <section className="form-section"><div className="form-section-heading"><span>15</span><div><h2>Vídeos</h2><p>Adicione links do YouTube, um por linha</p></div></div><label className="admin-field">Links de vídeo<textarea rows={3} value={videos} onChange={(event) => setVideos(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></label></section>
    <section className="form-section"><div className="form-section-heading"><span>16</span><div><h2>Links externos</h2><p>Tour virtual, redes sociais ou outros portais</p></div></div><div className="link-editor-list">{links.map((link, index) => <div className="link-editor-row" key={link.id || `new-${index}`}><input placeholder="Nome do link" value={link.name} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} /><input placeholder="URL https://" value={link.url} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} /><input placeholder="URL da imagem / logotipo (opcional)" value={link.image_url ?? ''} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, image_url: event.target.value || null } : item))} /><label className="check-field"><input type="checkbox" checked={link.is_public} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, is_public: event.target.checked } : item))} />Público</label><button type="button" className="icon-button" onClick={() => moveLink(index, -1)} aria-label="Mover link para cima"><ArrowUp size={14} /></button><button type="button" className="icon-button" onClick={() => moveLink(index, 1)} aria-label="Mover link para baixo"><ArrowDown size={14} /></button><button type="button" className="icon-button danger" onClick={() => setLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Excluir link"><Trash2 size={16} /></button></div>)}<button type="button" className="add-link" onClick={() => setLinks((current) => [...current, { id: '', property_id: property?.id ?? '', name: '', url: '', image_url: null, is_public: true, display_order: current.length }])}><Plus size={16} /> Adicionar link</button></div></section>
    <section className="form-section"><div className="form-section-heading"><span>17</span><div><h2>Portais imobiliários</h2><p>Selecione onde este imóvel deverá ser preparado para publicação</p></div></div><p className="integration-notice">Esta seleção apenas registra sua intenção no sistema. Ainda não gera XML nem publica o anúncio nos portais.</p><div className="integration-options">{([['olx', 'OLX'], ['wimoveis', 'Wimóveis']] as const).map(([portal, label]) => <label className="check-field integration-option" key={portal}><input type="checkbox" checked={activePortals.includes(portal)} onChange={(event) => setActivePortals((current) => event.target.checked ? [...current, portal] : current.filter((item) => item !== portal))} /><span><strong>{label}</strong><small>Incluir este imóvel na seleção futura do feed</small></span></label>)}</div></section>
    <div className="editor-bottom"><button type="button" className="button button-outline" onClick={onCancel}>Cancelar</button><button className="button button-dark" disabled={saving}>{saving ? 'Salvando...' : 'Salvar imóvel'}</button></div>
  </form>
}

function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const authUserId = useRef<string | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [team, setTeam] = useState<Captor[]>([])
  const [captors, setCaptors] = useState<Captor[]>([])
  const [brokers, setBrokers] = useState<Captor[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [dataError, setDataError] = useState('')
  const [filter, setFilter] = useState({ query: '', status: '', type: '', captor: '' })
  const [memberKind, setMemberKind] = useState<'captor' | 'broker'>('captor')
  const [memberName, setMemberName] = useState('')
  const [memberPhone, setMemberPhone] = useState('')
  const [memberWhatsapp, setMemberWhatsapp] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberEditingId, setMemberEditingId] = useState<string | null>(null)
  const [memberPhoto, setMemberPhoto] = useState<File | null>(null)
  const [memberPhotoPreview, setMemberPhotoPreview] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [reportFilters, setReportFilters] = useState({ status: '', type: '', purpose: '', captor: '', region: '', from: '', to: '' })
  const [interactionFilterDraft, setInteractionFilterDraft] = useState<{ regions: string[]; from: string; to: string }>({ regions: [], from: '', to: '' })
  const [interactionFilters, setInteractionFilters] = useState<{ regions: string[]; from: string; to: string }>({ regions: [], from: '', to: '' })
  const [propertyInteractions, setPropertyInteractions] = useState<PropertyInteraction[]>([])
  const [interactionsLoading, setInteractionsLoading] = useState(false)
  const [interactionsError, setInteractionsError] = useState('')
  const [settings, setSettings] = useState({ company_name: 'RDS Imóveis', whatsapp: '', contact_email: '', instagram_url: '' })
  const [settingsError, setSettingsError] = useState('')
  const [settingsSuccess, setSettingsSuccess] = useState('')
  const [memberError, setMemberError] = useState('')
  const [memberSuccess, setMemberSuccess] = useState('')
  const [reportPropertyPage, setReportPropertyPage] = useState(1)
  const [reportEmailPage, setReportEmailPage] = useState(1)
  const [propertyListPage, setPropertyListPage] = useState(1)
  useEffect(() => {
    if (!memberPhoto) { setMemberPhotoPreview(''); return }
    const previewUrl = URL.createObjectURL(memberPhoto)
    setMemberPhotoPreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [memberPhoto])
  useEffect(() => { setReportPropertyPage(1) }, [reportFilters])
  useEffect(() => { setReportEmailPage(1) }, [reportFilters, interactionFilters])
  useEffect(() => { setPropertyListPage(1) }, [filter])
  const view = searchParams.get('view') ?? 'overview'
  const [editorOpened, setEditorOpened] = useState(() => searchParams.get('view') === 'editor')
  const [editorPropertyId, setEditorPropertyId] = useState<string | null>(() => searchParams.get('id'))
  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return }
    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setAuthError(error.message)
      if (active) {
        const nextUser = data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null
        authUserId.current = nextUser?.id ?? null
        setUser(nextUser)
        setAuthLoading(Boolean(nextUser))
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      const nextUser = session?.user ? { id: session.user.id, email: session.user.email } : null
      const nextUserId = nextUser?.id ?? null
      if (event === 'SIGNED_OUT' || nextUserId !== authUserId.current) {
        authUserId.current = nextUserId
        setUser(nextUser)
        setAuthorized(false)
        setAuthLoading(Boolean(nextUser))
        if (nextUser) setAuthError('')
        return
      }
      if (event === 'USER_UPDATED' && nextUser) setUser(nextUser)
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!user || !supabase) { setAuthorized(false); setAuthLoading(false); return }
    let active = true
    setAuthLoading(true)
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle().then(async ({ data, error }) => {
      if (!active) return
      if (error) { setAuthError(error.message); setAuthorized(false); setAuthLoading(false); return }
      if (data?.role === 'admin') { setAuthorized(true); setAuthLoading(false); return }
      await supabase?.auth.signOut()
      setAuthError('Esta conta não possui acesso administrativo.')
      setAuthLoading(false)
    })
    return () => { active = false }
  }, [user?.id])

  async function refreshData() {
    if (!authorized) return
    setLoadingData(true); setDataError('')
    try {
      const [allProperties, allTeam] = await Promise.all([getAdminProperties(), getTeam()])
      setProperties(allProperties); setTeam(allTeam)
      const currentSettings = await getSiteSettings()
      setSettings({ company_name: currentSettings.company_name, whatsapp: currentSettings.whatsapp, contact_email: currentSettings.contact_email, instagram_url: currentSettings.instagram_url })
      if (supabase) {
        const [captorResult, brokerResult] = await Promise.all([
          supabase.from('captors').select('*').order('name'),
          supabase.from('brokers').select('*').order('name'),
        ])
        if (captorResult.error) throw captorResult.error
        if (brokerResult.error) throw brokerResult.error
        setCaptors(captorResult.data ?? [])
        setBrokers(brokerResult.data ?? [])
      }
    } catch (reason) { setDataError(reason instanceof Error ? reason.message : 'Não foi possível carregar os dados.') }
    finally { setLoadingData(false) }
  }
  useEffect(() => { void refreshData() }, [authorized])
  useEffect(() => {
    if (view !== 'reports' || !authorized) return
    let active = true
    setInteractionsLoading(true)
    setInteractionsError('')
    getPropertyInteractions(
      interactionDateBoundary(interactionFilters.from),
      interactionDateBoundary(interactionFilters.to, true),
    ).then((items) => {
      if (active) setPropertyInteractions(items)
    }).catch((reason) => {
      if (active) setInteractionsError(reason instanceof Error ? reason.message : 'Não foi possível carregar as interações.')
    }).finally(() => {
      if (active) setInteractionsLoading(false)
    })
    return () => { active = false }
  }, [authorized, interactionFilters.from, interactionFilters.to, view])

  async function login(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase) { setAuthError('Configure as variáveis do Supabase no arquivo .env.local para ativar o painel administrativo.'); return }
    setLoginLoading(true); setAuthError('')
    const email = identifier.includes('@') ? identifier : `${identifier}@rds.local`
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError('Não foi possível entrar. Verifique suas credenciais e tente novamente.')
    setLoginLoading(false)
  }
  async function logout() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setAuthError(error.message)
    if (user) clearUserPropertyEditorDrafts(user.id)
    setAuthorized(false)
  }
  function changeView(next: string, id?: string) {
    if (next === 'editor') {
      setEditorOpened(true)
      setEditorPropertyId(id ?? null)
    }
    const params = new URLSearchParams()
    params.set('view', next)
    if (id) params.set('id', id)
    setSearchParams(params)
  }
  function closeEditor() {
    setEditorOpened(false)
    changeView('properties')
  }
  function cancelEditor() {
    if (user) clearPropertyEditorDraft(user.id, editorPropertyId)
    closeEditor()
  }
  async function changeStatus(property: Property, status: PropertyStatus) {
    if (!window.confirm(`Alterar o status de ${property.code} para "${statusNames[status]}"?`)) return
    try { await updatePropertyStatus(property.id, status); await refreshData() }
    catch (reason) { setDataError(reason instanceof Error ? reason.message : 'Não foi possível atualizar o status.') }
  }
  async function removeProperty(property: Property) {
    if (!window.confirm(`Excluir ${property.code} — ${property.title}? Esta ação não pode ser desfeita.`)) return
    try { await deleteProperty(property.id); await refreshData() }
    catch (reason) { setDataError(reason instanceof Error ? reason.message : 'Não foi possível excluir o imóvel.') }
  }
  async function duplicateProperty(property: Property) {
    const copied = propertyInput(property)
    copied.code = ''
    copied.title = `${copied.title} (cópia)`
    copied.status = 'CRIADO'
    try { await saveProperty(copied, null, [], property.property_videos?.map((video) => video.url) ?? [], (property.property_links ?? []).map((link) => ({ ...link, id: '' })), [], property.property_images?.map((image) => image.url) ?? []); await refreshData() }
    catch (reason) { setDataError(reason instanceof Error ? reason.message : 'Não foi possível duplicar o imóvel.') }
  }
  async function addMember(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setMemberError(''); setMemberSuccess('')
    try {
      const payload = { name: memberName.trim(), phone: memberPhone || null, whatsapp: memberWhatsapp || null, email: memberEmail || null }
      const originalMember = memberEditingId ? team.find((member) => member.id === memberEditingId) : null
      const sourceKind = originalMember ? (originalMember.name.includes('· corretor') ? 'broker' : 'captor') : undefined
      await saveTeamMember(memberKind, payload, memberEditingId ?? undefined, memberPhoto ?? undefined, sourceKind)
      setMemberName(''); setMemberPhone(''); setMemberWhatsapp(''); setMemberEmail(''); setMemberPhoto(null); setMemberEditingId(null)
      setMemberSuccess(memberEditingId ? 'Informações do integrante atualizadas.' : 'Integrante cadastrado.')
      await refreshData()
    } catch (reason) { setMemberError(reason instanceof Error ? reason.message : 'Não foi possível cadastrar o integrante.') }
  }
  function editMember(member: Captor) {
    setMemberEditingId(member.id)
    setMemberKind(member.name.includes('· corretor') ? 'broker' : 'captor')
    setMemberName(member.name.replace(' · corretor', ''))
    setMemberPhone(member.phone ?? '')
    setMemberWhatsapp(member.whatsapp ?? '')
    setMemberEmail(member.email ?? '')
    setMemberPhoto(null)
    setSelectedMemberId(member.id)
    setMemberError('')
    setMemberSuccess('')
  }
  function cancelMemberEdit() {
    setMemberEditingId(null)
    setMemberName(''); setMemberPhone(''); setMemberWhatsapp(''); setMemberEmail(''); setMemberPhoto(null)
    setMemberError(''); setMemberSuccess('')
  }
  function chooseMemberPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const photo = event.target.files?.[0] ?? null
    if (!photo) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) {
      setMemberError('A foto deve estar no formato JPG, PNG ou WEBP.')
      event.target.value = ''
      return
    }
    if (photo.size > 12 * 1024 * 1024) {
      setMemberError('A foto deve ter no máximo 12 MB.')
      event.target.value = ''
      return
    }
    setMemberError('')
    setMemberPhoto(photo)
  }
  async function toggleMember(member: Captor) {
    const isBroker = member.name.includes('· corretor')
    try {
      await updateTeamMember(isBroker ? 'broker' : 'captor', member.id, !member.active)
      await refreshData()
    } catch (reason) { setDataError(reason instanceof Error ? reason.message : 'Não foi possível atualizar o integrante.') }
  }
  async function removeMember(member: Captor) {
    const isBroker = member.name.includes('· corretor')
    const associatedCount = properties.filter((property) => isBroker ? property.broker_id === member.id : property.captor_id === member.id).length
    const displayName = member.name.replace(' · corretor', '')
    const confirmation = associatedCount
      ? `Excluir ${displayName}? ${associatedCount} imóvel(is) associado(s) deixarão de ter este integrante atribuído. Os imóveis não serão excluídos. Esta ação não pode ser desfeita.`
      : `Excluir ${displayName}? Esta ação não pode ser desfeita.`
    if (!window.confirm(confirmation)) return
    try {
      await deleteTeamMember(isBroker ? 'broker' : 'captor', member.id)
      if (selectedMemberId === member.id) setSelectedMemberId('')
      if (memberEditingId === member.id) cancelMemberEdit()
      setMemberSuccess('Integrante excluído.')
      setMemberError('')
      await refreshData()
    } catch (reason) { setDataError(reason instanceof Error ? reason.message : 'Não foi possível excluir o integrante.') }
  }
  function selectMember(member: Captor) {
    setSelectedMemberId((current) => current === member.id ? '' : member.id)
  }
  async function submitSettings(event: React.FormEvent) {
    event.preventDefault(); setSettingsError(''); setSettingsSuccess('')
    try {
      if (settings.instagram_url) {
        const url = new URL(settings.instagram_url)
        if (!['https:', 'http:'].includes(url.protocol)) throw new Error('O Instagram precisa ser um endereço HTTP ou HTTPS válido.')
      }
      await saveSiteSettings(settings)
      setSettingsSuccess('Configurações salvas. Os canais públicos já estão atualizados.')
    } catch (reason) { setSettingsError(reason instanceof Error ? reason.message : 'Não foi possível salvar as configurações.') }
  }

  if (authLoading) return <div className="admin-loading"><Loading message="Verificando sessão" /></div>
  if (!user || !authorized) return <main className="login-page"><Link to="/" className="login-back"><ArrowLeft size={15} /> Voltar ao site</Link><div className="login-card"><Link className="brand login-brand" to="/" aria-label="RDS Imóveis, início"><span className="brand-logo-frame"><img className="brand-logo" src="/rds-logo.png" alt="" /></span></Link><span className="eyebrow gold">ESPAÇO DA EQUIPE</span><h1>Acesse sua<br /><em>área de gestão.</em></h1><p>Entre para gerenciar seus imóveis e acompanhar a carteira.</p>{!isSupabaseConfigured && <div className="admin-alert info-alert">O site público está em modo de demonstração. Configure o Supabase para habilitar o acesso administrativo e a persistência.</div>}{authError && <div className="admin-alert error-alert">{authError}</div>}<form onSubmit={login}><label className="admin-field">Usuário ou e-mail<input value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" required placeholder="admin" /></label><label className="admin-field">Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required placeholder="Sua senha" /></label><button className="button button-dark full-button" disabled={loginLoading}><KeyRound size={16} />{loginLoading ? 'Verificando...' : 'Entrar na plataforma'}</button></form><span className="login-security"><KeyRound size={13} /> Acesso protegido e reservado à equipe RDS</span></div></main>

  const filtered = properties.filter((property) => {
    const text = `${property.code} ${property.title} ${property.city} ${property.neighborhood} ${property.captor?.name ?? ''}`.toLowerCase()
    return (!filter.query || text.includes(filter.query.toLowerCase())) && (!filter.status || property.status === filter.status) && (!filter.type || property.type === filter.type) && (!filter.captor || property.captor_id === filter.captor)
  })
  const propertyListPageCount = Math.max(1, Math.ceil(filtered.length / 5))
  const currentPropertyListPage = Math.min(propertyListPage, propertyListPageCount)
  const paginatedFilteredProperties = filtered.slice((currentPropertyListPage - 1) * 5, currentPropertyListPage * 5)
  const selectedProperty = properties.find((property) => property.id === editorPropertyId) ?? null
  const selectedMember = team.find((member) => member.id === selectedMemberId) ?? null
  const statusCounts = statuses.map((status) => ({ status, count: properties.filter((property) => property.status === status).length }))
  const maxStatusCount = Math.max(1, ...statusCounts.map((item) => item.count))
  const locationCounts = Object.entries(properties.reduce<Record<string, number>>((acc, property) => { acc[property.neighborhood] = (acc[property.neighborhood] ?? 0) + 1; return acc }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const dashboardCaptors = Object.entries(properties.reduce<Record<string, number>>((acc, property) => {
    const name = property.captor?.name ?? 'Sem captador'
    acc[name] = (acc[name] ?? 0) + 1
    return acc
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const monthlyCounts = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - 5 + index)
    const year = date.getFullYear()
    const month = date.getMonth()
    return {
      label: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      count: properties.filter((property) => {
        const created = new Date(property.created_at)
        return created.getFullYear() === year && created.getMonth() === month
      }).length,
    }
  })
  const maxMonthly = Math.max(1, ...monthlyCounts.map((entry) => entry.count))
  const reportProperties = properties.filter((property) => {
    const date = property.created_at.slice(0, 10)
    return (!reportFilters.status || property.status === reportFilters.status) &&
      (!reportFilters.type || property.type === reportFilters.type) &&
    (!reportFilters.purpose || property.purpose === reportFilters.purpose || property.purpose === 'AMBOS') &&
      (!reportFilters.captor || property.captor_id === reportFilters.captor) &&
      (!reportFilters.region || property.neighborhood.toLowerCase().includes(reportFilters.region.toLowerCase())) &&
      (!reportFilters.from || date >= reportFilters.from) && (!reportFilters.to || date <= reportFilters.to)
  })
  const reportPropertyPageCount = Math.max(1, Math.ceil(reportProperties.length / 5))
  const currentReportPropertyPage = Math.min(reportPropertyPage, reportPropertyPageCount)
  const paginatedReportProperties = reportProperties.slice((currentReportPropertyPage - 1) * 5, currentReportPropertyPage * 5)
  const interactionRegionOptions = Array.from(new Map(properties.flatMap((property) => [
    [`neighborhood:${property.neighborhood.trim().toLocaleLowerCase('pt-BR')}`, `Bairro — ${property.neighborhood}, ${property.city} - ${property.state}`],
    [`city:${property.city.trim().toLocaleLowerCase('pt-BR')}`, `Cidade — ${property.city} - ${property.state}`],
    [`state:${property.state.trim().toLocaleLowerCase('pt-BR')}`, `Estado — ${property.state}`],
  ])).entries()).sort((left, right) => left[1].localeCompare(right[1], 'pt-BR'))
  const reportInteractions = propertyInteractions.filter((interaction) => {
    if (interaction.interaction_type !== 'email_sent') return false
    const matchesExistingFilters = (!reportFilters.status || interaction.property_status === reportFilters.status) &&
      (!reportFilters.type || interaction.property_type === reportFilters.type) &&
      (!reportFilters.purpose || interaction.property_purpose === reportFilters.purpose || interaction.property_purpose === 'AMBOS') &&
      (!reportFilters.captor || interaction.property_captor_id === reportFilters.captor) &&
      (!reportFilters.region || interaction.property_neighborhood.toLocaleLowerCase('pt-BR').includes(reportFilters.region.toLocaleLowerCase('pt-BR')))
    const normalizedNeighborhood = interaction.property_neighborhood.trim().toLocaleLowerCase('pt-BR')
    const normalizedCity = interaction.property_city.trim().toLocaleLowerCase('pt-BR')
    const normalizedState = interaction.property_state.trim().toLocaleLowerCase('pt-BR')
    const matchesSelectedRegions = !interactionFilters.regions.length || interactionFilters.regions.some((region) => {
      const [kind, value] = region.split(':', 2)
      return kind === 'neighborhood' ? normalizedNeighborhood === value
        : kind === 'city' ? normalizedCity === value
          : kind === 'state' ? normalizedState === value : false
    })
    return matchesExistingFilters && matchesSelectedRegions
  })
  const reportEmailPageCount = Math.max(1, Math.ceil(reportInteractions.length / 5))
  const currentReportEmailPage = Math.min(reportEmailPage, reportEmailPageCount)
  const paginatedReportInteractions = reportInteractions.slice((currentReportEmailPage - 1) * 5, currentReportEmailPage * 5)
  const captorCounts = Object.entries(reportProperties.reduce<Record<string, number>>((acc, property) => {
    const name = property.captor?.name ?? 'Sem captador'
    acc[name] = (acc[name] ?? 0) + 1
    return acc
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const reportMax = Math.max(1, ...captorCounts.map(([, count]) => count))
  return <div className="admin-shell">
    <aside className="admin-sidebar"><Link className="brand admin-brand" to="/" aria-label="RDS Imóveis, início"><span className="brand-logo-frame"><img className="brand-logo" src="/rds-logo.png" alt="" /></span></Link><span className="sidebar-label">GESTÃO</span><nav className="side-nav">
      <button className={view === 'overview' ? 'side-link active' : 'side-link'} onClick={() => changeView('overview')}><LayoutDashboard size={17} /> Visão geral</button>
      <button className={view === 'properties' ? 'side-link active' : 'side-link'} onClick={() => changeView('properties')}><Home size={17} /> Todos os imóveis<span className="side-count">{properties.length}</span></button>
      <button className={view === 'editor' ? 'side-link active' : 'side-link'} onClick={() => changeView('editor')}><Plus size={17} /> Cadastrar imóvel</button>
      <button className={view === 'team' ? 'side-link active' : 'side-link'} onClick={() => changeView('team')}><Users size={17} /> Captadores e corretores</button>
      <button className={view === 'reports' ? 'side-link active' : 'side-link'} onClick={() => changeView('reports')}><Filter size={17} /> Relatórios</button>
      <button className={view === 'settings' ? 'side-link active' : 'side-link'} onClick={() => changeView('settings')}><SlidersHorizontal size={17} /> Configurações</button>
    </nav><div className="sidebar-bottom"><span className="admin-user"><span className="user-avatar">R</span><span><strong>{user.email?.split('@')[0] ?? 'Administrador'}</strong><small>Administrador</small></span></span><button className="side-link logout-link" onClick={() => void logout()}><LogOut size={17} /> Sair</button><Link to="/" className="view-site-link">← Voltar ao site</Link></div></aside>
    <main className="admin-main">
      <header className="admin-topbar"><div className="admin-topcrumb">RDS Imóveis <span>/</span> <strong>{view === 'overview' ? 'Visão geral' : view === 'properties' ? 'Imóveis' : view === 'editor' ? (selectedProperty ? 'Editar imóvel' : 'Novo imóvel') : view === 'team' ? 'Equipe' : view === 'reports' ? 'Relatórios' : 'Configurações'}</strong></div><button type="button" className="view-public-link logout-topbar-button" onClick={() => void logout()}><LogOut size={15} /><span>Sair</span></button></header>
      <div className="admin-content">
        {dataError && <div className="admin-alert error-alert">{dataError}<button onClick={() => setDataError('')} aria-label="Fechar"><X size={15} /></button></div>}
        {loadingData && <div className="admin-loading-inline"><span className="spinner" />Atualizando dados...</div>}
        {view === 'reports' && <section className="interaction-report-section">
          <div className="admin-page-heading"><div><span className="eyebrow gold">E-MAILS ENVIADOS</span><h2>Interessados por imóvel</h2><p>Mostra cada e-mail aceito pelo serviço de envio, sem agrupar contatos repetidos.</p></div></div>
          <div className="admin-panel report-filter-panel interaction-filter-panel">
            <div className="admin-filters">
              <div className="interaction-region-picker">
                <span>Região (bairros, cidades e estados)</span>
                <details>
                  <summary>{interactionFilterDraft.regions.length ? `${interactionFilterDraft.regions.length} região(ões) selecionada(s)` : 'Todas as regiões'}</summary>
                  <div className="interaction-region-options">
                    {interactionRegionOptions.length ? interactionRegionOptions.map(([value, label]) => <label key={value}>
                      <input type="checkbox" checked={interactionFilterDraft.regions.includes(value)} onChange={(event) => setInteractionFilterDraft((current) => ({
                        ...current,
                        regions: event.target.checked ? [...current.regions, value] : current.regions.filter((region) => region !== value),
                      }))} />
                      <span>{label}</span>
                    </label>) : <span className="interaction-region-empty">Nenhuma região cadastrada.</span>}
                  </div>
                </details>
              </div>
              <label className="report-date">Interação desde<input type="date" value={interactionFilterDraft.from} onChange={(event) => setInteractionFilterDraft((current) => ({ ...current, from: event.target.value }))} /></label>
              <label className="report-date">Interação até<input type="date" value={interactionFilterDraft.to} onChange={(event) => setInteractionFilterDraft((current) => ({ ...current, to: event.target.value }))} /></label>
              <button type="button" className="button button-dark interaction-apply-button" disabled={interactionsLoading || Boolean(interactionFilterDraft.from && interactionFilterDraft.to && interactionFilterDraft.from > interactionFilterDraft.to)} onClick={() => setInteractionFilters(interactionFilterDraft)}><Filter size={15} /> Filtrar</button>
              <button type="button" className="clear-button" onClick={() => {
                const clearedFilters = { regions: [], from: '', to: '' }
                setInteractionFilterDraft(clearedFilters)
                setInteractionFilters(clearedFilters)
              }}>Limpar</button>
            </div>
            {interactionFilterDraft.from && interactionFilterDraft.to && interactionFilterDraft.from > interactionFilterDraft.to && <p className="interaction-filter-error" role="alert">A data inicial deve ser anterior ou igual à data final.</p>}
            <p className="interaction-filter-note">Marque uma ou mais regiões no menu. Região e período só serão aplicados ao clicar em Filtrar. Os demais filtros de imóvel do relatório continuam funcionando; as datas desta busca usam o momento do envio do e-mail, não a data de cadastro do imóvel.</p>
          </div>
          {interactionsError && <div className="admin-alert error-alert" role="alert">{interactionsError}</div>}
          {interactionsLoading && <div className="admin-loading-inline"><span className="spinner" />Carregando interações...</div>}
          <div className="admin-panel listing-panel interaction-listing">
            <div className="panel-heading"><div><h2>{reportInteractions.length} e-mails encontrados</h2><p>Cada linha corresponde a um e-mail aceito pelo serviço de envio; isso não confirma a entrega na caixa postal.</p></div><button type="button" className="button button-outline" disabled={!reportInteractions.length} onClick={() => {
              const rows: Array<Array<string | number>> = [
                ['Nome', 'E-mail', 'Telefone', 'Imóvel', 'Região', 'Data e horário', 'Status do atendimento'],
                ...reportInteractions.map((interaction) => [
                  interaction.interested_name,
                  interaction.interested_email,
                  interaction.interested_phone,
                  `${interaction.property_code} - ${interaction.property_title}`,
                  `${interaction.property_neighborhood}, ${interaction.property_city} - ${interaction.property_state}`,
                  new Date(interaction.occurred_at).toLocaleString('pt-BR'),
                  interaction.status ?? '',
                ]),
              ]
              downloadCsv('relatorio-emails-enviados.csv', rows)
            }}><ArrowDown size={15} /> Exportar CSV</button></div>
            <div className="table-scroll interaction-table-scroll"><table className="property-table interaction-table"><thead><tr><th>Interessado</th><th>E-mail</th><th>Telefone</th><th>Imóvel</th><th>Região</th><th>Data e horário</th><th>Status do atendimento</th></tr></thead><tbody>
              {paginatedReportInteractions.map((interaction) => <tr key={interaction.id}><td>{interaction.interested_name}</td><td>{interaction.interested_email}</td><td>{interaction.interested_phone}</td><td><strong>{interaction.property_code}</strong><small>{interaction.property_title}</small></td><td>{interaction.property_neighborhood}<small>{interaction.property_city} - {interaction.property_state}</small></td><td>{new Date(interaction.occurred_at).toLocaleString('pt-BR')}</td><td>{interaction.status ?? '—'}</td></tr>)}
              {!reportInteractions.length && !interactionsLoading && <tr><td colSpan={7}><div className="table-empty">{interactionsError ? 'Não foi possível carregar os e-mails.' : 'Nenhum e-mail enviado corresponde aos filtros. Se esperava resultados, confirme se a migration foi aplicada e a função atualizada foi publicada; envios anteriores não são recuperados.'}</div></td></tr>}
            </tbody></table></div>
            <div className="report-pagination">
              <span>{reportInteractions.length ? `Exibindo ${(currentReportEmailPage - 1) * 5 + 1}–${Math.min(currentReportEmailPage * 5, reportInteractions.length)} de ${reportInteractions.length} e-mails` : 'Nenhum e-mail para exibir'}</span>
              <div><button type="button" className="button button-outline" aria-label="Página anterior de e-mails" disabled={currentReportEmailPage <= 1} onClick={() => setReportEmailPage((page) => Math.max(1, page - 1))}><ChevronLeft size={15} /> Anterior</button><span>Página {currentReportEmailPage} de {reportEmailPageCount}</span><button type="button" className="button button-outline" aria-label="Próxima página de e-mails" disabled={currentReportEmailPage >= reportEmailPageCount} onClick={() => setReportEmailPage((page) => Math.min(reportEmailPageCount, page + 1))}>Próxima <ChevronRight size={15} /></button></div>
            </div>
          </div>
        </section>}
        {view === 'overview' && <section className="dashboard-view"><div className="admin-page-heading"><div><span className="eyebrow gold">PAINEL ADMINISTRATIVO</span><h1>Bom dia, equipe.</h1><p>Acompanhe sua carteira e os anúncios ativos.</p></div><button className="button button-dark" onClick={() => changeView('editor')}><Plus size={16} /> Cadastrar imóvel</button></div>
          <div className="metric-grid"><Metric label="Total de imóveis" value={properties.length} icon={<Building2 />} /><Metric label="Publicados" value={properties.filter((item) => item.status === 'PUBLICADO').length} icon={<Check />} tone="green" /><Metric label="Criados" value={properties.filter((item) => item.status === 'CRIADO').length} icon={<Plus />} /><Metric label="Pausados" value={properties.filter((item) => item.status === 'PAUSADO').length} icon={<DoorOpen />} /></div>
          <div className="metric-grid secondary-metrics"><Metric label="Stand by" value={properties.filter((item) => item.status === 'STAND_BY').length} /><Metric label="Vendidos" value={properties.filter((item) => item.status === 'VENDIDO').length} /><Metric label="Alugados" value={properties.filter((item) => item.status === 'ALUGADO').length} /><Metric label="Cancelados" value={properties.filter((item) => item.status === 'CANCELADO').length} /></div>
          <div className="dashboard-charts"><section className="admin-panel"><div className="panel-heading"><div><h2>Imóveis por status</h2><p>Distribuição da carteira cadastrada</p></div></div><div className="status-chart">{statusCounts.map(({ status, count }) => <div className="status-bar-row" key={status}><span>{statusNames[status]}</span><div className="bar-track"><div className={`bar-fill status-${status.toLowerCase()}`} style={{ width: `${count / maxStatusCount * 100}%` }} /></div><strong>{count}</strong></div>)}</div></section><section className="admin-panel"><div className="panel-heading"><div><h2>Imóveis por região</h2><p>As regiões com mais anúncios</p></div></div>{locationCounts.length ? <div className="location-chart">{locationCounts.map(([name, count], index) => <div className="location-row" key={name}><span className="location-rank">0{index + 1}</span><span>{name}</span><strong>{count}</strong></div>)}</div> : <p className="muted-empty">Cadastre imóveis para ver a distribuição.</p>}</section></div>
          <div className="dashboard-charts"><section className="admin-panel"><div className="panel-heading"><div><h2>Imóveis por captador</h2><p>Carteira por responsável pela captação</p></div></div><div className="location-chart">{dashboardCaptors.map(([name, count], index) => <div className="location-row" key={name}><span className="location-rank">0{index + 1}</span><span>{name}</span><strong>{count}</strong></div>)}{!dashboardCaptors.length && <p className="muted-empty">Cadastre imóveis para ver os dados.</p>}</div></section><section className="admin-panel"><div className="panel-heading"><div><h2>Evolução de cadastros</h2><p>Novos imóveis nos últimos seis meses</p></div></div><div className="monthly-chart">{monthlyCounts.map((entry) => <div className="month-bar" key={entry.label}><strong>{entry.count}</strong><div><span style={{ height: `${Math.max(4, entry.count / maxMonthly * 100)}%` }} /></div><small>{entry.label}</small></div>)}</div></section></div>
          <div className="admin-panel recent-panel"><div className="panel-heading"><div><h2>Atualizações recentes</h2><p>Seus últimos imóveis cadastrados</p></div><button className="text-link" onClick={() => changeView('properties')}>Ver todos <ArrowRight size={15} /></button></div><PropertyTable properties={properties.slice(0, 5)} onEdit={(item) => changeView('editor', item.id)} onDelete={(item) => void removeProperty(item)} onStatus={(item, status) => void changeStatus(item, status)} onDuplicate={(item) => void duplicateProperty(item)} /></div>
        </section>}
        {view === 'properties' && <section><div className="admin-page-heading"><div><span className="eyebrow gold">CARTEIRA IMOBILIÁRIA</span><h1>Todos os imóveis</h1><p>Gerencie, atualize e acompanhe seus anúncios.</p></div><button className="button button-dark" onClick={() => changeView('editor')}><Plus size={16} /> Cadastrar imóvel</button></div><div className="admin-panel listing-panel"><div className="admin-filters"><label className="admin-search"><Search size={16} /><input value={filter.query} onChange={(event) => setFilter((current) => ({ ...current, query: event.target.value }))} placeholder="Buscar por código, título, local ou captador" /></label><select value={filter.status} onChange={(event) => setFilter((current) => ({ ...current, status: event.target.value }))}><option value="">Todos os status</option>{statuses.map((status) => <option key={status} value={status}>{statusNames[status]}</option>)}</select><select value={filter.type} onChange={(event) => setFilter((current) => ({ ...current, type: event.target.value }))}><option value="">Todos os tipos</option>{propertyTypes.map((type) => <option key={type}>{type}</option>)}</select><select value={filter.captor} onChange={(event) => setFilter((current) => ({ ...current, captor: event.target.value }))}><option value="">Todos os captadores</option>{captors.map((captor) => <option key={captor.id} value={captor.id}>{captor.name}</option>)}</select></div><div className="listing-count">{filtered.length} imóveis encontrados</div><PropertyTable properties={paginatedFilteredProperties} onEdit={(item) => changeView('editor', item.id)} onDelete={(item) => void removeProperty(item)} onStatus={(item, status) => void changeStatus(item, status)} onDuplicate={(item) => void duplicateProperty(item)} /><div className="report-pagination"><span>{filtered.length ? `Exibindo ${(currentPropertyListPage - 1) * 5 + 1}–${Math.min(currentPropertyListPage * 5, filtered.length)} de ${filtered.length} imóveis` : 'Nenhum imóvel para exibir'}</span><div><button type="button" className="button button-outline" aria-label="Página anterior de imóveis" disabled={currentPropertyListPage <= 1} onClick={() => setPropertyListPage((page) => Math.max(1, page - 1))}><ChevronLeft size={15} /> Anterior</button><span>Página {currentPropertyListPage} de {propertyListPageCount}</span><button type="button" className="button button-outline" aria-label="Próxima página de imóveis" disabled={currentPropertyListPage >= propertyListPageCount} onClick={() => setPropertyListPage((page) => Math.min(propertyListPageCount, page + 1))}>Próxima <ChevronRight size={15} /></button></div></div></div></section>}
        {editorOpened && (!editorPropertyId || selectedProperty) && <div hidden={view !== 'editor'}><PropertyEditor key={`${user.id}:${editorPropertyId ?? 'new-property'}`} userId={user.id} property={selectedProperty} captors={captors} brokers={brokers} onCancel={cancelEditor} onSaved={() => { void refreshData(); closeEditor() }} /></div>}
        {view === 'team' && <section>
          <div className="admin-page-heading"><div><span className="eyebrow gold">TIME RDS</span><h1>Captadores e corretores</h1><p>Gerencie os integrantes responsáveis por captar e atender os imóveis.</p></div></div>
          <div className="team-columns">
            <section className="admin-panel">
              <div className="panel-heading"><div><h2>Integrantes cadastrados</h2><p>{team.length} pessoas no time</p></div></div>
              <div className="team-list">
                {team.map((member) => {
                  const broker = member.name.includes('· corretor')
                  const baseName = member.name.replace(' · corretor', '')
                  const associated = properties.filter((property) => broker ? property.broker_id === member.id : property.captor_id === member.id)
                  return <div key={member.id} className={`team-row ${selectedMemberId === member.id ? 'selected' : ''}`}>
                    <button className="team-select" onClick={() => selectMember(member)}>
                      <span className="agent-avatar">{member.photo_url ? <img src={member.photo_url} alt="" /> : <CircleUserRound size={23} />}</span>
                      <span className="team-name"><strong>{baseName}</strong><span>{broker ? 'Corretor de atendimento' : 'Captador'} · {member.active ? 'Ativo' : 'Inativo'}</span></span>
                      <span className="team-count">{associated.length} imóveis</span>
                    </button>
                    <div className="team-actions">
                      <button className="member-status" onClick={() => void toggleMember(member)}>{member.active ? 'Desativar' : 'Ativar'}</button>
                      <button className="icon-button" onClick={() => editMember(member)} aria-label={`Editar ${baseName}`} title="Editar integrante"><Pencil size={15} /></button>
                      <button className="icon-button danger" onClick={() => void removeMember(member)} aria-label={`Excluir ${baseName}`} title="Excluir integrante"><Trash2 size={15} /></button>
                    </div>
                  </div>
                })}
                {!team.length && <p className="muted-empty">Nenhum integrante cadastrado.</p>}
              </div>
              {selectedMember && <div className="member-profile">
                <span className="eyebrow gold">PERFIL DO INTEGRANTE</span>
                <div className="member-profile-heading"><span className="agent-avatar">{selectedMember.photo_url ? <img src={selectedMember.photo_url} alt="" /> : <CircleUserRound size={23} />}</span><h3>{selectedMember.name.replace(' · corretor', '')}</h3></div>
                <div className="member-stats">{statuses.map((status) => <span key={status}>{statusNames[status]} <strong>{properties.filter((property) => (selectedMember.name.includes('· corretor') ? property.broker_id : property.captor_id) === selectedMember.id && property.status === status).length}</strong></span>)}</div>
                <div className="member-property-list">{properties.filter((property) => (selectedMember.name.includes('· corretor') ? property.broker_id : property.captor_id) === selectedMember.id).map((property) => <button key={property.id} onClick={() => changeView('editor', property.id)}>{property.code} · {property.title}<span>{statusNames[property.status]}</span></button>)}</div>
              </div>}
            </section>
            <section className="admin-panel add-member-panel">
              <div className="panel-heading"><div><h2>{memberEditingId ? 'Editar integrante' : 'Adicionar integrante'}</h2><p>{memberEditingId ? 'Atualize os dados do integrante selecionado.' : 'Cadastre captadores ou corretores de atendimento.'}</p></div></div>
              {memberError && <div className="admin-alert error-alert">{memberError}</div>}
              {memberSuccess && <div className="admin-alert success-alert">{memberSuccess}</div>}
              <form className="member-form" onSubmit={(event) => void addMember(event)}>
                <label className="admin-field">Função<select value={memberKind} onChange={(event) => setMemberKind(event.target.value as 'captor' | 'broker')}><option value="captor">Captador</option><option value="broker">Corretor de atendimento</option></select></label>
                <label className="admin-field">Nome<input required value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Nome completo" /></label>
                <label className="admin-field">Telefone<input value={memberPhone} onChange={(event) => setMemberPhone(event.target.value)} placeholder="(61) 99999-9999" /></label>
                <label className="admin-field">WhatsApp<input value={memberWhatsapp} onChange={(event) => setMemberWhatsapp(event.target.value)} placeholder="(61) 99999-9999" /></label>
                <label className="admin-field">E-mail<input type="email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} placeholder="nome@rdsimoveis.com.br" /></label>
                <label className="member-photo-upload"><span className="agent-avatar">{memberPhotoPreview ? <img src={memberPhotoPreview} alt="Prévia da foto selecionada" /> : memberEditingId && team.find((member) => member.id === memberEditingId)?.photo_url ? <img src={team.find((member) => member.id === memberEditingId)?.photo_url ?? ''} alt="Foto atual do integrante" /> : <CircleUserRound size={23} />}</span><span><strong>{memberPhoto ? memberPhoto.name : memberEditingId ? 'Manter ou trocar foto' : 'Adicionar foto'}</strong><small>JPG, PNG ou WEBP · até 12 MB</small></span><input key={memberPhoto ? 'photo-selected' : 'photo-empty'} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseMemberPhoto} /></label>
                <div className="member-form-actions"><button className="button button-dark">{memberEditingId ? <Check size={16} /> : <Plus size={16} />}{memberEditingId ? 'Salvar alterações' : 'Adicionar ao time'}</button>{memberEditingId && <button type="button" className="button button-outline" onClick={cancelMemberEdit}>Cancelar edição</button>}</div>
              </form>
            </section>
          </div>
        </section>}
        {view === 'reports' && <section className="portfolio-report-section"><div className="admin-page-heading"><div><span className="eyebrow gold">ANÁLISE DA CARTEIRA</span><h1>Relatórios</h1><p>Explore seus imóveis por período, status, tipo, finalidade e captador.</p></div></div><div className="admin-panel report-filter-panel"><div className="admin-filters"><select value={reportFilters.captor} onChange={(event) => setReportFilters((current) => ({ ...current, captor: event.target.value }))}><option value="">Todos os captadores</option>{captors.map((captor) => <option key={captor.id} value={captor.id}>{captor.name}</option>)}</select><select value={reportFilters.status} onChange={(event) => setReportFilters((current) => ({ ...current, status: event.target.value }))}><option value="">Todos os status</option>{statuses.map((status) => <option key={status} value={status}>{statusNames[status]}</option>)}</select><select value={reportFilters.type} onChange={(event) => setReportFilters((current) => ({ ...current, type: event.target.value }))}><option value="">Todos os tipos</option>{propertyTypes.map((type) => <option key={type}>{type}</option>)}</select><select value={reportFilters.purpose} onChange={(event) => setReportFilters((current) => ({ ...current, purpose: event.target.value }))}><option value="">Todas as finalidades</option><option value="VENDA">Venda</option><option value="ALUGUEL">Aluguel</option><option value="AMBOS">Ambos</option></select><input aria-label="Região" placeholder="Região" value={reportFilters.region} onChange={(event) => setReportFilters((current) => ({ ...current, region: event.target.value }))} /><label className="report-date">De<input type="date" value={reportFilters.from} onChange={(event) => setReportFilters((current) => ({ ...current, from: event.target.value }))} /></label><label className="report-date">Até<input type="date" value={reportFilters.to} onChange={(event) => setReportFilters((current) => ({ ...current, to: event.target.value }))} /></label><button className="clear-button" onClick={() => setReportFilters({ status: '', type: '', purpose: '', captor: '', region: '', from: '', to: '' })}>Limpar</button></div></div><div className="metric-grid report-metrics"><Metric label="Imóveis no recorte" value={reportProperties.length} icon={<Building2 />} /><Metric label="Publicados" value={reportProperties.filter((item) => item.status === 'PUBLICADO').length} icon={<Check />} tone="green" /><Metric label="Valor médio de venda" value={currency(Math.round(reportProperties.reduce((sum, item) => sum + (item.sale_price ?? 0), 0) / Math.max(1, reportProperties.filter((item) => item.sale_price != null).length)))} icon={<Square />} /><Metric label="Área média (m²)" value={Math.round(reportProperties.reduce((sum, item) => sum + (item.total_area ?? 0), 0) / Math.max(1, reportProperties.filter((item) => item.total_area != null).length))} icon={<Home />} /></div><div className="dashboard-charts"><section className="admin-panel"><div className="panel-heading"><div><h2>Imóveis por captador</h2><p>Distribuição no período e filtros selecionados</p></div></div><div className="status-chart">{captorCounts.map(([name, count]) => <div className="status-bar-row" key={name}><span>{name}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${count / reportMax * 100}%` }} /></div><strong>{count}</strong></div>)}{!captorCounts.length && <p className="muted-empty">Nenhum imóvel corresponde aos filtros.</p>}</div></section><section className="admin-panel"><div className="panel-heading"><div><h2>Resultados filtrados</h2><p>{reportProperties.length} imóveis encontrados</p></div></div><PropertyTable properties={paginatedReportProperties} onEdit={(item) => changeView('editor', item.id)} onDelete={(item) => void removeProperty(item)} onStatus={(item, status) => void changeStatus(item, status)} onDuplicate={(item) => void duplicateProperty(item)} /><div className="report-pagination"><span>{reportProperties.length ? `Exibindo ${(currentReportPropertyPage - 1) * 5 + 1}–${Math.min(currentReportPropertyPage * 5, reportProperties.length)} de ${reportProperties.length} imóveis` : 'Nenhum imóvel para exibir'}</span><div><button type="button" className="button button-outline" aria-label="Página anterior" disabled={currentReportPropertyPage <= 1} onClick={() => setReportPropertyPage((page) => Math.max(1, page - 1))}><ChevronLeft size={15} /> Anterior</button><span>Página {currentReportPropertyPage} de {reportPropertyPageCount}</span><button type="button" className="button button-outline" aria-label="Próxima página" disabled={currentReportPropertyPage >= reportPropertyPageCount} onClick={() => setReportPropertyPage((page) => Math.min(reportPropertyPageCount, page + 1))}>Próxima <ChevronRight size={15} /></button></div></div></section></div></section>}
        {view === 'settings' && <section><div className="admin-page-heading"><div><span className="eyebrow gold">PRESENÇA DA IMOBILIÁRIA</span><h1>Configurações</h1><p>Essas informações aparecem nos contatos da área pública.</p></div></div><form className="admin-panel settings-form" onSubmit={(event) => void submitSettings(event)}><div className="panel-heading"><div><h2>Informações de contato</h2><p>Use canais oficiais da imobiliária para receber as solicitações.</p></div></div><div className="settings-fields"><label className="admin-field">Nome da imobiliária<input required value={settings.company_name} onChange={(event) => setSettings((current) => ({ ...current, company_name: event.target.value }))} /></label><label className="admin-field">WhatsApp<input value={settings.whatsapp} onChange={(event) => setSettings((current) => ({ ...current, whatsapp: event.target.value }))} placeholder="5561999999999" /></label><label className="admin-field">E-mail de contato<input type="email" value={settings.contact_email} onChange={(event) => setSettings((current) => ({ ...current, contact_email: event.target.value }))} placeholder="contato@empresa.com.br" /></label><label className="admin-field">Instagram (URL)<input type="url" value={settings.instagram_url} onChange={(event) => setSettings((current) => ({ ...current, instagram_url: event.target.value }))} placeholder="https://instagram.com/..." /></label></div>{settingsError && <div className="admin-alert error-alert">{settingsError}</div>}{settingsSuccess && <div className="admin-alert success-alert">{settingsSuccess}</div>}<div className="settings-submit"><button className="button button-dark">Salvar configurações</button></div></form></section>}
      </div>
    </main>
  </div>
}

function Metric({ label, value, icon, tone = '' }: { label: string; value: number | string; icon?: React.ReactNode; tone?: string }) {
  return <div className={`metric-card ${tone}`}><div className="metric-head"><span>{label}</span>{icon && <span className="metric-icon">{icon}</span>}</div><strong>{value}</strong><span className="metric-caption">em toda a carteira</span></div>
}

function PropertyTable({ properties, onEdit, onDelete, onStatus, onDuplicate }: {
  properties: Property[]
  onEdit: (property: Property) => void
  onDelete: (property: Property) => void
  onStatus: (property: Property, status: PropertyStatus) => void
  onDuplicate: (property: Property) => void
}) {
  return <div className="table-scroll"><table className="property-table"><thead><tr><th>Imóvel</th><th>Região</th><th>Valor</th><th>Captador</th><th>Cadastro</th><th>Status</th><th aria-label="Ações" /></tr></thead><tbody>
    {properties.map((property) => <tr key={property.id}><td><div className="table-property"><Photo property={property} /><div><strong>{property.title}</strong><span>{property.code} · {property.type}</span></div></div></td><td>{property.neighborhood}<small>{property.city}</small></td><td>{currency(property.sale_price ?? property.rent_price)}</td><td>{property.captor?.name ?? '—'}</td><td>{new Date(property.created_at).toLocaleDateString('pt-BR')}</td><td><select className={`status-select status-${property.status.toLowerCase()}`} value={property.status} onChange={(event) => onStatus(property, event.target.value as PropertyStatus)} aria-label={`Status de ${property.code}`}>{statuses.map((status) => <option key={status} value={status}>{statusNames[status]}</option>)}</select></td><td><div className="table-actions"><button className="icon-button" onClick={() => onEdit(property)} aria-label="Editar"><ArrowUpRight size={16} /></button><button className="icon-button" onClick={() => onDuplicate(property)} aria-label="Duplicar"><Plus size={16} /></button><button className="icon-button danger" onClick={() => onDelete(property)} aria-label="Excluir"><Trash2 size={16} /></button></div></td></tr>)}
    {!properties.length && <tr><td colSpan={7}><div className="table-empty">Nenhum imóvel encontrado.</div></td></tr>}
  </tbody></table></div>
}

export default function App() {
  const { pathname } = useLocation()
  const isPublicPage = !pathname.startsWith('/admin')
  return <><ScrollManager /><Routes><Route path="/" element={<HomePage />} /><Route path="/imoveis" element={<ResultsPage />} /><Route path="/imoveis/:id" element={<DetailPage />} /><Route path="/admin/*" element={<AdminPage />} /><Route path="*" element={<HomePage />} /></Routes>{isPublicPage && <SocialLinks className="social-floating-links" />}</>
}
