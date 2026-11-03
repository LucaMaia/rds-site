import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Bath, BedDouble, Building2, Check,
  ChevronDown, ChevronLeft, ChevronRight, CircleUserRound, DoorOpen, Filter, Home, Instagram,
  KeyRound, LayoutDashboard, LogOut, MapPin, Menu, Plus, Search, SlidersHorizontal, Youtube,
  Square, Trash2, Upload, Users, X,
} from 'lucide-react'
import { deleteProperty, getAdminProperties, getPublicProperties, getSiteSettings, getTeam, isSupabaseConfigured, saveProperty, saveSiteSettings, saveTeamMember, updatePropertyStatus, updateTeamMember } from './lib/data'
import { currency, numberValue, whatsappContactUrl, whatsappUrl, youtubeEmbed } from './lib/format'
import { supabase } from './lib/supabase'
import type { Captor, Property, PropertyImage, PropertyInput, PropertyLink, PropertyStatus } from './types'

const regions = ['Guará', 'Guará II', 'Águas Claras', 'Asa Sul', 'Asa Norte', 'Sudoeste', 'Noroeste', 'Lago Sul', 'Lago Norte', 'Taguatinga', 'Ceilândia', 'Samambaia', 'Vicente Pires', 'Park Sul', 'Jardim Botânico']
const propertyTypes = ['Apartamento', 'Casa', 'Cobertura', 'Terreno', 'Comercial', 'Chácara']
const statuses: PropertyStatus[] = ['CRIADO', 'PUBLICADO', 'PAUSADO', 'STAND_BY', 'VENDIDO', 'ALUGADO', 'CANCELADO']
const statusNames: Record<PropertyStatus, string> = {
  CRIADO: 'Criado', PUBLICADO: 'Publicado', PAUSADO: 'Pausado', STAND_BY: 'Stand by',
  VENDIDO: 'Vendido', ALUGADO: 'Alugado', CANCELADO: 'Cancelado',
}
const imageFallback = 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85'
const instagramUrl = 'https://www.instagram.com/rds.imoveis/'
const youtubeUrl = 'https://www.youtube.com/@RDSIMOVEISimoveis'

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
  const [settings, setSettings] = useState({ company_name: 'RDS Imóveis', whatsapp: '', contact_email: '', instagram_url: '' })
  const [settingsError, setSettingsError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    getPublicProperties().then(setProperties).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false))
    getSiteSettings().then(setSettings).catch((reason: Error) => setSettingsError(reason.message))
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
      <section className="contact-banner"><span className="eyebrow">ESTAMOS AQUI PARA AJUDAR</span><h2>O próximo passo é seu.</h2><p>{settingsError ? 'Nossos canais de contato estão temporariamente indisponíveis.' : 'Conte para a gente o que procura. Vamos encontrar juntos.'}</p>{settings.whatsapp && <a className="button button-light" href={whatsappContactUrl(settings.whatsapp)} target="_blank" rel="noreferrer">Fale com um especialista <ArrowUpRight size={16} /></a>}{!settings.whatsapp && settings.contact_email && <a className="button button-light" href={`mailto:${settings.contact_email}`}>Fale com um especialista <ArrowUpRight size={16} /></a>}</section>
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
  const [filters, setFilters] = useState({ type: searchParams.get('tipo') ?? '', state: '', city: '', neighborhood: '', min: '', max: '', areaMin: '', areaMax: '', beds: '', suites: '', baths: '', parking: '', feature: '' })
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
        (!filters.suites || property.suites >= Number(filters.suites)) &&
        (!filters.baths || property.bathrooms >= Number(filters.baths)) &&
        (!filters.parking || property.parking_spaces >= Number(filters.parking)) &&
        (!filters.feature || property.features.includes(filters.feature))
    }).sort((a, b) => {
      if (sort === 'menor-preco') return (a.sale_price ?? a.rent_price ?? 0) - (b.sale_price ?? b.rent_price ?? 0)
      if (sort === 'maior-preco') return (b.sale_price ?? b.rent_price ?? 0) - (a.sale_price ?? a.rent_price ?? 0)
      if (sort === 'maior-area') return (b.total_area ?? 0) - (a.total_area ?? 0)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [properties, query, purpose, filters, sort])
  function setFilter(key: keyof typeof filters, value: string) { setFilters((current) => ({ ...current, [key]: value })) }
  function clearFilters() {
    setFilters({ type: '', state: '', city: '', neighborhood: '', min: '', max: '', areaMin: '', areaMax: '', beds: '', suites: '', baths: '', parking: '', feature: '' })
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
        <div className="two-fields">{([['beds', 'Quartos'], ['suites', 'Suítes'], ['baths', 'Banheiros'], ['parking', 'Vagas']] as const).map(([key, title]) => <label key={key} className="field-label">{title}<select value={filters[key]} onChange={(event) => setFilter(key, event.target.value)}><option value="">Qualquer</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}</select></label>)}</div>
        <label className="field-label">Diferencial<select value={filters.feature} onChange={(event) => setFilter('feature', event.target.value)}><option value="">Qualquer</option>{[...new Set(properties.flatMap((property) => property.features))].sort().map((feature) => <option key={feature}>{feature}</option>)}</select></label>
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
  useEffect(() => {
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
  const contactPhone = property.broker?.whatsapp ?? property.broker?.phone ?? property.captor?.whatsapp ?? property.captor?.phone ?? settings.whatsapp
  function shiftPhoto(direction: number) { setPhoto((current) => (current + direction + images.length) % images.length) }
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
          ['Área privativa', property.private_area ? `${property.private_area} m²` : '—'], ['Quartos', String(property.bedrooms)], ['Suítes', String(property.suites)],
          ['Banheiros', String(property.bathrooms)], ['Vagas', String(property.parking_spaces)], ['Condomínio', currency(property.condo_fee)],
          ['IPTU', property.property_tax ? `${currency(property.property_tax)} ${property.tax_frequency === 'ANUAL' ? '/ ano' : '/ mês'}` : '—'],
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></div>
        {!!property.features.length && <div className="detail-section"><h2>O que este imóvel oferece</h2><div className="feature-tags">{property.features.map((feature) => <span key={feature}><Check size={14} />{feature}</span>)}</div></div>}
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
        {settings.contact_email && <a className="contact-email" href={`mailto:${settings.contact_email}?subject=${encodeURIComponent(`Interesse no imóvel ${property.code}`)}`}>Enviar um e-mail</a>}
        <span className="property-code-note">Código do imóvel: {property.code}</span>
      </aside>
    </div>
    {lightbox && <div className="lightbox" role="dialog" aria-modal="true" aria-label="Galeria de fotos"><button className="lightbox-close" onClick={() => setLightbox(false)} aria-label="Fechar"><X /></button><button className="lightbox-arrow prev" onClick={() => shiftPhoto(-1)} aria-label="Foto anterior"><ChevronLeft /></button><img src={images[photo].url} alt={property.title} /><button className="lightbox-arrow next" onClick={() => shiftPhoto(1)} aria-label="Próxima foto"><ChevronRight /></button><span>{photo + 1} / {images.length}</span></div>}
  </main><Footer /></>
}

const blankInput: PropertyInput = {
  code: '', title: '', type: 'Apartamento', purpose: 'VENDA', status: 'CRIADO', captor_id: null, broker_id: null,
  zip_code: null, state: 'Distrito Federal', city: 'Brasília', neighborhood: '', address: null, number: null, complement: null,
  sale_price: null, rent_price: null, condo_fee: null, property_tax: null, tax_frequency: null,
  total_area: null, private_area: null, bedrooms: 0, suites: 0, bathrooms: 0, parking_spaces: 0,
  floor: null, construction_year: null, furnished: false, financing: false, trade: false, features: [], description: '', featured: false,
}

function propertyInput(property: Property | null): PropertyInput {
  if (!property) return { ...blankInput }
  const { id: _id, created_at: _created, updated_at: _updated, captor: _captor, broker: _broker, property_images: _images, property_videos: _videos, property_links: _links, status_history: _history, ...input } = property
  void _id; void _created; void _updated; void _captor; void _broker; void _images; void _videos; void _links; void _history
  return { ...blankInput, ...input }
}

function PropertyEditor({ property, captors, brokers, onCancel, onSaved }: {
  property: Property | null
  captors: Captor[]
  brokers: Captor[]
  onCancel: () => void
  onSaved: () => void
}) {
  const [values, setValues] = useState<PropertyInput>(() => propertyInput(property))
  const [images, setImages] = useState<PropertyImage[]>(property?.property_images ?? [])
  const [photos, setPhotos] = useState<File[]>([])
  const [videos, setVideos] = useState((property?.property_videos ?? []).map((video) => video.url).join('\n'))
  const [links, setLinks] = useState<PropertyLink[]>(property?.property_links ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const featureOptions = ['Piscina', 'Churrasqueira', 'Varanda', 'Varanda gourmet', 'Academia', 'Elevador', 'Portaria 24h', 'Playground', 'Salão de festas', 'Ar-condicionado', 'Armários planejados', 'Área de serviço', 'Jardim', 'Outros']
  function text(key: keyof PropertyInput, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }
  function numeric(key: keyof PropertyInput, value: string) {
    setValues((current) => ({ ...current, [key]: numberValue(value) }))
  }
  function toggleFeature(feature: string) {
    setValues((current) => ({ ...current, features: current.features.includes(feature) ? current.features.filter((item) => item !== feature) : [...current.features, feature] }))
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
      await saveProperty(values, property?.id ?? null, photos, videoUrls, links, images)
      setSuccess('Imóvel salvo com sucesso.')
      onSaved()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o imóvel.')
    } finally { setSaving(false) }
  }
  const field = (label: string, key: keyof PropertyInput, type = 'text', required = false, placeholder = '') => <label className="admin-field">{label}<input type={type} required={required} value={String(values[key] ?? '')} placeholder={placeholder} onChange={(event) => type === 'number' ? numeric(key, event.target.value) : text(key, event.target.value)} /></label>
  return <form className="admin-editor" onSubmit={submit}>
    <div className="admin-page-heading editor-heading"><div><button type="button" className="back-button" onClick={onCancel}><ArrowLeft size={15} /> Todos os imóveis</button><h1>{property ? 'Editar imóvel' : 'Cadastrar imóvel'}</h1><p>Preencha os detalhes para manter sua carteira atualizada.</p></div><div className="editor-actions"><button type="button" className="button button-outline" onClick={onCancel}>Cancelar</button><button className="button button-dark" disabled={saving}>{saving ? 'Salvando...' : 'Salvar imóvel'}</button></div></div>
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
      {field('CEP', 'zip_code', 'text', false, '00000-000')}{field('Estado', 'state', 'text', true)}{field('Cidade', 'city', 'text', true)}{field('Região / bairro', 'neighborhood', 'text', true)}
      {field('Endereço', 'address')}{field('Número', 'number')}{field('Complemento', 'complement')}
    </div></section>
    <section className="form-section"><div className="form-section-heading"><span>03</span><div><h2>Valores</h2><p>Preencha apenas os valores aplicáveis</p></div></div><div className="admin-form-grid">
      {field('Preço de venda (R$)', 'sale_price', 'number')}{field('Preço de aluguel mensal (R$)', 'rent_price', 'number')}{field('Condomínio mensal (R$)', 'condo_fee', 'number')}{field('IPTU (R$)', 'property_tax', 'number')}
      <label className="admin-field">Frequência do IPTU<select value={values.tax_frequency ?? ''} onChange={(event) => setValues((current) => ({ ...current, tax_frequency: event.target.value || null }))}><option value="">Não informado</option><option value="MENSAL">Mensal</option><option value="ANUAL">Anual</option></select></label>
    </div></section>
    <section className="form-section"><div className="form-section-heading"><span>04</span><div><h2>Características</h2><p>Detalhes e comodidades</p></div></div><div className="admin-form-grid">
      {field('Área total (m²)', 'total_area', 'number')}{field('Área privativa (m²)', 'private_area', 'number')}{field('Quartos', 'bedrooms', 'number')}{field('Suítes', 'suites', 'number')}{field('Banheiros', 'bathrooms', 'number')}{field('Vagas', 'parking_spaces', 'number')}{field('Andar', 'floor', 'number')}{field('Ano de construção', 'construction_year', 'number')}
      <div className="check-group">{([['furnished', 'Mobiliado'], ['financing', 'Aceita financiamento'], ['trade', 'Aceita permuta']] as const).map(([key, label]) => <label className="check-field" key={key}><input type="checkbox" checked={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}</div>
      <div className="feature-picker"><span className="form-label">Diferenciais</span><div className="feature-options">{featureOptions.map((feature) => <label key={feature} className={values.features.includes(feature) ? 'feature-option selected' : 'feature-option'}><input type="checkbox" checked={values.features.includes(feature)} onChange={() => toggleFeature(feature)} />{feature}</label>)}</div></div>
      {(values.features.includes('Outros') || values.features.some((feature) => !featureOptions.includes(feature))) && <label className="admin-field">Outros diferenciais<input value={values.features.filter((feature) => !featureOptions.includes(feature)).join(', ')} onChange={(event) => setValues((current) => ({ ...current, features: [...current.features.filter((feature) => featureOptions.includes(feature)), ...event.target.value.split(',').map((feature) => feature.trim()).filter(Boolean)] }))} placeholder="Separe por vírgula" /></label>}
    </div></section>
    <section className="form-section"><div className="form-section-heading"><span>05</span><div><h2>Descrição</h2><p>Apresente os diferenciais deste imóvel</p></div></div><label className="admin-field">Descrição completa<textarea rows={6} value={values.description} onChange={(event) => text('description', event.target.value)} placeholder="Conte o que torna este imóvel especial..." /></label></section>
    <section className="form-section"><div className="form-section-heading"><span>06</span><div><h2>Fotografias</h2><p>Imagens nítidas ajudam a apresentar melhor o imóvel</p></div></div><label className="upload-zone"><Upload size={23} /><strong>Adicionar fotografias</strong><span>JPG, PNG ou WEBP · até 12 MB por imagem</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setPhotos((current) => [...current, ...Array.from(event.target.files ?? [])])} /></label><div className="image-manager">
      {images.map((image, index) => <div className="managed-image" key={image.id}><img src={image.url} alt={`Foto ${index + 1}`} /><span>{index === 0 ? 'Principal' : `Foto ${index + 1}`}</span><div><button type="button" onClick={() => moveImage(index, -1)} aria-label="Mover foto para cima"><ArrowUp size={14} /></button><button type="button" onClick={() => moveImage(index, 1)} aria-label="Mover foto para baixo"><ArrowDown size={14} /></button><button type="button" onClick={() => setImages((current) => current.filter((item) => item.id !== image.id).map((item, order) => ({ ...item, display_order: order, is_cover: order === 0 })))} aria-label="Remover foto"><Trash2 size={14} /></button></div></div>)}
      {photos.map((file, index) => <div className="managed-image" key={`${file.name}-${index}`}><img src={URL.createObjectURL(file)} alt={file.name} /><span>Nova foto</span><button type="button" onClick={() => setPhotos((current) => current.filter((_, fileIndex) => fileIndex !== index))} aria-label="Remover nova foto"><Trash2 size={14} /></button></div>)}
    </div></section>
    <section className="form-section"><div className="form-section-heading"><span>07</span><div><h2>Vídeos</h2><p>Adicione links do YouTube, um por linha</p></div></div><label className="admin-field">Links de vídeo<textarea rows={3} value={videos} onChange={(event) => setVideos(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></label></section>
    <section className="form-section"><div className="form-section-heading"><span>08</span><div><h2>Links externos</h2><p>Tour virtual, redes sociais ou outros portais</p></div></div><div className="link-editor-list">{links.map((link, index) => <div className="link-editor-row" key={link.id || `new-${index}`}><input placeholder="Nome do link" value={link.name} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} /><input placeholder="URL https://" value={link.url} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} /><input placeholder="URL da imagem / logotipo (opcional)" value={link.image_url ?? ''} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, image_url: event.target.value || null } : item))} /><label className="check-field"><input type="checkbox" checked={link.is_public} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, is_public: event.target.checked } : item))} />Público</label><button type="button" className="icon-button" onClick={() => moveLink(index, -1)} aria-label="Mover link para cima"><ArrowUp size={14} /></button><button type="button" className="icon-button" onClick={() => moveLink(index, 1)} aria-label="Mover link para baixo"><ArrowDown size={14} /></button><button type="button" className="icon-button danger" onClick={() => setLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Excluir link"><Trash2 size={16} /></button></div>)}<button type="button" className="add-link" onClick={() => setLinks((current) => [...current, { id: '', property_id: property?.id ?? '', name: '', url: '', image_url: null, is_public: true, display_order: current.length }])}><Plus size={16} /> Adicionar link</button></div></section>
    <div className="editor-bottom"><button type="button" className="button button-outline" onClick={onCancel}>Cancelar</button><button className="button button-dark" disabled={saving}>{saving ? 'Salvando...' : 'Salvar imóvel'}</button></div>
  </form>
}

function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
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
  const [memberPhoto, setMemberPhoto] = useState<File | null>(null)
  const [memberPhotoPreview, setMemberPhotoPreview] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [reportFilters, setReportFilters] = useState({ status: '', type: '', purpose: '', captor: '', region: '', from: '', to: '' })
  const [settings, setSettings] = useState({ company_name: 'RDS Imóveis', whatsapp: '', contact_email: '', instagram_url: '' })
  const [settingsError, setSettingsError] = useState('')
  const [settingsSuccess, setSettingsSuccess] = useState('')
  const [memberError, setMemberError] = useState('')
  const [memberSuccess, setMemberSuccess] = useState('')
  useEffect(() => {
    if (!memberPhoto) { setMemberPhotoPreview(''); return }
    const previewUrl = URL.createObjectURL(memberPhoto)
    setMemberPhotoPreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [memberPhoto])
  const view = searchParams.get('view') ?? 'overview'
  const [editorOpened, setEditorOpened] = useState(() => searchParams.get('view') === 'editor')
  const [editorPropertyId, setEditorPropertyId] = useState<string | null>(() => searchParams.get('id'))
  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return }
    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setAuthError(error.message)
      if (active) { setUser(data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null); setAuthLoading(false) }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) { setUser(session?.user ? { id: session.user.id, email: session.user.email } : null); setAuthorized(false) }
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!user || !supabase) { setAuthorized(false); return }
    let active = true
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle().then(async ({ data, error }) => {
      if (!active) return
      if (error) { setAuthError(error.message); return }
      if (data?.role === 'admin') { setAuthorized(true); return }
      await supabase?.auth.signOut()
      setAuthError('Esta conta não possui acesso administrativo.')
    })
    return () => { active = false }
  }, [user])

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
      await saveTeamMember(memberKind, payload, undefined, memberPhoto ?? undefined)
      setMemberName(''); setMemberPhone(''); setMemberWhatsapp(''); setMemberEmail(''); setMemberPhoto(null)
      setMemberSuccess('Integrante cadastrado.')
      await refreshData()
    } catch (reason) { setMemberError(reason instanceof Error ? reason.message : 'Não foi possível cadastrar o integrante.') }
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
  function selectMember(member: Captor) {
    setSelectedMemberId(member.id)
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
      <header className="admin-topbar"><div className="admin-topcrumb">RDS Imóveis <span>/</span> <strong>{view === 'overview' ? 'Visão geral' : view === 'properties' ? 'Imóveis' : view === 'editor' ? (selectedProperty ? 'Editar imóvel' : 'Novo imóvel') : view === 'team' ? 'Equipe' : view === 'reports' ? 'Relatórios' : 'Configurações'}</strong></div><Link to="/" className="view-public-link">Ver site público <ArrowUpRight size={14} /></Link></header>
      <div className="admin-content">
        {dataError && <div className="admin-alert error-alert">{dataError}<button onClick={() => setDataError('')} aria-label="Fechar"><X size={15} /></button></div>}
        {loadingData && <div className="admin-loading-inline"><span className="spinner" />Atualizando dados...</div>}
        {view === 'overview' && <section className="dashboard-view"><div className="admin-page-heading"><div><span className="eyebrow gold">PAINEL ADMINISTRATIVO</span><h1>Bom dia, equipe.</h1><p>Acompanhe sua carteira e os anúncios ativos.</p></div><button className="button button-dark" onClick={() => changeView('editor')}><Plus size={16} /> Cadastrar imóvel</button></div>
          <div className="metric-grid"><Metric label="Total de imóveis" value={properties.length} icon={<Building2 />} /><Metric label="Publicados" value={properties.filter((item) => item.status === 'PUBLICADO').length} icon={<Check />} tone="green" /><Metric label="Criados" value={properties.filter((item) => item.status === 'CRIADO').length} icon={<Plus />} /><Metric label="Pausados" value={properties.filter((item) => item.status === 'PAUSADO').length} icon={<DoorOpen />} /></div>
          <div className="metric-grid secondary-metrics"><Metric label="Stand by" value={properties.filter((item) => item.status === 'STAND_BY').length} /><Metric label="Vendidos" value={properties.filter((item) => item.status === 'VENDIDO').length} /><Metric label="Alugados" value={properties.filter((item) => item.status === 'ALUGADO').length} /><Metric label="Cancelados" value={properties.filter((item) => item.status === 'CANCELADO').length} /></div>
          <div className="dashboard-charts"><section className="admin-panel"><div className="panel-heading"><div><h2>Imóveis por status</h2><p>Distribuição da carteira cadastrada</p></div></div><div className="status-chart">{statusCounts.map(({ status, count }) => <div className="status-bar-row" key={status}><span>{statusNames[status]}</span><div className="bar-track"><div className={`bar-fill status-${status.toLowerCase()}`} style={{ width: `${count / maxStatusCount * 100}%` }} /></div><strong>{count}</strong></div>)}</div></section><section className="admin-panel"><div className="panel-heading"><div><h2>Imóveis por região</h2><p>As regiões com mais anúncios</p></div></div>{locationCounts.length ? <div className="location-chart">{locationCounts.map(([name, count], index) => <div className="location-row" key={name}><span className="location-rank">0{index + 1}</span><span>{name}</span><strong>{count}</strong></div>)}</div> : <p className="muted-empty">Cadastre imóveis para ver a distribuição.</p>}</section></div>
          <div className="dashboard-charts"><section className="admin-panel"><div className="panel-heading"><div><h2>Imóveis por captador</h2><p>Carteira por responsável pela captação</p></div></div><div className="location-chart">{dashboardCaptors.map(([name, count], index) => <div className="location-row" key={name}><span className="location-rank">0{index + 1}</span><span>{name}</span><strong>{count}</strong></div>)}{!dashboardCaptors.length && <p className="muted-empty">Cadastre imóveis para ver os dados.</p>}</div></section><section className="admin-panel"><div className="panel-heading"><div><h2>Evolução de cadastros</h2><p>Novos imóveis nos últimos seis meses</p></div></div><div className="monthly-chart">{monthlyCounts.map((entry) => <div className="month-bar" key={entry.label}><strong>{entry.count}</strong><div><span style={{ height: `${Math.max(4, entry.count / maxMonthly * 100)}%` }} /></div><small>{entry.label}</small></div>)}</div></section></div>
          <div className="admin-panel recent-panel"><div className="panel-heading"><div><h2>Atualizações recentes</h2><p>Seus últimos imóveis cadastrados</p></div><button className="text-link" onClick={() => changeView('properties')}>Ver todos <ArrowRight size={15} /></button></div><PropertyTable properties={properties.slice(0, 5)} onEdit={(item) => changeView('editor', item.id)} onDelete={(item) => void removeProperty(item)} onStatus={(item, status) => void changeStatus(item, status)} onDuplicate={(item) => void duplicateProperty(item)} /></div>
        </section>}
        {view === 'properties' && <section><div className="admin-page-heading"><div><span className="eyebrow gold">CARTEIRA IMOBILIÁRIA</span><h1>Todos os imóveis</h1><p>Gerencie, atualize e acompanhe seus anúncios.</p></div><button className="button button-dark" onClick={() => changeView('editor')}><Plus size={16} /> Cadastrar imóvel</button></div><div className="admin-panel listing-panel"><div className="admin-filters"><label className="admin-search"><Search size={16} /><input value={filter.query} onChange={(event) => setFilter((current) => ({ ...current, query: event.target.value }))} placeholder="Buscar por código, título, local ou captador" /></label><select value={filter.status} onChange={(event) => setFilter((current) => ({ ...current, status: event.target.value }))}><option value="">Todos os status</option>{statuses.map((status) => <option key={status} value={status}>{statusNames[status]}</option>)}</select><select value={filter.type} onChange={(event) => setFilter((current) => ({ ...current, type: event.target.value }))}><option value="">Todos os tipos</option>{propertyTypes.map((type) => <option key={type}>{type}</option>)}</select><select value={filter.captor} onChange={(event) => setFilter((current) => ({ ...current, captor: event.target.value }))}><option value="">Todos os captadores</option>{captors.map((captor) => <option key={captor.id} value={captor.id}>{captor.name}</option>)}</select></div><div className="listing-count">{filtered.length} imóveis encontrados</div><PropertyTable properties={filtered} onEdit={(item) => changeView('editor', item.id)} onDelete={(item) => void removeProperty(item)} onStatus={(item, status) => void changeStatus(item, status)} onDuplicate={(item) => void duplicateProperty(item)} /></div></section>}
        {editorOpened && (!editorPropertyId || selectedProperty) && <div hidden={view !== 'editor'}><PropertyEditor key={editorPropertyId ?? 'new-property'} property={selectedProperty} captors={captors} brokers={brokers} onCancel={closeEditor} onSaved={() => { void refreshData(); closeEditor() }} /></div>}
        {view === 'team' && <section><div className="admin-page-heading"><div><span className="eyebrow gold">TIME RDS</span><h1>Captadores e corretores</h1><p>Gerencie os integrantes responsáveis por captar e atender os imóveis.</p></div></div><div className="team-columns"><section className="admin-panel"><div className="panel-heading"><div><h2>Integrantes cadastrados</h2><p>{team.length} pessoas no time</p></div></div><div className="team-list">{team.map((member) => { const broker = member.name.includes('· corretor'); const baseName = member.name.replace(' · corretor', ''); const associated = properties.filter((property) => broker ? property.broker_id === member.id : property.captor_id === member.id); return <div key={member.id} className={`team-row ${selectedMemberId === member.id ? 'selected' : ''}`}>        <button className="team-select" onClick={() => selectMember(member)}><span className="agent-avatar">{member.photo_url ? <img src={member.photo_url} alt="" /> : <CircleUserRound size={23} />}</span><span className="team-name"><strong>{baseName}</strong><span>{broker ? 'Corretor de atendimento' : 'Captador'} · {member.active ? 'Ativo' : 'Inativo'}</span></span><span className="team-count">{associated.length} imóveis</span></button><button className="member-status" onClick={() => void toggleMember(member)}>{member.active ? 'Desativar' : 'Ativar'}</button></div> })}{!team.length && <p className="muted-empty">Nenhum integrante cadastrado.</p>}</div>{selectedMember && <div className="member-profile"><span className="eyebrow gold">PERFIL DO INTEGRANTE</span><div className="member-profile-heading"><span className="agent-avatar">{selectedMember.photo_url ? <img src={selectedMember.photo_url} alt="" /> : <CircleUserRound size={23} />}</span><h3>{selectedMember.name.replace(' · corretor', '')}</h3></div><div className="member-stats">{statuses.map((status) => <span key={status}>{statusNames[status]} <strong>{properties.filter((property) => (selectedMember.name.includes('· corretor') ? property.broker_id : property.captor_id) === selectedMember.id && property.status === status).length}</strong></span>)}</div><div className="member-property-list">{properties.filter((property) => (selectedMember.name.includes('· corretor') ? property.broker_id : property.captor_id) === selectedMember.id).map((property) => <button key={property.id} onClick={() => changeView('editor', property.id)}>{property.code} · {property.title}<span>{statusNames[property.status]}</span></button>)}</div></div>}</section><section className="admin-panel add-member-panel"><div className="panel-heading"><div><h2>Adicionar integrante</h2><p>Cadastre captadores ou corretores de atendimento.</p></div></div>{memberError && <div className="admin-alert error-alert">{memberError}</div>}{memberSuccess && <div className="admin-alert success-alert">{memberSuccess}</div>}<form className="member-form" onSubmit={(event) => void addMember(event)}><label className="admin-field">Função<select value={memberKind} onChange={(event) => setMemberKind(event.target.value as 'captor' | 'broker')}><option value="captor">Captador</option><option value="broker">Corretor de atendimento</option></select></label><label className="admin-field">Nome<input required value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Nome completo" /></label><label className="admin-field">Telefone<input value={memberPhone} onChange={(event) => setMemberPhone(event.target.value)} placeholder="(61) 99999-9999" /></label><label className="admin-field">WhatsApp<input value={memberWhatsapp} onChange={(event) => setMemberWhatsapp(event.target.value)} placeholder="(61) 99999-9999" /></label><label className="admin-field">E-mail<input type="email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} placeholder="nome@rdsimoveis.com.br" /></label><label className="member-photo-upload"><span className="agent-avatar">{memberPhotoPreview ? <img src={memberPhotoPreview} alt="Prévia da foto selecionada" /> : <CircleUserRound size={23} />}</span><span><strong>{memberPhoto ? memberPhoto.name : 'Adicionar foto'}</strong><small>JPG, PNG ou WEBP · até 12 MB</small></span><input key={memberPhoto ? 'photo-selected' : 'photo-empty'} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseMemberPhoto} /></label><button className="button button-dark"><Plus size={16} /> Adicionar ao time</button></form></section></div></section>}
        {view === 'reports' && <section><div className="admin-page-heading"><div><span className="eyebrow gold">ANÁLISE DA CARTEIRA</span><h1>Relatórios</h1><p>Explore seus imóveis por período, status, tipo, finalidade e captador.</p></div></div><div className="admin-panel report-filter-panel"><div className="admin-filters"><select value={reportFilters.captor} onChange={(event) => setReportFilters((current) => ({ ...current, captor: event.target.value }))}><option value="">Todos os captadores</option>{captors.map((captor) => <option key={captor.id} value={captor.id}>{captor.name}</option>)}</select><select value={reportFilters.status} onChange={(event) => setReportFilters((current) => ({ ...current, status: event.target.value }))}><option value="">Todos os status</option>{statuses.map((status) => <option key={status} value={status}>{statusNames[status]}</option>)}</select><select value={reportFilters.type} onChange={(event) => setReportFilters((current) => ({ ...current, type: event.target.value }))}><option value="">Todos os tipos</option>{propertyTypes.map((type) => <option key={type}>{type}</option>)}</select><select value={reportFilters.purpose} onChange={(event) => setReportFilters((current) => ({ ...current, purpose: event.target.value }))}><option value="">Todas as finalidades</option><option value="VENDA">Venda</option><option value="ALUGUEL">Aluguel</option><option value="AMBOS">Ambos</option></select><input aria-label="Região" placeholder="Região" value={reportFilters.region} onChange={(event) => setReportFilters((current) => ({ ...current, region: event.target.value }))} /><label className="report-date">De<input type="date" value={reportFilters.from} onChange={(event) => setReportFilters((current) => ({ ...current, from: event.target.value }))} /></label><label className="report-date">Até<input type="date" value={reportFilters.to} onChange={(event) => setReportFilters((current) => ({ ...current, to: event.target.value }))} /></label><button className="clear-button" onClick={() => setReportFilters({ status: '', type: '', purpose: '', captor: '', region: '', from: '', to: '' })}>Limpar</button></div></div><div className="metric-grid report-metrics"><Metric label="Imóveis no recorte" value={reportProperties.length} icon={<Building2 />} /><Metric label="Publicados" value={reportProperties.filter((item) => item.status === 'PUBLICADO').length} icon={<Check />} tone="green" /><Metric label="Valor médio de venda" value={Math.round(reportProperties.reduce((sum, item) => sum + (item.sale_price ?? 0), 0) / Math.max(1, reportProperties.filter((item) => item.sale_price != null).length))} icon={<Square />} /><Metric label="Área média (m²)" value={Math.round(reportProperties.reduce((sum, item) => sum + (item.total_area ?? 0), 0) / Math.max(1, reportProperties.filter((item) => item.total_area != null).length))} icon={<Home />} /></div><div className="dashboard-charts"><section className="admin-panel"><div className="panel-heading"><div><h2>Imóveis por captador</h2><p>Distribuição no período e filtros selecionados</p></div></div><div className="status-chart">{captorCounts.map(([name, count]) => <div className="status-bar-row" key={name}><span>{name}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${count / reportMax * 100}%` }} /></div><strong>{count}</strong></div>)}{!captorCounts.length && <p className="muted-empty">Nenhum imóvel corresponde aos filtros.</p>}</div></section><section className="admin-panel"><div className="panel-heading"><div><h2>Resultados filtrados</h2><p>Imóveis incluídos neste relatório</p></div></div><PropertyTable properties={reportProperties.slice(0, 12)} onEdit={(item) => changeView('editor', item.id)} onDelete={(item) => void removeProperty(item)} onStatus={(item, status) => void changeStatus(item, status)} onDuplicate={(item) => void duplicateProperty(item)} /></section></div></section>}
        {view === 'settings' && <section><div className="admin-page-heading"><div><span className="eyebrow gold">PRESENÇA DA IMOBILIÁRIA</span><h1>Configurações</h1><p>Essas informações aparecem nos contatos da área pública.</p></div></div><form className="admin-panel settings-form" onSubmit={(event) => void submitSettings(event)}><div className="panel-heading"><div><h2>Informações de contato</h2><p>Use canais oficiais da imobiliária para receber as solicitações.</p></div></div><div className="settings-fields"><label className="admin-field">Nome da imobiliária<input required value={settings.company_name} onChange={(event) => setSettings((current) => ({ ...current, company_name: event.target.value }))} /></label><label className="admin-field">WhatsApp<input value={settings.whatsapp} onChange={(event) => setSettings((current) => ({ ...current, whatsapp: event.target.value }))} placeholder="5561999999999" /></label><label className="admin-field">E-mail de contato<input type="email" value={settings.contact_email} onChange={(event) => setSettings((current) => ({ ...current, contact_email: event.target.value }))} placeholder="contato@empresa.com.br" /></label><label className="admin-field">Instagram (URL)<input type="url" value={settings.instagram_url} onChange={(event) => setSettings((current) => ({ ...current, instagram_url: event.target.value }))} placeholder="https://instagram.com/..." /></label></div>{settingsError && <div className="admin-alert error-alert">{settingsError}</div>}{settingsSuccess && <div className="admin-alert success-alert">{settingsSuccess}</div>}<div className="settings-submit"><button className="button button-dark">Salvar configurações</button></div></form></section>}
      </div>
    </main>
  </div>
}

function Metric({ label, value, icon, tone = '' }: { label: string; value: number; icon?: React.ReactNode; tone?: string }) {
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
