import { BedDouble, Eye, Plus, Star, Users } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Thumb } from '@/components/ui/Avatar'
import { CamperStatusBadge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SearchInput, Select } from '@/components/ui/Field'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Segmented'
import { useDebouncedValue } from '@/hooks/common'
import { useListParams } from '@/hooks/useListParams'
import { useCampersQuery, useCategoriesQuery, type CamperListArgs } from '@/services/endpoints'
import { CAMPER_STATUSES, type Camper, type CamperStatus } from '@/types/api'
import { formatMoney, formatNumber } from '@/utils/format'
import { CAMPER_STATUS_META, LICENSE_LABELS } from '@/utils/status'

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'popular', label: 'Most viewed' },
] as const

function CamperCard({ camper, index }: { camper: Camper; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.03 }}>
      <Link
        to={`/campers/${camper._id}`}
        className="card group flex h-full flex-col overflow-hidden transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <Thumb src={camper.images[0]?.url} alt={camper.name} className="h-full w-full rounded-none ring-0 transition-transform duration-500 group-hover:scale-[1.03]" />
          <div className="absolute top-3 left-3 flex gap-1.5">
            <CamperStatusBadge status={camper.status} />
            {camper.isFeatured && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-on-accent">Featured</span>}
          </div>
          {camper.images.length > 1 && <span className="absolute right-3 bottom-3 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-medium text-white">{camper.images.length} photos</span>}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-fg">{camper.name}</p>
              <p className="truncate text-xs text-fg-3">
                {[camper.category?.name, camper.location.region].filter(Boolean).join(' · ')}
              </p>
            </div>
            {camper.ratingCount > 0 && (
              <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-fg-2">
                <Star className="h-3.5 w-3.5 fill-accent text-accent" aria-hidden /> {camper.ratingAverage.toFixed(1)}
                <span className="text-fg-3">({camper.ratingCount})</span>
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-3">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden /> {camper.capacity.seats} seats
            </span>
            <span className="flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5" aria-hidden /> Sleeps {camper.capacity.sleeps}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" aria-hidden /> {formatNumber(camper.viewCount)}
            </span>
          </div>
          <div className="mt-auto flex items-end justify-between pt-4">
            <p>
              <span className="text-base font-semibold text-fg tabular">{formatMoney(camper.pricing.dailyRate)}</span>
              <span className="text-xs text-fg-3"> / night</span>
            </p>
            <span className="text-[11px] text-fg-3">{LICENSE_LABELS[camper.licenseType]}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function CampersPage() {
  const list = useListParams()
  const [search, setSearch] = useState(list.get('search'))
  const debounced = useDebouncedValue(search.trim())
  const statusParam = list.get('status') as CamperStatus | ''
  const status = (CAMPER_STATUSES as readonly string[]).includes(statusParam) ? (statusParam as CamperStatus) : null
  const category = list.get('category')
  const sort = (SORTS.find((option) => option.value === list.get('sort'))?.value ?? 'newest') as CamperListArgs['sort']

  useEffect(() => {
    if (debounced !== list.get('search')) list.set({ search: debounced })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const { data, error, isLoading, isFetching, refetch } = useCampersQuery({
    page: list.page,
    limit: 12,
    status: status ? [status] : undefined,
    search: list.get('search') || undefined,
    category: category || undefined,
    sort,
  })
  const categories = useCategoriesQuery()
  const filtered = Boolean(status || category || list.get('search'))

  return (
    <>
      <PageHeader
        title="Fleet"
        description="Campers, pricing, availability and performance."
        breadcrumbs={[{ label: 'Management' }, { label: 'Fleet' }]}
        actions={
          <ButtonLink to="/campers/new" variant="primary" icon={<Plus className="h-4 w-4" />}>
            Add camper
          </ButtonLink>
        }
      />

      <Card className="mb-5 overflow-hidden">
        <div className="border-b border-line px-3">
          <Tabs
            label="Camper status"
            value={status ?? 'ACTIVE_FLEET'}
            onChange={(value) => list.set({ status: value === 'ACTIVE_FLEET' ? null : value })}
            tabs={[{ value: 'ACTIVE_FLEET', label: 'All (not archived)' }, ...CAMPER_STATUSES.map((value) => ({ value, label: CAMPER_STATUS_META[value].label }))]}
          />
        </div>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Name, brand, company, region…" className="sm:w-80" label="Search campers" />
          <Select aria-label="Category" value={category} onChange={(e) => list.set({ category: e.target.value })} className="sm:w-48">
            <option value="">All categories</option>
            {categories.data?.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select aria-label="Sort" value={sort} onChange={(e) => list.set({ sort: e.target.value === 'newest' ? null : e.target.value })} className="sm:ml-auto sm:w-48">
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="card overflow-hidden">
              <Skeleton className="aspect-[16/10] rounded-none" />
              <div className="flex flex-col gap-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="mt-4 h-5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : data && data.items.length === 0 ? (
        <Card>
          <EmptyState
            title={filtered ? 'No campers match these filters' : 'Your fleet is empty'}
            description={filtered ? 'Try another status, category or search.' : 'Add your first camper to start taking bookings.'}
            action={
              !filtered && (
                <ButtonLink to="/campers/new" variant="primary" icon={<Plus className="h-4 w-4" />}>
                  Add camper
                </ButtonLink>
              )
            }
          />
        </Card>
      ) : (
        <div className={isFetching ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {data?.items.map((camper, index) => <CamperCard key={camper._id} camper={camper} index={index} />)}
          </div>
          <Card className="mt-5">
            <Pagination meta={data?.meta} onPageChange={list.setPage} label="campers" />
          </Card>
        </div>
      )}
    </>
  )
}
