// Copia para o Storage do site (bucket property-images) as fotos que ainda
// apontam para fora, como as do Kenlo (lh3.googleusercontent.com), e troca a
// url no banco. Depois disso o site não depende mais do Kenlo para exibir fotos
// nem para enviá-las aos portais pelo XML.
//
// Processa um lote por chamada; o painel chama de novo, passando `after`, até
// `processed` voltar 0. Apenas administradores logados podem chamar.

import { createClient } from 'npm:@supabase/supabase-js@2'

const BUCKET = 'property-images'
const BATCH_SIZE = 30
const CONCURRENCY = 5
const MAX_BYTES = 12 * 1024 * 1024
const DOWNLOAD_TIMEOUT_MS = 25_000
const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

type ImageRow = { id: string; property_id: string; url: string }

async function isAdmin(baseUrl: string, anonKey: string, authorization: string): Promise<boolean> {
  const response = await fetch(`${baseUrl}/rest/v1/rpc/is_admin`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: authorization, 'Content-Type': 'application/json' },
    body: '{}',
  })
  return response.ok && (await response.json()) === true
}

async function download(url: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const response = await fetch(url, {
    // JPEG primeiro: é o formato que todos os portais aceitam.
    headers: { Accept: 'image/jpeg,image/png;q=0.9,image/webp;q=0.8' },
    redirect: 'follow',
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`download respondeu ${response.status}`)
  const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  if (!EXTENSIONS[contentType]) throw new Error(`formato não suportado (${contentType || 'desconhecido'})`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (!bytes.length) throw new Error('arquivo vazio')
  if (bytes.length > MAX_BYTES) throw new Error('arquivo maior que 12 MB')
  return { bytes, contentType }
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
  if (!baseUrl || !serviceKey || !anonKey) return json({ error: 'Função sem as variáveis internas do Supabase.' }, 503)

  const authorization = request.headers.get('authorization') ?? ''
  if (!/^Bearer\s+\S+/i.test(authorization) || !(await isAdmin(baseUrl, anonKey, authorization))) {
    return json({ error: 'Apenas administradores podem copiar as fotos.' }, 401)
  }

  let after = ''
  try {
    const body = await request.json() as { after?: unknown }
    if (typeof body?.after === 'string') after = body.after
  } catch {
    // corpo vazio: começa do início
  }

  const db = createClient(baseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const storagePrefix = `${baseUrl}/storage/v1/object/public/${BUCKET}/`

  let query = db.from('property_images').select('id,property_id,url,source_url')
    .not('url', 'like', `${storagePrefix}%`)
    .order('id')
    .limit(BATCH_SIZE)
  if (after) query = query.gt('id', after)
  const batch = await query
  if (batch.error) {
    const missingColumn = /source_url/.test(batch.error.message)
    return json({ error: missingColumn ? 'Aplique a migration 20261126190000_property_images_source_url.sql no Supabase.' : `Leitura das fotos: ${batch.error.message}` }, 503)
  }
  const rows = (batch.data ?? []) as ImageRow[]

  let copied = 0
  const failed: Array<{ id: string; property_id: string; reason: string }> = []
  let next = 0
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, async () => {
    while (next < rows.length) {
      const row = rows[next++]
      try {
        if (!/^https?:\/\//i.test(row.url)) throw new Error('endereço inválido')
        const { bytes, contentType } = await download(row.url)
        const path = `kenlo/${row.property_id}/${row.id}.${EXTENSIONS[contentType]}`
        const uploaded = await db.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true, cacheControl: '31536000' })
        if (uploaded.error) throw new Error(`envio ao Storage: ${uploaded.error.message}`)
        const publicUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
        // Só troca se a foto não mudou nesse meio-tempo (ex.: sincronização rodando).
        const updated = await db.from('property_images')
          .update({ url: publicUrl, source_url: row.url })
          .eq('id', row.id).eq('url', row.url)
          .select('id')
        if (updated.error) throw new Error(`atualização do banco: ${updated.error.message}`)
        if (!updated.data?.length) {
          await db.storage.from(BUCKET).remove([path])
          continue
        }
        copied++
      } catch (reason) {
        failed.push({ id: row.id, property_id: row.property_id, reason: reason instanceof Error ? reason.message : String(reason) })
      }
    }
  }))
  if (failed.length) console.warn('Fotos não copiadas:', JSON.stringify(failed))

  const pending = await db.from('property_images').select('id', { count: 'exact', head: true }).not('url', 'like', `${storagePrefix}%`)

  return json({
    ok: true,
    processed: rows.length,
    copied,
    failed,
    nextAfter: rows.length ? rows[rows.length - 1].id : null,
    remaining: pending.count ?? null,
  })
})
