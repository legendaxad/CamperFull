import { LayoutGrid, List, Menu, SearchX, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import heroCaravan from '@/assets/images/heroes/hero-caravan.jpg'
import { CamperCard, CamperGridSkeleton } from '@/components/camper/CamperCard'
import { CompareTray } from '@/components/camper/CompareTray'
import { Button } from '@/components/common/Button'
import { EmptyState, ErrorState } from '@/components/common/Feedback'
import { Pagination } from '@/components/common/Pagination'
import { Select } from '@/components/forms/FormField'
import { PageHero } from '@/components/layout/PageHero'
import { ROUTES } from '@/constants/navigation'
import {
  countActiveFilters,
  EMPTY_FILTERS,
  listingQueryToParams,
  parseListingQuery,
  PER_PAGE_OPTIONS,
  SORT_OPTIONS,
  toCamperListParams,
  type CamperFilters,
  type ListingQuery,
} from '@/features/campers/camperFilters'
import { selectCategoriesState, selectCategoryBySlug, selectListing, selectListingCampers } from '@/features/campers/camperSelectors'
import { fetchCampers, retryCatalog } from '@/features/campers/camperSlice'
import type { CamperSort } from '@/services/camperApi'
import { selectFiltersOpen, setFiltersOpen } from '@/features/ui/uiSlice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { cn } from '@/utils/cn'
import { formatNumber } from '@/utils/format'
import NotFoundPage from '../NotFound/NotFoundPage'
import { FiltersPanel } from './FiltersPanel'

export default function CampersPage() {
  const { category: slug } = useParams()
  const categories = useAppSelector(selectCategoriesState)
  const category = useAppSelector((state) => selectCategoryBySlug(state, slug))
  // Unknown category slugs are a 404 once the category list has loaded.
  if (slug && categories.status === 'succeeded' && !category) return <NotFoundPage />
  return <CampersListing categorySlug={slug ?? null} categoryName={category?.name ?? null} />
}

function CampersListing({ categorySlug, categoryName }: { categorySlug: string | null; categoryName: string | null }) {
  const dispatch = useAppDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo(() => parseListingQuery(searchParams), [searchParams])
  const listing = useAppSelector(selectListing)
  const pageItems = useAppSelector(selectListingCampers)
  const filtersOpen = useAppSelector(selectFiltersOpen)
  useLockBodyScroll(filtersOpen)

  const title = categoryName ?? (categorySlug ? 'Campers' : 'All campers')
  useDocumentTitle(title)

  // The URL is the source of truth; every change becomes one GET /campers request.
  const params = useMemo(() => toCamperListParams(query, categorySlug), [query, categorySlug])
  useEffect(() => {
    void dispatch(fetchCampers(params))
  }, [dispatch, params])

  const isLoading = listing.status === 'idle' || listing.status === 'loading'
  const isError = listing.status === 'failed'
  const total = listing.meta?.total ?? 0
  const pageCount = listing.meta?.totalPages ?? 1
  const page = listing.meta?.page ?? query.page
  const activeCount = countActiveFilters(query)
  const retry = () => {
    dispatch(retryCatalog())
    void dispatch(fetchCampers(params))
  }

  const setQuery = (patch: Partial<ListingQuery>) => {
    setSearchParams(listingQueryToParams({ ...query, ...patch }))
  }
  const applyFilters = (filters: CamperFilters) => {
    setQuery({ ...filters, page: 1 })
    dispatch(setFiltersOpen(false))
  }
  const goToPage = (next: number) => {
    setQuery({ page: next })
    document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })
  }

  // Remount the panel whenever the applied filters change so its staged state resets.
  const panelKey = listingQueryToParams({ ...query, sort: undefined, page: undefined, limit: undefined, view: undefined }).toString()

  return (
    <>
      <PageHero
        image={heroCaravan}
        eyebrow="Our ranges"
        title={title}
        crumbs={[{ label: 'Home', to: ROUTES.home }, ...(categorySlug ? [{ label: 'Campers', to: ROUTES.campers }] : []), { label: title }]}
      />

      <div className="container-page grid gap-8 py-10 lg:grid-cols-[242px_minmax(0,1fr)] lg:gap-7 lg:py-14">
        <aside className="hidden lg:block" aria-label="Filters">
          <FiltersPanel key={panelKey} value={query} onApply={applyFilters} />
          <CompareTray className="mt-10" />
        </aside>

        <div id="results" className="scroll-mt-28">
          {/* Toolbar (Figma Group 2301): count · sort · per page · grid/list. */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#c4c4c4] pb-3">
            <button
              type="button"
              onClick={() => dispatch(setFiltersOpen(true))}
              className="flex items-center gap-2 rounded-lg py-1.5 pr-2 text-sm font-semibold lg:hidden"
              aria-label={`Open filters${activeCount ? ` (${activeCount} active)` : ''}`}
            >
              <Menu className="size-6" aria-hidden />
              Filters
              {activeCount > 0 && <span className="rounded-full bg-brand px-2 text-xs leading-5 text-white">{activeCount}</span>}
            </button>
            <p className="mr-auto text-base font-semibold" aria-live="polite">
              Item <span className="text-brand">{isLoading ? '…' : formatNumber(total)}</span>
            </p>
            <label className="flex items-center gap-2 text-sm font-medium">
              <span className="hidden sm:inline">Sort by</span>
              <Select
                value={query.sort}
                onChange={(e) => setQuery({ sort: e.target.value as CamperSort, page: 1 })}
                className="h-9 w-44 rounded-md bg-white py-0 text-xs ring-1 ring-[#c4c4c4] sm:w-52"
                aria-label="Sort by"
              >
                {Object.entries(SORT_OPTIONS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
            </label>
            <Select
              value={query.limit}
              onChange={(e) => setQuery({ limit: Number(e.target.value), page: 1 })}
              className="h-9 w-20 rounded-md bg-white py-0 text-xs ring-1 ring-[#c4c4c4]"
              aria-label="Results per page"
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
            <div className="hidden overflow-hidden rounded-md ring-1 ring-[#c4c4c4] sm:flex" role="group" aria-label="Layout">
              {(['grid', 'list'] as const).map((view) => {
                const Icon = view === 'grid' ? LayoutGrid : List
                return (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setQuery({ view })}
                    aria-pressed={query.view === view}
                    aria-label={`${view} view`}
                    className={cn('flex h-9 w-10 items-center justify-center transition', query.view === view ? 'bg-[#efefef] text-ink' : 'bg-white text-muted hover:text-ink')}
                  >
                    <Icon className="size-[18px]" />
                  </button>
                )
              })}
            </div>
          </div>

          {activeCount > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">{activeCount} filter{activeCount > 1 ? 's' : ''} applied</span>
              <button
                type="button"
                onClick={() => applyFilters(EMPTY_FILTERS)}
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand shadow-card hover:bg-brand-soft"
              >
                <X className="size-3.5" aria-hidden /> Clear all
              </button>
            </div>
          )}

          <div className="mt-6">
            {isError ? (
              <ErrorState message={listing.error ?? 'Campers could not be loaded.'} onRetry={retry} />
            ) : isLoading ? (
              <CamperGridSkeleton layout={query.view} />
            ) : pageItems.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No campers match your filters"
                description={activeCount ? 'Try widening the price range or removing a few filters.' : 'There are no campers in this section yet.'}
                action={activeCount > 0 && <Button onClick={() => applyFilters(EMPTY_FILTERS)}>Reset filters</Button>}
              />
            ) : (
              <div
                className={cn(
                  'grid gap-5',
                  query.view === 'grid' ? 'grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1',
                )}
              >
                {pageItems.map((camper) => (
                  <CamperCard key={camper._id} camper={camper} layout={query.view} description={camper.description} />
                ))}
              </div>
            )}
          </div>

          <div className="mt-10">
            <Pagination page={page} total={pageCount} onChange={goToPage} />
          </div>
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={() => dispatch(setFiltersOpen(false))} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label="Filters" className="absolute inset-y-0 left-0 flex w-[min(90vw,360px)] animate-slide-up flex-col bg-surface shadow-raised">
            <div className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button type="button" onClick={() => dispatch(setFiltersOpen(false))} aria-label="Close filters" className="rounded-full p-2 hover:bg-black/5">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-8">
              <FiltersPanel key={panelKey} value={query} onApply={applyFilters} />
              <CompareTray className="mt-8" />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
