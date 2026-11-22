import { Caravan, Eye, EyeOff, FileClock, PencilLine, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Button, ButtonLink } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Badge, EmptyState } from '@/components/common/Feedback'
import { CATEGORY_LABELS } from '@/constants/camper'
import { LocalOnlyNotice } from '@/components/publishing/LocalListing'
import { localCover } from '@/utils/localListing'
import { ROUTES } from '@/constants/navigation'
import { selectCurrentUser } from '@/features/auth/authSlice'
import { selectMyDrafts, selectMyLocalListings, selectSession } from '@/features/publishing/publishingSelectors'
import {
  deleteDraft,
  deleteListing,
  resumeDraft,
  setListingStatus,
  startEditingListing,
  startNewListing,
} from '@/features/publishing/publishingSlice'
import type { WizardSession } from '@/features/publishing/publishingTypes'
import { showToast } from '@/features/ui/uiSlice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import type { CamperListing } from '@/types/camper'
import { cn } from '@/utils/cn'
import { formatDate, formatPrice } from '@/utils/format'
import { WIZARD_STEPS } from '../Publishing/wizardConfig'

type Tab = 'published' | 'drafts'
type PendingDelete = { kind: 'listing'; listing: CamperListing } | { kind: 'draft'; draft: WizardSession }

function ListingRow({ listing, onDelete }: { listing: CamperListing; onDelete: () => void }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const live = listing.status === 'published'

  const edit = () => {
    dispatch(startEditingListing(listing))
    navigate(ROUTES.publish)
  }
  const toggleStatus = () => {
    dispatch(setListingStatus({ id: listing.id, status: live ? 'unlisted' : 'published' }))
    dispatch(showToast(live ? `${listing.basics.title} is paused` : `${listing.basics.title} is active again`, 'info'))
  }

  return (
    <li className="flex animate-fade-in flex-col gap-4 rounded-[20px] bg-white p-4 shadow-card sm:flex-row sm:items-center">
      <div className="h-40 w-full shrink-0 overflow-hidden rounded-[20px] bg-surface sm:h-[120px] sm:w-[200px]">
        {localCover(listing) && <img src={localCover(listing)} alt="" className="size-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={live ? 'success' : 'muted'}>{live ? 'Ready' : 'Paused'}</Badge>
          <span className="text-xs text-muted">{CATEGORY_LABELS[listing.basics.category].plural}</span>
        </div>
        <h3 className="mt-2 truncate text-lg font-semibold">
          {listing.basics.title}
        </h3>
        <p className="text-xs text-muted">
          {listing.location.city} · {listing.photos.length} photos · updated {formatDate(listing.updatedAt)}
        </p>
        <p className="mt-2 text-xl font-bold text-brand">
          {formatPrice(listing.pricing.dailyPrice)} <span className="text-xs font-medium text-muted">/ day</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch lg:flex-row lg:items-center">
        <Button size="sm" variant="outline" onClick={edit} icon={<PencilLine className="size-4" aria-hidden />}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={toggleStatus} icon={live ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}>
          {live ? 'Pause' : 'Activate'}
        </Button>
        <Button size="sm" variant="ghost" className="text-danger" onClick={onDelete} icon={<Trash2 className="size-4" aria-hidden />} aria-label={`Delete ${listing.basics.title}`}>
          Delete
        </Button>
      </div>
    </li>
  )
}

function DraftRow({ draft, onDelete }: { draft: WizardSession; onDelete: () => void }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const cover = draft.data.photos.find((p) => p.isCover) ?? draft.data.photos[0]
  const step = WIZARD_STEPS[draft.furthestStep] ?? WIZARD_STEPS[0]!
  const progress = Math.round(((draft.furthestStep + 1) / WIZARD_STEPS.length) * 100)

  const resume = () => {
    dispatch(resumeDraft(draft.id))
    navigate(ROUTES.publish)
  }

  return (
    <li className="flex animate-fade-in flex-col gap-4 rounded-[20px] bg-white p-4 shadow-card sm:flex-row sm:items-center">
      <div className="flex h-40 w-full shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-surface sm:h-[120px] sm:w-[200px]">
        {cover ? <img src={cover.src} alt="" className="size-full object-cover" /> : <FileClock className="size-9 text-muted" aria-hidden />}
      </div>
      <div className="min-w-0 flex-1">
        <Badge tone="brand">{draft.editingListingId ? 'Unsaved edits' : 'Draft'}</Badge>
        <h3 className="mt-2 truncate text-lg font-semibold">{draft.data.basics.title || 'Untitled camper'}</h3>
        <p className="text-xs text-muted">Last edited {formatDate(draft.updatedAt)} · reached “{step.short}”</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface sm:max-w-56">
            <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-semibold text-brand">{progress}%</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={resume} icon={<PencilLine className="size-4" aria-hidden />}>Continue</Button>
        <Button size="sm" variant="ghost" className="text-danger" onClick={onDelete} icon={<Trash2 className="size-4" aria-hidden />}>Delete</Button>
      </div>
    </li>
  )
}

export default function MyCampersPage() {
  useDocumentTitle('My campers')
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector(selectCurrentUser)!
  const listings = useAppSelector(selectMyLocalListings)
  const drafts = useAppSelector(selectMyDrafts)
  const session = useAppSelector(selectSession)
  const [tab, setTab] = useState<Tab>('published')
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const openSession = session && session.ownerId === user._id && !session.editingListingId ? session : null

  const createNew = () => {
    dispatch(startNewListing(user._id))
    navigate(ROUTES.publish)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    if (pendingDelete.kind === 'draft') {
      dispatch(deleteDraft(pendingDelete.draft.id))
      dispatch(showToast('Draft deleted', 'info'))
    } else {
      dispatch(deleteListing(pendingDelete.listing.id))
      dispatch(showToast(`${pendingDelete.listing.basics.title} was deleted`, 'info'))
    }
    setPendingDelete(null)
  }

  const live = listings.filter((l) => l.status === 'published').length
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'published', label: 'Listings', count: listings.length },
    { id: 'drafts', label: 'Drafts', count: drafts.length },
  ]

  return (
    <div className="container-page py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">My campers</h1>
          <p className="mt-4 text-sm text-muted">{live} ready · {listings.length - live} paused · {drafts.length} drafts</p>
        </div>
        <Button variant="accent" onClick={createNew} icon={<Plus className="size-4" aria-hidden />}>
          New listing
        </Button>
      </div>

      <LocalOnlyNotice className="mt-6" />

      {openSession && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-brand-soft p-4">
          <p className="text-sm">
            You have a listing in progress: <strong>{openSession.data.basics.title || 'Untitled camper'}</strong>
          </p>
          <ButtonLink to={ROUTES.publish} size="sm">Continue editing</ButtonLink>
        </div>
      )}

      <div role="tablist" aria-label="Listing type" className="mt-8 inline-flex rounded-[12px] bg-white p-1 shadow-card">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn('rounded-[10px] px-5 py-2 text-sm font-semibold transition', tab === t.id ? 'bg-brand text-white' : 'text-muted hover:text-ink')}
          >
            {t.label} <span className="opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-6">
        {tab === 'published' ? (
          listings.length === 0 ? (
            <EmptyState
              icon={Caravan}
              title="You haven't published a camper yet"
              description="List your camper in seven guided steps and start earning from your trips."
              action={<Button variant="accent" onClick={createNew}>List your camper</Button>}
            />
          ) : (
            <ul className="space-y-4">
              {listings.map((listing) => (
                <ListingRow key={listing.id} listing={listing} onDelete={() => setPendingDelete({ kind: 'listing', listing })} />
              ))}
            </ul>
          )
        ) : drafts.length === 0 ? (
          <EmptyState icon={FileClock} title="No drafts" description="Use “Save draft” in the listing wizard to finish a listing later." />
        ) : (
          <ul className="space-y-4">
            {drafts.map((draft) => (
              <DraftRow key={draft.id} draft={draft} onDelete={() => setPendingDelete({ kind: 'draft', draft })} />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete?.kind === 'draft' ? 'Delete this draft?' : 'Delete this camper?'}
        description={
          pendingDelete?.kind === 'listing'
            ? `“${pendingDelete.listing.basics.title}” will be permanently removed from this device. This cannot be undone.`
            : 'The draft and its photos will be permanently removed.'
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
