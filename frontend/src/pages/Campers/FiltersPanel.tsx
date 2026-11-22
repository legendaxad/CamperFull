import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Button } from '@/components/common/Button'
import { Skeleton } from '@/components/common/Feedback'
import { Checkbox } from '@/components/forms/FormField'
import { EMPTY_FILTERS, TRAVELER_OPTIONS, type CamperFilters } from '@/features/campers/camperFilters'
import { selectFeatures, selectFilterOptions } from '@/features/campers/camperSelectors'
import { fetchFeatures, fetchFilterOptions } from '@/features/campers/camperSlice'
import { addDaysISO, todayISO } from '@/utils/dates'
import { LICENSE_LABELS } from '@/utils/camper'
import { cn } from '@/utils/cn'

function FilterGroup({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <fieldset className="border-b border-line pb-5">
      <legend className="w-full">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-center justify-between py-3 text-left text-base font-semibold text-ink"
        >
          {title}
          <ChevronDown className={cn('size-5 transition', open && 'rotate-180')} aria-hidden />
        </button>
      </legend>
      <div id={id} hidden={!open} className="space-y-3 pt-2">
        {children}
      </div>
    </fieldset>
  )
}

function toggle<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value]
}

const parseAmount = (raw: string) => (raw.trim() === '' || !/^\d+$/.test(raw.trim()) ? null : Number(raw))
const inputClass = 'mt-1 h-9 w-full rounded-[10px] border border-[#c4c4c4] bg-white px-3 text-sm focus:border-brand focus:outline-none'

interface FiltersPanelProps {
  value: CamperFilters
  onApply: (filters: CamperFilters) => void
}

/**
 * Sidebar filters (Figma "Group 714": cost, brand, company, license type, travellers,
 * location). Options come from GET /campers/filters and GET /features. Changes are staged
 * locally and applied with "Search", matching the Figma Cancel / Search buttons.
 */
export function FiltersPanel({ value, onApply }: FiltersPanelProps) {
  const dispatch = useAppDispatch()
  const options = useAppSelector(selectFilterOptions)
  const features = useAppSelector(selectFeatures)
  const [draft, setDraft] = useState<CamperFilters>(value)
  const [priceText, setPriceText] = useState({ min: value.minPrice?.toString() ?? '', max: value.maxPrice?.toString() ?? '' })

  useEffect(() => {
    void dispatch(fetchFilterOptions())
    void dispatch(fetchFeatures())
  }, [dispatch])

  const update = <K extends keyof CamperFilters>(key: K, next: CamperFilters[K]) => setDraft((d) => ({ ...d, [key]: next }))

  const priceError =
    draft.minPrice != null && draft.maxPrice != null && draft.minPrice > draft.maxPrice ? '“From” must be lower than “to”.' : null
  const dateError =
    (draft.startDate && !draft.endDate) || (!draft.startDate && draft.endDate)
      ? 'Choose both dates.'
      : draft.startDate && draft.endDate && draft.endDate <= draft.startDate
        ? 'Return must be after pickup.'
        : null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!priceError && !dateError) onApply(draft)
  }

  const reset = () => {
    setDraft(EMPTY_FILTERS)
    setPriceText({ min: '', max: '' })
    onApply(EMPTY_FILTERS)
  }

  const facets = options.data
  const loadingFacets = options.status === 'loading' || options.status === 'idle'

  const checkboxList = (key: 'brand' | 'company' | 'region', values: string[]) =>
    loadingFacets ? (
      <Skeleton className="h-16 w-full" />
    ) : values.length === 0 ? (
      <p className="text-xs text-muted">No options yet.</p>
    ) : (
      values.map((v) => <Checkbox key={v} label={v} checked={draft[key].includes(v)} onChange={() => update(key, toggle(draft[key], v))} />)
    )

  return (
    <form onSubmit={submit} aria-label="Filter campers" className="flex flex-col">
      <div className="border-b border-line pb-5">
        <label htmlFor="filter-q" className="block py-3 text-base font-semibold">
          Search
        </label>
        <input
          id="filter-q"
          type="search"
          value={draft.search}
          maxLength={100}
          onChange={(e) => update('search', e.target.value)}
          placeholder="Name, brand, region"
          className="field-input bg-white ring-1 ring-[#c4c4c4]"
        />
      </div>

      <FilterGroup title="Cost of car (per day)">
        <div className="grid grid-cols-2 gap-4">
          {(['min', 'max'] as const).map((key) => (
            <label key={key} className="text-xs text-ink">
              {key === 'min' ? 'from' : 'to'}
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={10000}
                value={priceText[key]}
                placeholder={key === 'max' && facets ? String(facets.priceRange.max) : '0'}
                onChange={(e) => {
                  setPriceText((p) => ({ ...p, [key]: e.target.value }))
                  update(key === 'min' ? 'minPrice' : 'maxPrice', parseAmount(e.target.value))
                }}
                aria-invalid={priceError ? true : undefined}
                className={inputClass}
              />
            </label>
          ))}
        </div>
        {priceError && <p role="alert" className="text-xs text-danger">{priceError}</p>}
      </FilterGroup>

      <FilterGroup title="Available dates" defaultOpen={Boolean(value.startDate)}>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs">
            Pickup
            <input type="date" min={todayISO()} value={draft.startDate ?? ''} onChange={(e) => update('startDate', e.target.value || null)} className={inputClass} />
          </label>
          <label className="text-xs">
            Return
            <input
              type="date"
              min={addDaysISO(draft.startDate ?? todayISO(), 1)}
              value={draft.endDate ?? ''}
              onChange={(e) => update('endDate', e.target.value || null)}
              className={inputClass}
            />
          </label>
        </div>
        {dateError && <p role="alert" className="text-xs text-danger">{dateError}</p>}
      </FilterGroup>

      <FilterGroup title="Brand">{checkboxList('brand', facets?.brands ?? [])}</FilterGroup>
      <FilterGroup title="Company">{checkboxList('company', facets?.companies ?? [])}</FilterGroup>

      <FilterGroup title="License type">
        {loadingFacets ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          (facets?.licenseTypes ?? []).map((type) => (
            <Checkbox key={type} label={LICENSE_LABELS[type]} checked={draft.licenseType.includes(type)} onChange={() => update('licenseType', toggle(draft.licenseType, type))} />
          ))
        )}
      </FilterGroup>

      <FilterGroup title="Number of travelers">
        {TRAVELER_OPTIONS.filter((o) => !facets || o.minSeats <= facets.maxSeats).map((option) => (
          <label key={option.label} className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="radio"
              name="travelers"
              className="size-[18px] accent-brand"
              checked={draft.minSeats === option.minSeats}
              onChange={() => update('minSeats', option.minSeats)}
            />
            {option.label}
          </label>
        ))}
        {draft.minSeats && (
          <button type="button" className="text-xs font-semibold text-brand hover:underline" onClick={() => update('minSeats', null)}>
            Any number
          </button>
        )}
      </FilterGroup>

      <FilterGroup title="Location">{checkboxList('region', facets?.regions ?? [])}</FilterGroup>

      <FilterGroup title="Equipment" defaultOpen={value.features.length > 0}>
        {features.status !== 'succeeded' ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          features.data.map((feature) => (
            <Checkbox
              key={feature._id}
              label={feature.name}
              checked={draft.features.includes(feature._id)}
              onChange={() => update('features', toggle(draft.features, feature._id))}
            />
          ))
        )}
      </FilterGroup>

      {options.status === 'failed' && <p className="mt-3 text-xs text-danger">Some filter options could not be loaded.</p>}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="accent" onClick={reset} className="rounded-full">
          Cancel
        </Button>
        <Button type="submit" className="rounded-full" disabled={Boolean(priceError || dateError)}>
          Search
        </Button>
      </div>
    </form>
  )
}
