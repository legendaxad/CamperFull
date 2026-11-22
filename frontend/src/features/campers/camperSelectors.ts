import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store'
import type { Camper } from '@/types/api'
import { campersAdapter } from './camperSlice'

const entitySelectors = campersAdapter.getSelectors((state: RootState) => state.campers.entities)

export const selectCamperEntities = entitySelectors.selectEntities

/** Looks a camper up by Mongo id or by slug (detail URLs use slugs). */
export const selectCamperByIdOrSlug = (state: RootState, idOrSlug: string | undefined): Camper | undefined => {
  if (!idOrSlug) return undefined
  const entities = state.campers.entities.entities
  return entities[idOrSlug] ?? entities[state.campers.slugToId[idOrSlug] ?? '']
}

export const selectDetailRequest = (state: RootState, idOrSlug: string | undefined) =>
  idOrSlug ? state.campers.details[idOrSlug] : undefined

/** Resolves ids to campers, skipping ids that are not loaded. */
export const makeSelectCampersByIds = () =>
  createSelector([selectCamperEntities, (_: RootState, ids: readonly string[]) => ids], (entities, ids) =>
    ids.map((id) => entities[id]).filter((c): c is Camper => c !== undefined),
  )

const selectByIds = makeSelectCampersByIds()

export const selectListing = (state: RootState) => state.campers.listing
export const selectListingCampers = (state: RootState) => selectByIds(state, state.campers.listing.ids)

export const selectFeatured = (state: RootState) => state.campers.featured
export const selectFeaturedCampers = (state: RootState) => selectByIds(state, state.campers.featured.data)

export const selectCompareRequest = (state: RootState) => state.campers.compare

export const selectFilterOptions = (state: RootState) => state.campers.filterOptions
export const selectFeatures = (state: RootState) => state.campers.features
export const selectCategoriesState = (state: RootState) => state.campers.categories

export const selectActiveCategories = createSelector([(state: RootState) => state.campers.categories.data], (categories) =>
  categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
)

export const selectCategoryBySlug = (state: RootState, slug: string | undefined) =>
  slug ? state.campers.categories.data.find((c) => c.slug === slug) : undefined

export const selectCategoryPreview = (state: RootState, slug: string) => state.campers.categoryPreviews[slug]
export const selectCategoryPreviewCampers = (state: RootState, slug: string) =>
  selectByIds(state, state.campers.categoryPreviews[slug]?.data ?? EMPTY_IDS)

const EMPTY_IDS: string[] = []
