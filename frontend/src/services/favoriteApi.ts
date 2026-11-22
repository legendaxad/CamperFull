import type { FavoriteCamper, Paginated } from '@/types/api'
import { deleteData, getData, getPaginated, postData } from './api/apiClient'
import { ENDPOINTS } from './api/endpoints'

/** Favorites are stored per member on the server (sign-in required). */
export const favoriteApi = {
  ids(): Promise<string[]> {
    return getData<string[]>(ENDPOINTS.favorites.ids)
  },
  list(page = 1, limit = 24): Promise<Paginated<FavoriteCamper>> {
    return getPaginated<FavoriteCamper>(ENDPOINTS.favorites.list, { params: { page, limit } })
  },
  async add(camperId: string): Promise<void> {
    await postData<null>(ENDPOINTS.favorites.item(camperId))
  },
  async remove(camperId: string): Promise<void> {
    await deleteData<null>(ENDPOINTS.favorites.item(camperId))
  },
}
