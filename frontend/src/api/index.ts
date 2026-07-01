import axios from 'axios'
import { BASE_URL } from './config'

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
})

export interface ClothingItem {
  id: number
  image_url: string
  original_image_url?: string
  processed_image_url?: string
  category: string
  color: string | null
  sub_category: string
  fit: string
  style_tags: string[]
  color_primary: string
  color_tone: string
  user_tags: string[]
  created_at: string
}

export interface OutfitItem {
  id: number
  name: string
  items: ClothingItem[]
  created_at: string
}

export interface Recommendation {
  id: number
  items: ClothingItem[]
  total_items: number
}

export interface TagDef {
  id: number
  name: string
}

export interface OutfitPosItem {
  clothing_id: number
  x: number
  y: number
  scale: number
  rotation: number
  z_index: number
  clothing?: ClothingItem
}

export interface OutfitDetail {
  id: number
  name: string
  items: OutfitPosItem[]
  tags?: { style_tags: string[]; color_tones: string[]; fits: string[] }
  created_at: string
}

export async function uploadClothing(
  file: File,
  extra?: {
    sub_category?: string
    fit?: string
    style_tags?: string[]
    color_primary?: string
    color_tone?: string
    user_tags?: string[]
  }
): Promise<ClothingItem> {
  const form = new FormData()
  form.append('file', file)
  if (extra?.sub_category) form.append('sub_category', extra.sub_category)
  if (extra?.fit) form.append('fit', extra.fit)
  if (extra?.style_tags?.length) form.append('style_tags', JSON.stringify(extra.style_tags))
  if (extra?.color_primary) form.append('color_primary', extra.color_primary)
  if (extra?.color_tone) form.append('color_tone', extra.color_tone)
  if (extra?.user_tags?.length) form.append('user_tags', JSON.stringify(extra.user_tags))
  const { data } = await api.post<ClothingItem>('/upload-clothing', form)
  return data
}

export async function updateClothing(id: number, updates: Partial<ClothingItem>): Promise<ClothingItem> {
  const { data } = await api.put<ClothingItem>(`/clothing/${id}`, updates)
  return data
}

export async function getWardrobe(category?: string): Promise<ClothingItem[]> {
  const params = category && category !== 'all' ? { category } : {}
  const { data } = await api.get<{ items: ClothingItem[] }>('/wardrobe', { params })
  return data.items
}

export async function getClothing(id: number): Promise<ClothingItem> {
  const { data } = await api.get<ClothingItem>(`/clothing/${id}`)
  return data
}

export async function searchClothing(params: Record<string, string | undefined>): Promise<ClothingItem[]> {
  const clean: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== 'all') clean[k] = v
  }
  const { data } = await api.get<{ items: ClothingItem[] }>('/search-clothing', { params: clean })
  return data.items
}

export async function createOutfit(items: number[], name?: string): Promise<OutfitItem> {
  const { data } = await api.post<OutfitItem>('/outfit/create', { items, name })
  return data
}

export async function getOutfits(): Promise<OutfitItem[]> {
  const { data } = await api.get<{ outfits: OutfitItem[] }>('/outfits')
  return data.outfits
}

export async function getRecommendations(weather?: string, style?: string): Promise<Recommendation[]> {
  const params: Record<string, string> = {}
  if (weather) params.weather = weather
  if (style) params.style = style
  const { data } = await api.get<{ recommendations: Recommendation[] }>('/recommend-outfit', { params })
  return data.recommendations
}

export async function getTags(): Promise<TagDef[]> {
  const { data } = await api.get<{ tags: TagDef[] }>('/tags')
  return data.tags
}

export async function createTag(name: string): Promise<TagDef> {
  const { data } = await api.post<TagDef>('/tags', { name })
  return data
}

export async function deleteTag(id: number): Promise<void> {
  await api.delete(`/tags/${id}`)
}

export async function deleteClothing(id: number): Promise<void> {
  await api.delete(`/clothing/${id}`)
}

export async function createOutfitV2(name: string, items: OutfitPosItem[]): Promise<OutfitDetail> {
  const { data } = await api.post<OutfitDetail>('/outfits', { name, items })
  return data
}

export async function getOutfitById(id: number): Promise<OutfitDetail> {
  const { data } = await api.get<OutfitDetail>(`/outfits/${id}`)
  return data
}

export async function updateOutfitV2(id: number, name: string, items: OutfitPosItem[]): Promise<void> {
  await api.put(`/outfits/${id}`, { name, items })
}

export async function deleteOutfitV2(id: number): Promise<void> {
  await api.delete(`/outfits/${id}`)
}

export async function getOutfitsV2(): Promise<OutfitDetail[]> {
  const { data } = await api.get<{ outfits: OutfitDetail[] }>('/outfits')
  return data.outfits
}
