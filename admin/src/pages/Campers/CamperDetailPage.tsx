import { Archive, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { BookingStatusBadge, CamperStatusBadge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, CardHeader, DetailRow } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { MenuItem, Popover } from '@/components/ui/Menu'
import { Pagination } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/toastContext'
import { describeError, errorStatus } from '@/services/errors'
import { useBookingsQuery, useCamperQuery, useDeleteCamperMutation, useFleetQuery, useSetCamperStatusMutation } from '@/services/endpoints'
import { CAMPER_STATUSES, type Booking, type Camper, type CamperStatus } from '@/types/api'
import { cn } from '@/utils/cn'
import { addDays, todayInKorea } from '@/utils/dates'
import { formatDate, formatMoney, formatNumber, formatPercent, fullName, humanize, pluralize } from '@/utils/format'
import { BOOKING_STATUS_META, CAMPER_STATUS_META, LICENSE_LABELS } from '@/utils/status'
import { CamperGallery } from './CamperGallery'

const AVAILABILITY_DAYS = 60

export default function CamperDetailPage() {
  const { id = '' } = useParams()
  const { data, error, isLoading, refetch } = useCamperQuery(id)
  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-10 w-72 lg:col-span-3" />
        <Skeleton className="aspect-[16/9] lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    )
  }
  if (error || !data) {
    return (
      <Card>
        <ErrorState error={error} onRetry={refetch} />
      </Card>
    )
  }
  return <CamperDetail camper={data} />
}

function CamperDetail({ camper }: { camper: Camper }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [setStatus, { isLoading: changing }] = useSetCamperStatusMutation()
  const [deleteCamper, { isLoading: deleting }] = useDeleteCamperMutation()
  const [pendingStatus, setPendingStatus] = useState<CamperStatus | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const changeStatus = async (status: CamperStatus) => {
    try {
      await setStatus({ id: camper._id, status }).unwrap()
      toast.success(`${camper.name} is now ${CAMPER_STATUS_META[status].label.toLowerCase()}.`)
      setPendingStatus(null)
    } catch (error) {
      toast.error(describeError(error))
    }
  }

  return (
    <>
      <PageHeader
        documentTitle={camper.name}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {camper.name}
            <CamperStatusBadge status={camper.status} />
          </span>
        }
        description={[camper.category?.name, camper.brand, camper.location.region].filter(Boolean).join(' · ')}
        breadcrumbs={[{ label: 'Fleet', to: '/campers' }, { label: camper.name }]}
        actions={
          <>
            <Popover
              trigger={({ toggle, ...aria }) => (
                <Button onClick={toggle} {...aria} loading={changing}>
                  Set status <ChevronDown className="h-4 w-4" />
                </Button>
              )}
            >
              {(close) =>
                CAMPER_STATUSES.filter((status) => status !== camper.status).map((status) => (
                  <MenuItem
                    key={status}
                    icon={status === 'ARCHIVED' ? <Archive /> : undefined}
                    onClick={() => {
                      close()
                      if (status === 'ARCHIVED' || status === 'MAINTENANCE' || status === 'UNAVAILABLE') setPendingStatus(status)
                      else void changeStatus(status)
                    }}
                  >
                    <span>
                      <span className="block font-medium text-fg">{CAMPER_STATUS_META[status].label}</span>
                      <span className="block text-xs text-fg-3">{CAMPER_STATUS_META[status].description}</span>
                    </span>
                  </MenuItem>
                ))
              }
            </Popover>
            <ButtonLink to={`/campers/${camper._id}/edit`} variant="primary" icon={<Pencil className="h-4 w-4" />}>
              Edit
            </ButtonLink>
            <Button variant="ghost" size="icon" className="text-danger" onClick={() => setConfirmDelete(true)} aria-label="Delete camper" title="Delete camper">
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <CamperGallery camper={camper} />
          <Performance camper={camper} />
          <Availability camper={camper} />
          <BookingHistory camperId={camper._id} />
          <Card>
            <CardHeader title="Description" />
            <div className="px-5 pb-5">
              <p className="text-sm leading-relaxed whitespace-pre-line text-fg-2">{camper.description}</p>
              {camper.highlights.length > 0 && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {camper.highlights.map((highlight) => (
                    <div key={highlight.title} className="rounded-lg bg-subtle p-3">
                      <p className="text-[13px] font-semibold text-fg">{highlight.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-fg-3">{highlight.description}</p>
                    </div>
                  ))}
                </div>
              )}
              {camper.features.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {camper.features.map((feature) => (
                    <span key={feature._id} className="rounded-full border border-line px-2.5 py-1 text-xs text-fg-2">
                      {feature.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Pricing" />
            <dl className="divide-y divide-line px-5 pb-3">
              <DetailRow label="Daily rate">{formatMoney(camper.pricing.dailyRate)}</DetailRow>
              <DetailRow label="Weekend rate">{formatMoney(camper.pricing.weekendDailyRate ?? camper.pricing.dailyRate)}</DetailRow>
              <DetailRow label="Cleaning fee">{formatMoney(camper.pricing.cleaningFee)}</DetailRow>
              <DetailRow label="Security deposit">{formatMoney(camper.pricing.securityDeposit)}</DetailRow>
              <DetailRow label="Stay length">
                {camper.minNights}–{camper.maxNights} nights
              </DetailRow>
            </dl>
            {camper.extras.length > 0 && (
              <div className="border-t border-line px-5 py-3">
                <p className="mb-2 text-xs font-medium text-fg-3">Extras</p>
                <ul className="flex flex-col gap-1.5 text-[13px]">
                  {camper.extras.map((extra) => (
                    <li key={extra._id ?? extra.name} className="flex justify-between gap-3">
                      <span className="text-fg-2">
                        {extra.name} <span className="text-fg-3">(max {extra.maxQuantity})</span>
                      </span>
                      <span className="font-medium text-fg tabular">
                        {formatMoney(extra.price)}
                        <span className="text-xs font-normal text-fg-3">{extra.chargeType === 'PER_NIGHT' ? '/night' : '/booking'}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
          <Card>
            <CardHeader title="Specifications" />
            <dl className="divide-y divide-line px-5 pb-3">
              <DetailRow label="Category">{camper.category?.name ?? '—'}</DetailRow>
              <DetailRow label="Brand / company">{[camper.brand, camper.company].filter(Boolean).join(' · ') || '—'}</DetailRow>
              <DetailRow label="Base vehicle">{camper.baseVehicle || '—'}</DetailRow>
              <DetailRow label="Model year">{camper.modelYear ?? '—'}</DetailRow>
              <DetailRow label="Licence">{LICENSE_LABELS[camper.licenseType]}</DetailRow>
              <DetailRow label="Seats / sleeps">
                {camper.capacity.seats} / {camper.capacity.sleeps}
              </DetailRow>
              <DetailRow label="Fuel / gearbox">
                {humanize(camper.specifications.fuelType)} · {humanize(camper.specifications.transmission)}
              </DetailRow>
              <DetailRow label="Engine">{camper.specifications.engine || '—'}</DetailRow>
              <DetailRow label="Dimensions (L×W×H)">
                {camper.specifications.lengthMm && camper.specifications.widthMm && camper.specifications.heightMm
                  ? `${formatNumber(camper.specifications.lengthMm)} × ${formatNumber(camper.specifications.widthMm)} × ${formatNumber(camper.specifications.heightMm)} mm`
                  : '—'}
              </DetailRow>
              <DetailRow label="Weight">{camper.specifications.weightKg ? `${formatNumber(camper.specifications.weightKg)} kg` : '—'}</DetailRow>
              <DetailRow label="Mileage">{camper.specifications.mileageKm !== undefined ? `${formatNumber(camper.specifications.mileageKm)} km` : '—'}</DetailRow>
            </dl>
          </Card>
          <Card>
            <CardHeader title="Pickup location" />
            <div className="px-5 pb-5 text-[13px] text-fg-2">
              <p className="font-medium text-fg">{[camper.location.city, camper.location.region].filter(Boolean).join(', ')}</p>
              {camper.location.address && <p className="mt-1">{camper.location.address}</p>}
              {camper.location.pickupNotes && <p className="mt-2 text-fg-3">{camper.location.pickupNotes}</p>}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingStatus)}
        busy={changing}
        title={pendingStatus ? `Set status to ${CAMPER_STATUS_META[pendingStatus].label.toLowerCase()}?` : ''}
        description={pendingStatus ? `${CAMPER_STATUS_META[pendingStatus].description} Existing bookings are not changed.` : undefined}
        confirmLabel="Change status"
        tone={pendingStatus === 'ARCHIVED' ? 'danger' : 'primary'}
        onCancel={() => setPendingStatus(null)}
        onConfirm={() => pendingStatus && void changeStatus(pendingStatus)}
      />
      <ConfirmDialog
        open={confirmDelete}
        busy={deleting}
        tone="danger"
        title={`Delete ${camper.name}?`}
        description="This permanently removes the camper and its photos. Campers with bookings cannot be deleted; archive them instead."
        confirmLabel="Delete camper"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          try {
            await deleteCamper(camper._id).unwrap()
            toast.success(`${camper.name} was deleted.`)
            navigate('/campers', { replace: true })
          } catch (error) {
            setConfirmDelete(false)
            toast.error(errorStatus(error) === 409 ? 'This camper has bookings, so it cannot be deleted. Archive it instead to keep the history.' : describeError(error))
          }
        }}
      />
    </>
  )
}

function Performance({ camper }: { camper: Camper }) {
  const today = todayInKorea()
  const from = addDays(today, -89)
  const fleet = useFleetQuery({ from, to: today })
  const stats = fleet.data?.campers.find((entry) => entry.camperId === camper._id)

  return (
    <Card>
      <CardHeader title="Performance" description="Last 90 days" action={<Link to="/analytics?range=90d#fleet" className="text-[13px] font-medium text-accent-ink hover:underline">Compare fleet</Link>} />
      <div className="grid grid-cols-2 gap-4 border-t border-line px-5 py-4 sm:grid-cols-3 lg:grid-cols-6">
        {fleet.isLoading ? (
          Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10" />)
        ) : fleet.error ? (
          <p className="col-span-full text-[13px] text-fg-3">Performance data is unavailable right now.</p>
        ) : (
          [
            ['Revenue', formatMoney(stats?.revenue ?? 0)],
            ['Bookings', formatNumber(stats?.bookings ?? 0)],
            ['Nights booked', formatNumber(stats?.bookedNights ?? 0)],
            ['Utilisation', stats ? formatPercent(stats.utilization) : camper.status === 'ARCHIVED' ? 'Archived' : '—'],
            ['Rating', camper.ratingCount ? `${camper.ratingAverage.toFixed(1)} (${camper.ratingCount})` : 'No reviews'],
            ['Views', formatNumber(camper.viewCount)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-fg-3">{label}</p>
              <p className="mt-1 text-base font-semibold text-fg tabular">{value}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

/** Next 60 days: which nights are taken by pending (held), confirmed or active bookings. */
function Availability({ camper }: { camper: Camper }) {
  const today = todayInKorea()
  const end = addDays(today, AVAILABILITY_DAYS)
  const { data, isLoading } = useBookingsQuery({ page: 1, limit: 100, camperId: camper._id, from: today, to: end, status: ['PENDING', 'CONFIRMED', 'ACTIVE'], sort: 'start_asc' })
  const days = Array.from({ length: AVAILABILITY_DAYS }, (_, i) => addDays(today, i))
  const bookingFor = (day: string) => data?.items.find((booking) => booking.startDate.slice(0, 10) <= day && day < booking.endDate.slice(0, 10))
  const bookedNights = days.filter((day) => bookingFor(day)).length

  return (
    <Card>
      <CardHeader
        title="Availability"
        description={`Next ${AVAILABILITY_DAYS} days · ${pluralize(bookedNights, 'night')} reserved`}
        action={<Link to={`/bookings/calendar`} className="text-[13px] font-medium text-accent-ink hover:underline">Calendar</Link>}
      />
      <div className="px-5 pb-5">
        {camper.status !== 'AVAILABLE' && (
          <p className="mb-3 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
            {CAMPER_STATUS_META[camper.status].label}: not bookable by customers until set to available.
          </p>
        )}
        {isLoading ? (
          <Skeleton className="h-16" />
        ) : (
          <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1 sm:grid-cols-[repeat(30,minmax(0,1fr))]">
            {days.map((day) => {
              const booking = bookingFor(day)
              const tone = booking ? BOOKING_STATUS_META[booking.status].tone : null
              const content = (
                <span
                  className={cn(
                    'flex aspect-square items-center justify-center rounded-[5px] text-[10px] tabular',
                    !booking && 'bg-muted text-fg-3',
                    tone === 'warning' && 'bg-warning-soft text-warning ring-1 ring-warning/40 ring-inset',
                    tone === 'info' && 'bg-info text-white dark:text-[#0b1424]',
                    tone === 'accent' && 'bg-accent text-on-accent',
                    day === today && 'outline outline-2 outline-offset-1 outline-accent',
                  )}
                >
                  {Number(day.slice(8))}
                </span>
              )
              const label = `${formatDate(day)}: ${booking ? `${booking.bookingNumber} (${BOOKING_STATUS_META[booking.status].label})` : 'free'}`
              return booking ? (
                <Link key={day} to={`/bookings/${booking._id}`} title={label} aria-label={label}>
                  {content}
                </Link>
              ) : (
                <span key={day} title={label}>
                  {content}
                </span>
              )
            })}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-fg-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-muted ring-1 ring-line" /> Free
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-warning-soft ring-1 ring-warning/40" /> Held (pending payment)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-info" /> Confirmed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-accent" /> On the road
          </span>
        </div>
      </div>
    </Card>
  )
}

const historyColumns: Column<Booking>[] = [
  {
    key: 'number',
    header: 'Booking',
    cell: (booking) => (
      <Link to={`/bookings/${booking._id}`} className="font-medium text-fg tabular hover:underline">
        {booking.bookingNumber}
      </Link>
    ),
  },
  { key: 'customer', header: 'Customer', cell: (booking) => <span className="text-fg-2">{fullName(booking.customer)}</span> },
  {
    key: 'dates',
    header: 'Dates',
    cell: (booking) => (
      <span className="whitespace-nowrap text-fg-2 tabular">
        {formatDate(booking.startDate)} → {formatDate(booking.endDate)}
      </span>
    ),
  },
  { key: 'total', header: 'Total', align: 'right', cell: (booking) => formatMoney(booking.price.total) },
  { key: 'status', header: 'Status', cell: (booking) => <BookingStatusBadge status={booking.status} /> },
]

function BookingHistory({ camperId }: { camperId: string }) {
  const [page, setPage] = useState(1)
  const { data, error, isLoading, isFetching, refetch } = useBookingsQuery({ page, limit: 8, camperId, sort: 'start_desc' })
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Booking history"
        description={data ? pluralize(data.meta.total, 'booking') : undefined}
        action={
          <Link to={`/bookings?camperId=${camperId}`} className="text-[13px] font-medium text-accent-ink hover:underline">
            Open in bookings
          </Link>
        }
      />
      <DataTable
        caption="Booking history"
        columns={historyColumns}
        rows={data?.items}
        rowKey={(booking) => booking._id}
        rowHref={(booking) => `/bookings/${booking._id}`}
        loading={isLoading}
        fetching={isFetching}
        error={error}
        onRetry={refetch}
        skeletonRows={4}
        empty={<EmptyState compact title="No bookings yet" description="This camper has not been booked." />}
      />
      <Pagination meta={data?.meta} onPageChange={setPage} label="bookings" />
    </Card>
  )
}
