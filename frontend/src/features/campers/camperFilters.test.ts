import { describe, expect, it } from 'vitest'
import { countActiveFilters, listingQueryToParams, parseListingQuery, toCamperListParams } from './camperFilters'

describe('listing URL <-> GET /campers params', () => {
  it('round-trips filters through the URL', () => {
    const params = new URLSearchParams('q=knaus&min=100000&max=300000&brand=Knaus,Hymer&license=CLASS1_ORDINARY&seats=3&from=2027-01-10&to=2027-01-15&sort=price_asc&limit=24&page=2&view=list')
    const query = parseListingQuery(params)
    expect(query).toMatchObject({ search: 'knaus', minPrice: 100000, maxPrice: 300000, brand: ['Knaus', 'Hymer'], licenseType: ['CLASS1_ORDINARY'], minSeats: 3, sort: 'price_asc', limit: 24, page: 2, view: 'list' })
    expect(listingQueryToParams(query).toString()).toBe(params.toString())
    expect(countActiveFilters(query)).toBe(8)
  })

  it('drops invalid values instead of sending them to the backend', () => {
    const query = parseListingQuery(new URLSearchParams('license=NOPE&feature=abc&sort=cheap&limit=7&page=-1&from=2027-01-15&to=2027-01-10&min=-5'))
    expect(query.licenseType).toEqual([])
    expect(query.features).toEqual([])
    expect(query.sort).toBe('newest')
    expect(query.limit).toBe(12)
    expect(query.page).toBe(1)
    expect(query.startDate).toBeNull()
    expect(query.minPrice).toBeNull()
  })

  it('maps to the backend query, including the category slug', () => {
    const params = toCamperListParams(parseListingQuery(new URLSearchParams('q=van&seats=5')), 'caravan')
    expect(params).toMatchObject({ category: 'caravan', search: 'van', minSeats: 5, page: 1, limit: 12, sort: 'newest' })
    expect(params.startDate).toBeUndefined()
  })
})
