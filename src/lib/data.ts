import { demoCaptors, demoProperties } from './demo'
import { isSupabaseConfigured, supabase } from './supabase'
import type { Captor, IntegrationPortal, Property, PropertyImage, PropertyInput, PropertyInquiryInput, PropertyLink, PropertyVideo, SiteSettings } from '../types'

function requireSupabase() {
  if (!supabase) throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para acessar o banco de dados.')
  return supabase
}

async function attachPublicDetails(properties: Property[]): Promise<Property[]> {
  if (!properties.length) return properties
  const client = requireSupabase()
  const ids = properties.map((property) => property.id)
  const [images, videos, links, captors, brokers] = await Promise.all([
    client.from('property_images').select('*').in('property_id', ids).order('display_order'),
    client.from('property_videos').select('*').in('property_id', ids).order('display_order'),
    client.from('property_links').select('*').in('property_id', ids).eq('is_public', true).order('display_order'),
    client.from('public_captors').select('*'),
    client.from('public_brokers').select('*'),
  ])
  for (const result of [images, videos, links, captors, brokers]) {
    if (result.error) throw result.error
  }
  const captorMap = new Map((captors.data ?? []).map((captor) => [captor.id, captor]))
  const brokerMap = new Map((brokers.data ?? []).map((broker) => [broker.id, broker]))
  return properties.map((property) => ({
    ...property,
    captor: property.captor_id ? captorMap.get(property.captor_id) ?? null : null,
    broker: property.broker_id ? brokerMap.get(property.broker_id) ?? null : null,
    property_images: images.data?.filter((image) => image.property_id === property.id) ?? [],
    property_videos: videos.data?.filter((video) => video.property_id === property.id) ?? [],
    property_links: links.data?.filter((link) => link.property_id === property.id) ?? [],
  }))
}

export async function getPublicProperties(): Promise<Property[]> {
  if (!supabase) return demoProperties
  const { data, error } = await supabase.from('public_properties').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return attachPublicDetails(data ?? [])
}

export async function getAdminProperties(): Promise<Property[]> {
  const client = requireSupabase()
  const { data, error } = await client.from('properties').select('*').order('created_at', { ascending: false })
  if (error) throw error
  if (!data?.length) return []
  const ids = data.map((property) => property.id)
  const [images, videos, links, captors, brokers, history, profiles, integrations] = await Promise.all([
    client.from('property_images').select('*').in('property_id', ids).order('display_order'),
    client.from('property_videos').select('*').in('property_id', ids).order('display_order'),
    client.from('property_links').select('*').in('property_id', ids).order('display_order'),
    client.from('captors').select('*').order('name'),
    client.from('brokers').select('*').order('name'),
    client.from('property_status_history').select('*').in('property_id', ids).order('changed_at', { ascending: false }),
    client.from('profiles').select('id, full_name'),
    client.from('imovel_integracoes').select('*').in('imovel_id', ids),
  ])
  for (const result of [images, videos, links, captors, brokers, history, profiles, integrations]) {
    if (result.error) throw result.error
  }
  const captorMap = new Map((captors.data ?? []).map((captor) => [captor.id, captor]))
  const brokerMap = new Map((brokers.data ?? []).map((broker) => [broker.id, broker]))
  const profileMap = new Map((profiles.data ?? []).map((profile) => [profile.id, profile.full_name]))
  return data.map((property) => ({
    ...property,
    captor: property.captor_id ? captorMap.get(property.captor_id) ?? null : null,
    broker: property.broker_id ? brokerMap.get(property.broker_id) ?? null : null,
    property_images: images.data?.filter((image) => image.property_id === property.id) ?? [],
    property_videos: videos.data?.filter((video) => video.property_id === property.id) ?? [],
    property_links: links.data?.filter((link) => link.property_id === property.id) ?? [],
    status_history: history.data?.filter((entry) => entry.property_id === property.id).map((entry) => ({ ...entry, changed_by_name: entry.changed_by ? profileMap.get(entry.changed_by) ?? null : null })) ?? [],
    integrations: integrations.data?.filter((integration) => integration.imovel_id === property.id) ?? [],
  }))
}

export async function getTeam(): Promise<Captor[]> {
  if (!supabase) return demoCaptors
  const [captors, brokers] = await Promise.all([
    supabase.from('captors').select('*').order('name'),
    supabase.from('brokers').select('*').order('name'),
  ])
  if (captors.error) throw captors.error
  if (brokers.error) throw brokers.error
  return [...(captors.data ?? []), ...(brokers.data ?? []).map((broker) => ({ ...broker, name: `${broker.name} · corretor` }))]
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const defaults: SiteSettings = { id: true, company_name: 'RDS Imóveis', whatsapp: '', contact_email: '', instagram_url: '' }
  if (!supabase) return defaults
  const { data, error } = await supabase.from('public_site_settings').select('*').eq('id', true).maybeSingle()
  if (error) throw error
  return data ?? defaults
}

export async function sendPropertyInquiry(inquiry: PropertyInquiryInput): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.functions.invoke('property-inquiry', { body: inquiry })
  if (!error) return

  if ('context' in error && error.context instanceof Response) {
    const status = error.context.status
    let body: unknown = null
    try {
      body = await error.context.clone().json()
    } catch {
      try {
        body = await error.context.text()
      } catch {
        body = null
      }
    }
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') throw new Error(body.error)
    if (status === 404) throw new Error('A função de envio ainda não foi publicada no Supabase. Faça o deploy de property-inquiry e tente novamente.')
    if (status === 401) throw new Error('O Supabase recusou a chamada da função. Verifique se property-inquiry foi publicada com verify_jwt = false.')
    if (status === 403) throw new Error('A origem deste site não está autorizada. Confira o secret ALLOWED_ORIGINS da função no Supabase.')
    if (status === 429) throw new Error('Muitas solicitações. Aguarde alguns minutos e tente novamente.')
    if (status === 503) throw new Error('O envio ainda não está configurado. Confira se a migration e os secrets do Resend foram configurados no Supabase.')
    if (status >= 500) throw new Error(`O serviço de envio retornou erro (${status}). Confira os logs da Edge Function property-inquiry no Supabase.`)
    throw new Error(`Não foi possível enviar a solicitação (erro ${status}). Confira os logs da Edge Function property-inquiry no Supabase.`)
  }
  console.error('Property inquiry function request failed:', error)
  throw new Error('Não foi possível conectar à função de envio do Supabase. Verifique se ela foi publicada e tente novamente.')
}

export async function saveSiteSettings(settings: Omit<SiteSettings, 'id'>): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.from('site_settings').upsert({ id: true, ...settings })
  if (error) throw error
}

export async function updateTeamMember(kind: 'captor' | 'broker', id: string, active: boolean): Promise<void> {
  const client = requireSupabase()
  const table = kind === 'captor' ? 'captors' : 'brokers'
  const { error } = await client.from(table).update({ active }).eq('id', id)
  if (error) throw error
}

export async function deleteTeamMember(kind: 'captor' | 'broker', id: string): Promise<void> {
  const client = requireSupabase()
  const table = kind === 'captor' ? 'captors' : 'brokers'
  const { error } = await client.from(table).delete().eq('id', id)
  if (error) throw error
}

export async function saveTeamMember(kind: 'captor' | 'broker', member: Partial<Captor> & Pick<Captor, 'name'>, id?: string, photo?: File, sourceKind?: 'captor' | 'broker'): Promise<void> {
  const client = requireSupabase()
  let uploadedPath: string | null = null
  let payload = member
  if (photo) {
    const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
    const extension = extensions[photo.type]
    if (!extension) throw new Error('A foto deve estar no formato JPG, PNG ou WEBP.')
    if (photo.size > 12 * 1024 * 1024) throw new Error('A foto deve ter no máximo 12 MB.')
    uploadedPath = `team/${kind}/${crypto.randomUUID()}.${extension}`
    const { error } = await client.storage.from('property-images').upload(uploadedPath, photo, { contentType: photo.type })
    if (error) throw error
    const { data } = client.storage.from('property-images').getPublicUrl(uploadedPath)
    payload = { ...member, photo_url: data.publicUrl }
  }

  try {
    if (id && sourceKind && sourceKind !== kind) {
      const { error } = await client.rpc('move_team_member', {
        p_from_kind: sourceKind,
        p_to_kind: kind,
        p_member_id: id,
        p_name: payload.name,
        p_photo_url: payload.photo_url ?? null,
        p_phone: payload.phone ?? null,
        p_whatsapp: payload.whatsapp ?? null,
        p_email: payload.email ?? null,
        p_description: payload.description ?? null,
        p_active: payload.active ?? true,
      })
      if (error) throw error
    } else {
      const result = kind === 'captor'
        ? id ? await client.from('captors').update(payload).eq('id', id) : await client.from('captors').insert(payload)
        : id ? await client.from('brokers').update(payload).eq('id', id) : await client.from('brokers').insert(payload)
      if (result.error) throw result.error
    }
  } catch (reason) {
    if (uploadedPath) {
      const { error } = await client.storage.from('property-images').remove([uploadedPath])
      if (error) {
        const saveMessage = reason instanceof Error ? reason.message : 'Não foi possível salvar o integrante.'
        throw new Error(`${saveMessage} Também não foi possível remover a foto enviada: ${error.message}`)
      }
    }
    throw reason
  }
}

export async function saveProperty(input: PropertyInput, id: string | null, photoFiles: File[], videoUrls: string[], links: PropertyLink[], keptImages: PropertyImage[] = [], duplicateImageUrls: string[] = [], activePortals: IntegrationPortal[] = []): Promise<void> {
  const client = requireSupabase()
  const { code, ...fields } = input
  const payload = code.trim() ? { ...fields, code: code.trim() } : fields
  const saved = id
    ? await client.from('properties').update(payload).eq('id', id).select('id').single()
    : await client.from('properties').insert(payload).select('id').single()
  if (saved.error) throw saved.error
  const propertyId = saved.data.id

  if (videoUrls.length) {
    const cleared = await client.from('property_videos').delete().eq('property_id', propertyId)
    if (cleared.error) throw cleared.error
    const rows: Omit<PropertyVideo, 'id'>[] = videoUrls.map((url, display_order) => ({ property_id: propertyId, url, display_order }))
    const result = await client.from('property_videos').insert(rows)
    if (result.error) throw result.error
  } else if (id) {
    const cleared = await client.from('property_videos').delete().eq('property_id', propertyId)
    if (cleared.error) throw cleared.error
  }

  const currentLinks = await client.from('property_links').select('id').eq('property_id', propertyId)
  if (currentLinks.error) throw currentLinks.error
  const retainedLinkIds = links.map((link) => link.id).filter(Boolean)
  const removedLinkIds = (currentLinks.data ?? []).map((link) => link.id).filter((linkId) => !retainedLinkIds.includes(linkId))
  if (removedLinkIds.length) {
    const clearedLinks = await client.from('property_links').delete().in('id', removedLinkIds)
    if (clearedLinks.error) throw clearedLinks.error
  }
  if (links.length) {
    const rows = links.map((link, display_order) => ({
      ...(link.id ? { id: link.id } : {}),
      property_id: propertyId,
      name: link.name,
      url: link.url,
      image_url: link.image_url,
      is_public: link.is_public,
      display_order,
    }))
    const result = await client.from('property_links').upsert(rows)
    if (result.error) throw result.error
  }

  const currentImages = await client.from('property_images').select('*').eq('property_id', propertyId)
  if (currentImages.error) throw currentImages.error
  const retainedImageIds = keptImages.map((image) => image.id)
  const removedImages = (currentImages.data ?? []).filter((image) => !retainedImageIds.includes(image.id))
  if (removedImages.length) {
    const removedRows = await client.from('property_images').delete().in('id', removedImages.map((image) => image.id))
    if (removedRows.error) throw removedRows.error
    const paths = removedImages.flatMap((image) => {
      const marker = '/storage/v1/object/public/property-images/'
      const location = image.url.split(marker)[1]
      return location ? [decodeURIComponent(location)] : []
    })
    const unusedPaths: string[] = []
    for (const [index, image] of removedImages.entries()) {
      const { data: references, error } = await client.from('property_images').select('id').eq('url', image.url).limit(1)
      if (error) throw error
      if (!references?.length && paths[index]) unusedPaths.push(paths[index])
    }
    if (unusedPaths.length) {
      const removedFiles = await client.storage.from('property-images').remove(unusedPaths)
      if (removedFiles.error) throw removedFiles.error
    }
  }
  if (keptImages.length) {
    const updatedImages = await Promise.all(keptImages.map((image, display_order) =>
      client.from('property_images').update({ display_order, is_cover: display_order === 0 }).eq('id', image.id),
    ))
    const failedUpdate = updatedImages.find((result) => result.error)
    if (failedUpdate?.error) throw failedUpdate.error
  }
  if (photoFiles.length) {
    const offset = keptImages.length
    const rows = await Promise.all(photoFiles.map(async (file, index) => {
      const path = `${propertyId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
      const uploaded = await client.storage.from('property-images').upload(path, file, { upsert: false })
      if (uploaded.error) throw uploaded.error
      const { data } = client.storage.from('property-images').getPublicUrl(path)
      return { property_id: propertyId, url: data.publicUrl, display_order: offset + index, is_cover: offset + index === 0 }
    }))
    const result = await client.from('property_images').insert(rows)
    if (result.error) throw result.error
  }
  if (!id && duplicateImageUrls.length) {
    const rows = duplicateImageUrls.map((url, display_order) => ({ property_id: propertyId, url, display_order, is_cover: display_order === 0 }))
    const result = await client.from('property_images').insert(rows)
    if (result.error) throw result.error
  }

  const existingIntegrations = await client.from('imovel_integracoes').select('id, portal, ativo').eq('imovel_id', propertyId)
  if (existingIntegrations.error) throw existingIntegrations.error
  const selectedPortals = new Set(activePortals)
  const existingPortals = new Set((existingIntegrations.data ?? []).map((integration) => integration.portal))
  const updates = (existingIntegrations.data ?? [])
    .filter((integration) => integration.ativo !== selectedPortals.has(integration.portal))
    .map((integration) => client.from('imovel_integracoes').update({ ativo: selectedPortals.has(integration.portal) }).eq('id', integration.id))
  const updateResults = await Promise.all(updates)
  const failedUpdate = updateResults.find((result) => result.error)
  if (failedUpdate?.error) throw failedUpdate.error
  const newIntegrations = activePortals
    .filter((portal) => !existingPortals.has(portal))
    .map((portal) => ({ imovel_id: propertyId, portal, ativo: true }))
  if (newIntegrations.length) {
    const result = await client.from('imovel_integracoes').insert(newIntegrations)
    if (result.error) throw result.error
  }
}

export async function deleteProperty(id: string): Promise<void> {
  const client = requireSupabase()
  const { data: images, error: imageError } = await client.from('property_images').select('url').eq('property_id', id)
  if (imageError) throw imageError
  const { error } = await client.from('properties').delete().eq('id', id)
  if (error) throw error
  const urls = [...new Set((images ?? []).map((image) => image.url))]
  const unusedPaths: string[] = []
  for (const url of urls) {
    const { data: references, error: referenceError } = await client.from('property_images').select('id').eq('url', url).limit(1)
    if (referenceError) throw referenceError
    const marker = '/storage/v1/object/public/property-images/'
    const location = url.split(marker)[1]
    if (!references?.length && location) unusedPaths.push(decodeURIComponent(location))
  }
  if (unusedPaths.length) {
    const { error: storageError } = await client.storage.from('property-images').remove(unusedPaths)
    if (storageError) throw storageError
  }
}

export async function updatePropertyStatus(id: string, status: Property['status']): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.from('properties').update({ status }).eq('id', id)
  if (error) throw error
}

export { isSupabaseConfigured }
