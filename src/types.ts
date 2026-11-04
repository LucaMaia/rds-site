export type PropertyStatus =
  | 'CRIADO'
  | 'PUBLICADO'
  | 'PAUSADO'
  | 'STAND_BY'
  | 'VENDIDO'
  | 'ALUGADO'
  | 'CANCELADO'

export type Purpose = 'VENDA' | 'ALUGUEL' | 'AMBOS'

export interface Captor {
  id: string
  name: string
  photo_url: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  description: string | null
  active: boolean
}

export interface PropertyStatusHistory {
  id: string
  property_id: string
  from_status: PropertyStatus | null
  to_status: PropertyStatus
  changed_by: string | null
  changed_at: string
  changed_by_name?: string | null
}

export interface Broker {
  id: string
  name: string
  photo_url: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  description: string | null
  active: boolean
}

export type PublicCaptor = Pick<Captor, 'id' | 'name' | 'photo_url' | 'phone' | 'whatsapp' | 'active'>

export interface Property {
  id: string
  code: string
  title: string
  type: string
  purpose: Purpose
  status: PropertyStatus
  captor_id: string | null
  broker_id: string | null
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
  owner_name?: string | null
  owner_phone?: string | null
  living_rooms?: number | null
  social_balcony?: boolean
  infrastructure?: string[]
  service_areas?: string[]
  leisure_areas?: string[]
  intimate_features?: string[]
  closets?: string[]
  floor_types?: string[]
  description: string
  featured: boolean
  created_at: string
  updated_at?: string
  captor?: PublicCaptor | null
  broker?: PublicCaptor | null
  property_images?: PropertyImage[]
  property_videos?: PropertyVideo[]
  property_links?: PropertyLink[]
  status_history?: PropertyStatusHistory[]
  integrations?: PropertyIntegration[]
}

export interface PropertyImage {
  id: string
  property_id: string
  url: string
  display_order: number
  is_cover: boolean
}

export interface PropertyVideo {
  id: string
  property_id: string
  url: string
  display_order: number
}

export interface PropertyLink {
  id: string
  property_id: string
  name: string
  url: string
  image_url: string | null
  is_public: boolean
  display_order: number
}

export interface SiteSettings {
  id: boolean
  company_name: string
  whatsapp: string
  contact_email: string
  instagram_url: string
}

export interface PropertyInquiryInput {
  propertyId: string
  name: string
  email: string
  whatsapp: string
  honeypot: string
}

export type PropertyInteractionType = 'contact_received' | 'email_sent' | 'visit_requested' | 'visit_completed'

export interface PropertyInteraction {
  id: string
  property_id: string | null
  property_code: string
  property_title: string
  property_neighborhood: string
  property_city: string
  property_state: string
  property_type: string
  property_purpose: Purpose
  property_status: PropertyStatus
  property_captor_id: string | null
  property_captor_name: string | null
  property_created_at: string
  interested_name: string
  interested_email: string
  interested_phone: string
  interaction_type: PropertyInteractionType
  occurred_at: string
  status: string | null
  created_at: string
}

export interface PropertyIntegration {
  id: string
  imovel_id: string
  portal: IntegrationPortal
  ativo: boolean
  codigo_externo: string | null
  criado_em: string
  atualizado_em: string
}

export type IntegrationPortal = 'olx' | 'wimoveis'

export interface PropertyInput {
  code: string
  title: string
  type: string
  purpose: Purpose
  status: PropertyStatus
  captor_id: string | null
  broker_id: string | null
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
  owner_name: string | null
  owner_phone: string | null
  living_rooms: number | null
  social_balcony: boolean
  infrastructure: string[]
  service_areas: string[]
  leisure_areas: string[]
  intimate_features: string[]
  closets: string[]
  floor_types: string[]
  description: string
  featured: boolean
}

export interface DbTable<Row, Insert = Partial<Row>, Update = Partial<Row>> {
  Row: Row & Record<string, unknown>
  Insert: Insert & Record<string, unknown>
  Update: Update & Record<string, unknown>
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      properties: DbTable<Property, Partial<Property> & Pick<Property, 'title' | 'type' | 'purpose' | 'status' | 'state' | 'city' | 'neighborhood'> & { code?: string }>
      captors: DbTable<Captor, Partial<Captor> & Pick<Captor, 'name'>>
      brokers: DbTable<Broker, Partial<Broker> & Pick<Broker, 'name'>>
      property_images: DbTable<PropertyImage, Partial<PropertyImage> & Pick<PropertyImage, 'property_id' | 'url'>>
      property_videos: DbTable<PropertyVideo, Partial<PropertyVideo> & Pick<PropertyVideo, 'property_id' | 'url'>>
      property_links: DbTable<PropertyLink, Partial<PropertyLink> & Pick<PropertyLink, 'property_id' | 'name' | 'url'>>
      property_status_history: DbTable<PropertyStatusHistory>
      property_interactions: DbTable<PropertyInteraction, Partial<PropertyInteraction> & Pick<PropertyInteraction, 'property_code' | 'property_title' | 'property_neighborhood' | 'property_city' | 'property_state' | 'property_type' | 'property_purpose' | 'property_status' | 'property_created_at' | 'interested_name' | 'interested_email' | 'interested_phone' | 'interaction_type'>>
      imovel_integracoes: DbTable<PropertyIntegration, Partial<PropertyIntegration> & Pick<PropertyIntegration, 'imovel_id' | 'portal'>>
      profiles: DbTable<{ id: string; role: string; full_name: string | null }>
      site_settings: DbTable<SiteSettings>
    }
    Views: {
      public_properties: DbTable<Property>
      public_captors: DbTable<Pick<Captor, 'id' | 'name' | 'photo_url' | 'phone' | 'whatsapp' | 'active'>>
      public_brokers: DbTable<Pick<Broker, 'id' | 'name' | 'photo_url' | 'phone' | 'whatsapp' | 'active'>>
      public_site_settings: DbTable<SiteSettings>
    }
    Functions: {
      move_team_member: {
        Args: {
          p_from_kind: string
          p_to_kind: string
          p_member_id: string
          p_name: string
          p_photo_url: string | null
          p_phone: string | null
          p_whatsapp: string | null
          p_email: string | null
          p_description: string | null
          p_active: boolean
        }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
