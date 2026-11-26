import { useState } from 'react'
import type { Property, WatermarkPosition } from '../types'

export const watermarkLogoUrl = '/rds-logo-wordmark.png'

export const defaultWatermarkPosition: WatermarkPosition = 'bottom_right'
/** Transparência 70% = logo com 30% de opacidade. */
export const defaultWatermarkTransparency = 70

/**
 * Padrão único da RDS: canto inferior direito, 30% de opacidade.
 * Vale para todas as fotos de todos os imóveis, de qualquer origem
 * (cadastro manual, duplicação, importação do Kenlo); não depende de configuração por imóvel.
 */
export const rdsWatermark: WatermarkSettings = { position: defaultWatermarkPosition, transparency: defaultWatermarkTransparency }

export interface WatermarkSettings {
  position: WatermarkPosition
  /** 0 = logo sólida, 100 = logo invisível. */
  transparency: number
}


/** Marca d'água das fotos de um imóvel: sempre o padrão da RDS. */
export function watermarkOf(property: Pick<Property, 'id'> | null | undefined): WatermarkSettings | null {
  return property ? rdsWatermark : null
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

/** Seção do cadastro: prévia da marca d'água padrão, aplicada automaticamente. */
export function WatermarkPreview({ previewSources }: {
  /** URLs das fotografias do imóvel (já salvas ou recém-selecionadas), na ordem do cadastro. */
  previewSources: string[]
}) {
  const [previewIndex, setPreviewIndex] = useState(0)
  const index = previewIndex < previewSources.length ? previewIndex : 0
  const previewUrl = previewSources[index]
  return <div className="wm-editor">
    <div className="wm-controls">
      <p className="integration-notice">A logo da RDS é aplicada automaticamente em todas as fotografias de todos os imóveis, no canto inferior direito, com 30% de opacidade. Vale para imóveis cadastrados aqui e importados do Kenlo. Os arquivos originais não são alterados.</p>
    </div>
    <div className="wm-preview">
      <span className="form-label">Pré-visualização</span>
      {previewUrl
        ? <div className="wm-preview-frame"><img src={previewUrl} alt="Prévia da fotografia com a logo" /><WatermarkOverlay settings={rdsWatermark} /></div>
        : <div className="wm-preview-empty">Adicione uma fotografia acima para ver a prévia.</div>}
      {previewSources.length > 1 && <div className="wm-preview-thumbs">{previewSources.map((source, sourceIndex) => <button type="button" key={`${source}-${sourceIndex}`} className={sourceIndex === index ? 'active' : ''} onClick={() => setPreviewIndex(sourceIndex)} aria-label={`Usar a foto ${sourceIndex + 1} na prévia`}><img src={source} alt="" /></button>)}</div>}
    </div>
  </div>
}
