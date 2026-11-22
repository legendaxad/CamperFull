import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Mail, MapPin, MessageSquare, Phone, Star } from 'lucide-react'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Rating } from '@/components/camper/Rating'
import { Avatar } from '@/components/common/Avatar'
import { Button } from '@/components/common/Button'
import { ErrorState } from '@/components/common/Feedback'
import { TextArea, TextInput } from '@/components/forms/FormField'
import { CAMPER_FAQ } from '@/constants/editorial'
import { fullName, selectCurrentUser } from '@/features/auth/authSlice'
import { selectSettings } from '@/features/content/contentSlice'
import { showToast } from '@/features/ui/uiSlice'
import { useCamperReviews, type ReviewSort } from '@/hooks/useCamperReviews'
import { applyServerFieldErrors } from '@/hooks/useServerFieldErrors'
import { describeError, toApiError } from '@/services/api/errors'
import { inquiryApi } from '@/services/camperApi'
import type { Camper } from '@/types/api'
import { camperLocation } from '@/utils/camper'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/format'

const TABS = ['Item reviews', 'Q&A', 'FAQ', 'Contact'] as const
type Tab = (typeof TABS)[number]

function ReviewsPanel({ camper }: { camper: Camper }) {
  const [sort, setSort] = useState<ReviewSort>('newest')
  const { status, items, meta, summary, error, loadMore, retry } = useCamperReviews(camper._id, sort)

  if (status === 'failed' && !items.length) return <ErrorState message={error ?? 'Reviews could not be loaded.'} onRetry={retry} />

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          Premium Review <span className="text-brand">{summary?.count ?? camper.ratingCount}</span>
          {summary && summary.count > 0 && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-muted">
              <Star className="size-4 fill-accent text-accent" aria-hidden /> {summary.average.toFixed(1)}
            </span>
          )}
        </h3>
        <select
          aria-label="Sort reviews"
          value={sort}
          onChange={(e) => setSort(e.target.value as ReviewSort)}
          className="h-8 rounded-md border border-[#c4c4c4] bg-white px-2 text-xs"
        >
          <option value="newest">Newest</option>
          <option value="highest">Best</option>
          <option value="lowest">Lowest</option>
        </select>
      </div>

      {status === 'loading' && !items.length ? (
        <div className="mt-6 space-y-4" role="status" aria-label="Loading reviews">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-6 rounded-[20px] bg-white p-6 text-sm text-muted shadow-card">
          No reviews yet. Reviews come from customers who completed a trip with this camper.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {items.map((review) => (
            <li key={review._id} className="flex gap-4 py-5">
              <Avatar name={review.customer?.firstName ?? 'Guest'} src={review.customer?.avatar?.url ?? null} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{review.customer?.firstName ?? 'Former customer'}</p>
                  <span className="text-xs text-muted">{formatDate(review.createdAt)}</span>
                </div>
                <Rating value={review.rating} className="mt-0.5" />
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{review.comment}</p>
                {review.adminReply && (
                  <p className="mt-3 rounded-xl bg-surface p-3 text-xs leading-relaxed">
                    <strong>Reply from FullCamper:</strong> {review.adminReply}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {meta?.hasNextPage && (
        <div className="mt-4 text-center">
          <Button variant="outline" size="sm" onClick={loadMore} loading={status === 'loading'}>
            Show more reviews
          </Button>
        </div>
      )}
    </div>
  )
}

const questionSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(120),
  email: z.email('Enter a valid email'),
  message: z.string().trim().min(5, 'Your question should be at least 5 characters').max(5000),
})
type QuestionValues = z.infer<typeof questionSchema>
const QUESTION_FIELDS = ['name', 'email', 'message'] as const

/** "Send a question" form (Figma Q&A tab) -> POST /inquiries, linked to this camper. */
function QuestionsPanel({ camper }: { camper: Camper }) {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser)
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<QuestionValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: { name: user ? fullName(user) : '', email: user?.email ?? '', message: '' },
  })

  const onSubmit = async (values: QuestionValues) => {
    try {
      await inquiryApi.create({ ...values, subject: `Question about ${camper.name}`, camperId: camper._id })
      reset({ ...values, message: '' })
      setSent(true)
      dispatch(showToast('Your question was sent. We will reply by email.'))
    } catch (error) {
      if (!applyServerFieldErrors(toApiError(error).fieldErrors, QUESTION_FIELDS, setError)) {
        dispatch(showToast(describeError(error), 'error'))
      }
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-3 text-sm leading-relaxed">
        <h3 className="text-lg font-semibold">Have a question about {camper.name}?</h3>
        <p className="text-muted">
          Ask about equipment, pickup or anything else. Our team answers every question personally by email, usually within one
          business day.
        </p>
        {sent && (
          <p role="status" className="rounded-xl bg-[#e8f5e9] p-3 font-medium text-success">
            Thanks! Your question has been received.
          </p>
        )}
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="h-fit rounded-[10px] bg-white p-6 shadow-card">
        <h3 className="text-center text-xl font-semibold text-[#003049]">Send a question</h3>
        <div className="mt-5 space-y-2.5">
          <TextInput placeholder="Your name" aria-label="Your name" aria-invalid={!!errors.name} {...register('name')} />
          {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          <TextInput type="email" placeholder="Your email" aria-label="Your email" aria-invalid={!!errors.email} {...register('email')} />
          {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
          <TextArea placeholder="Your question" aria-label="Your question" aria-invalid={!!errors.message} {...register('message')} />
          {errors.message && <p className="text-xs text-danger">{errors.message.message}</p>}
        </div>
        <Button type="submit" block className="mt-5" loading={isSubmitting} icon={<MessageSquare className="size-4" aria-hidden />}>
          Send question
        </Button>
      </form>
    </div>
  )
}

function FaqPanel() {
  const settings = useAppSelector(selectSettings)
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div>
      {settings && (
        <p className="mb-4 text-sm text-muted">
          Pickup from {settings.pickupTime}, return by {settings.returnTime}. Free cancellation up to {settings.freeCancellationDays} days
          before pickup.
        </p>
      )}
      <ul className="divide-y divide-line rounded-[20px] bg-white shadow-card">
        {CAMPER_FAQ.map((item, i) => (
          <li key={item.q}>
            <button
              type="button"
              aria-expanded={open === i}
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left font-semibold"
            >
              {item.q}
              <ChevronDown className={cn('size-5 shrink-0 transition', open === i && 'rotate-180')} aria-hidden />
            </button>
            {open === i && <p className="px-6 pb-5 text-sm leading-relaxed text-muted">{item.a}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ContactPanel({ camper }: { camper: Camper }) {
  const settings = useAppSelector(selectSettings)
  const place = camperLocation(camper)
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-[20px] bg-white p-6 shadow-card">
        <p className="text-xs text-muted">Operated by</p>
        <p className="font-semibold">{camper.company ?? settings?.businessName ?? 'FullCamper'}</p>
        <div className="mt-3 space-y-1.5 text-sm">
          {settings?.contactEmail && (
            <a href={`mailto:${settings.contactEmail}`} className="flex items-center gap-1.5 font-semibold text-brand hover:underline">
              <Mail className="size-4" aria-hidden /> {settings.contactEmail}
            </a>
          )}
          {settings?.contactPhone && (
            <a href={`tel:${settings.contactPhone}`} className="flex items-center gap-1.5 font-semibold text-brand hover:underline">
              <Phone className="size-4" aria-hidden /> {settings.contactPhone}
            </a>
          )}
          {!settings?.contactEmail && !settings?.contactPhone && <p className="text-muted">Use the Q&A tab to reach us.</p>}
        </div>
      </div>
      <div className="rounded-[20px] bg-white p-6 shadow-card">
        <p className="flex items-center gap-1.5 text-xs text-muted"><MapPin className="size-3.5" aria-hidden /> Pickup location</p>
        <p className="mt-1 font-semibold">{camper.location.address ?? place}</p>
        {camper.location.address && place && <p className="text-sm">{place}</p>}
      </div>
    </div>
  )
}

/** Tab strip from Figma frames 0:605 / 0:728 ("Item reviews · Q&A · FAQ · Contact"). */
export function DetailTabs({ camper }: { camper: Camper }) {
  const [tab, setTab] = useState<Tab>('Item reviews')
  const baseId = useId()
  return (
    <section aria-label="More about this camper" className="mt-14">
      <div role="tablist" className="flex overflow-x-auto bg-brand-tint">
        <div className="container-page flex">
          {TABS.map((t) => (
            <button
              key={t}
              id={`${baseId}-${t}`}
              role="tab"
              type="button"
              aria-selected={tab === t}
              aria-controls={`${baseId}-panel`}
              onClick={() => setTab(t)}
              className={cn('shrink-0 px-5 py-3.5 text-sm font-medium transition md:px-8 md:text-base', tab === t ? 'bg-brand text-white' : 'text-ink hover:bg-white/40')}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-${tab}`} className="container-page py-8 md:py-10">
        {tab === 'Item reviews' && <ReviewsPanel camper={camper} />}
        {tab === 'Q&A' && <QuestionsPanel camper={camper} />}
        {tab === 'FAQ' && <FaqPanel />}
        {tab === 'Contact' && <ContactPanel camper={camper} />}
      </div>
    </section>
  )
}
