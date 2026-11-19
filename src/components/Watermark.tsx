import { useState } from 'react'
import type { Property, WatermarkPosition } from '../types'

export const watermarkLogoUrl = '/rds-logo-wordmark.png'

export const watermarkPositions: Array<[WatermarkPosition, string]> = [
  ['top_left', 'Superior esquerdo'],
  ['top_right', 'Superior direito'],
  ['center', 'Centralizado'],
  ['bottom_left', 'Inferior esquerdo'],
  ['bottom_right', 'Inferior direito'],
]

export const defaultWatermarkPosition: WatermarkPosition = 'bottom_right'
export const defaultWatermarkTransparency = 30

export interface WatermarkSettings {
  position: WatermarkPosition
  /** 0 = logo sólida, 100 = logo invisível. */
  transparency: number
}

const validPositions = new Set<string>(watermarkPositions.map(([position]) => position))

export function clampTransparency(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return defaultWatermarkTransparency
  return Math.min(100, Math.max(0, Math.round(number)))
}

/** Configuração de um imóvel, ou null quando a marca d'água está desativada (padrão de imóveis antigos). */
export function watermarkOf(property: Pick<Property, 'show_watermark' | 'watermark_position' | 'watermark_transparency'> | null | undefined): WatermarkSettings | null {
  if (!property?.show_watermark) return null
  const position = property.watermark_position && validPositions.has(property.watermark_position) ? property.watermark_position : defaultWatermarkPosition
  return { position, transparency: clampTransparency(property.watermark_transparency ?? defaultWatermarkTransparency) }
}

/**
 * Camada visual com a logo da RDS. Deve ficar dentro do elemento (position: relative)
 * que tem exatamente o tamanho visível da fotografia. O tamanho da logo é proporcional
 * ao menor lado da foto, então o padrão se mantém em qualquer proporção ou resolução.
 * A imagem original não é alterada.
 */
export function WatermarkOverlay({ settings }: { settings: WatermarkSettings | null }) {
  if (!settings) return null
  return <span className={`wm-overlay wm-${settings.position}`} aria-hidden="true">
    <img src={watermarkLogoUrl} alt="" draggable={false} decoding="async" style={{ opacity: (100 - settings.transparency) / 100 }} />
  </span>
}

export interface WatermarkEditorValue {
  show_watermark: boolean
  watermark_position: WatermarkPosition
  watermark_transparency: number
}

const gridCells: Array<WatermarkPosition | null> = ['top_left', null, 'top_right', null, 'center', null, 'bottom_left', null, 'bottom_right']

/** Seção do cadastro: ativação, posição, transparência e prévia ao vivo. */
export function WatermarkEditor({ value, onChange, previewSources }: {
  value: WatermarkEditorValue
  onChange: (next: Partial<WatermarkEditorValue>) => void
  /** URLs das fotografias do imóvel (já salvas ou recém-selecionadas), na ordem do cadastro. */
  previewSources: string[]
}) {
  const [previewIndex, setPreviewIndex] = useState(0)
  const index = previewIndex < previewSources.length ? previewIndex : 0
  const previewUrl = previewSources[index]
  const transparency = clampTransparency(value.watermark_transparency)
  const settings: WatermarkSettings | null = value.show_watermark ? { position: value.watermark_position, transparency } : null
  return <div className="wm-editor">
    <div className="wm-controls">
      <label className="check-field wm-toggle">
        <input type="checkbox" checked={value.show_watermark} onChange={(event) => onChange({ show_watermark: event.target.checked })} />
        <span><strong>Exibir a logo da RDS nas fotografias</strong><small>{value.show_watermark ? 'Ativado: a logo aparece em todas as fotos deste imóvel no site.' : 'Desativado: as fotos são exibidas normalmente.'}</small></span>
      </label>
      <fieldset className="wm-fieldset" disabled={!value.show_watermark}>
        <legend className="form-label">Posição da logo</legend>
        <div className="wm-position-grid" role="radiogroup" aria-label="Posição da logo">
          {gridCells.map((position, cell) => position
            ? <label key={position} className={value.watermark_position === position ? 'wm-position selected' : 'wm-position'} title={watermarkPositions.find(([key]) => key === position)?.[1]}>
              <input type="radio" name="watermark-position" value={position} checked={value.watermark_position === position} onChange={() => onChange({ watermark_position: position })} />
              <span className={position === 'center' ? 'wm-position-mark large' : 'wm-position-mark'} aria-hidden="true" />
              <span className="wm-sr">{watermarkPositions.find(([key]) => key === position)?.[1]}</span>
            </label>
            : <span key={`empty-${cell}`} className="wm-position-empty" aria-hidden="true" />)}
        </div>
        <span className="wm-position-name">{watermarkPositions.find(([key]) => key === value.watermark_position)?.[1]}</span>
      </fieldset>
      <fieldset className="wm-fieldset" disabled={!value.show_watermark}>
        <legend className="form-label">Transparência da logo</legend>
        <div className="wm-slider">
          <input type="range" min={0} max={100} step={1} value={transparency} aria-label="Transparência da logo" onChange={(event) => onChange({ watermark_transparency: clampTransparency(event.target.value) })} />
          <output>{transparency}%</output>
        </div>
        <small className="wm-hint">0% deixa a logo sólida; 100% a deixa invisível. A fotografia não muda.</small>
      </fieldset>
    </div>
    <div className="wm-preview">
      <span className="form-label">Pré-visualização</span>
      {previewUrl
        ? <div className="wm-preview-frame"><img src={previewUrl} alt="Prévia da fotografia com a logo" /><WatermarkOverlay settings={settings} /></div>
        : <div className="wm-preview-empty">Adicione uma fotografia acima para ver a prévia.</div>}
      {previewSources.length > 1 && <div className="wm-preview-thumbs">{previewSources.map((source, sourceIndex) => <button type="button" key={`${source}-${sourceIndex}`} className={sourceIndex === index ? 'active' : ''} onClick={() => setPreviewIndex(sourceIndex)} aria-label={`Usar a foto ${sourceIndex + 1} na prévia`}><img src={source} alt="" /></button>)}</div>}
    </div>
  </div>
}
