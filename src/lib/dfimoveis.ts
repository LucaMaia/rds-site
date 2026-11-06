import type { Property } from '../types'

export const dfImoveisTypes = [
  'Apartamento', 'Casa', 'Sala', 'Loja', 'Rural', 'Kitnet', 'Hotel-Flat',
  'Ponto Comercial', 'Garagem', 'Lote', 'Predio', 'Galpao', 'Casa Condominio', 'Loteamento',
] as const

export const dfImoveisSubtypes: Record<string, string[]> = {
  Apartamento: ['Padrão', 'Cobertura', 'Duplex', 'Triplex', 'Mobiliado', 'Loft'],
  Casa: ['Padrão', 'Sobrado', 'Barracão'],
  Sala: ['Padrão', 'Andar', 'Clínica', 'Consultório'],
  Loja: ['Padrão', 'Sobreloja'],
  Rural: ['Chácara-Sítio', 'Fazenda'],
  Kitnet: ['Kitnet-Studio', 'Mobiliado'],
  'Hotel-Flat': ['Padrão'],
  'Ponto Comercial': ['Pousada', 'Padaria', 'Farmácia', 'Posto de Gasolina', 'Hotel', 'Galpão', 'Padrão', 'Prédio'],
  Garagem: ['Padrão'],
  Lote: ['Residencial', 'Comercial', 'Industrial'],
  Predio: ['Misto', 'Comercial', 'Residencial'],
  Galpao: ['Padrão'],
  'Casa Condominio': ['Padrão', 'Sobrado'],
  Loteamento: ['Residencial', 'Comercial', 'Industrial'],
}

type DfImoveisValidationProperty = Pick<
  Property,
  'code' | 'dfimoveis_type' | 'dfimoveis_subtype' | 'zip_code' | 'private_area' | 'total_area' | 'land_area'
  | 'bedrooms' | 'purpose' | 'sale_price' | 'rent_price'
>

export function dfImoveisMissingFields(property: DfImoveisValidationProperty): string[] {
  const missing: string[] = []
  if (!property.code.trim() || property.code.length > 10) missing.push('Código do imóvel (máximo 10 caracteres)')
  if (!property.dfimoveis_type || !dfImoveisTypes.includes(property.dfimoveis_type as typeof dfImoveisTypes[number])) {
    missing.push('Tipo DF Imóveis')
  }
  const allowedSubtypes = property.dfimoveis_type ? dfImoveisSubtypes[property.dfimoveis_type] : undefined
  if (!property.dfimoveis_subtype || !allowedSubtypes?.includes(property.dfimoveis_subtype)) {
    missing.push('Subtipo DF Imóveis')
  }
  if (String(property.zip_code ?? '').replace(/\D/g, '').length !== 8) missing.push('CEP')
  if (property.private_area == null) missing.push('Área útil')
  if (property.total_area == null) missing.push('Área total')
  if (property.land_area == null) missing.push('Área do terreno')
  if (property.bedrooms == null) missing.push('Dormitórios')
  if (property.purpose === 'VENDA' && property.sale_price == null) missing.push('Preço de venda')
  if (property.purpose === 'ALUGUEL' && property.rent_price == null) missing.push('Preço de locação')
  if (property.purpose === 'AMBOS' && property.sale_price == null && property.rent_price == null) {
    missing.push('Preço de venda ou locação')
  }
  return missing
}
