import { zodResolver } from '@hookform/resolvers/zod'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Tabs } from '@/components/ui/Segmented'
import { useToast } from '@/components/ui/toastContext'
import { useCurrentAdmin } from '@/features/auth/useCurrentAdmin'
import { useTheme } from '@/features/theme/themeContext'
import { describeError, fieldErrorMap } from '@/services/errors'
import { useChangePasswordMutation, useSettingsQuery, useUpdateProfileMutation, useUpdateSettingsMutation } from '@/services/endpoints'
import type { BusinessSettings } from '@/types/api'
import { cn } from '@/utils/cn'
import { formatDateTime } from '@/utils/format'

type TabId = 'business' | 'profile' | 'appearance'
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab')
  const tab: TabId = tabParam === 'profile' || tabParam === 'appearance' ? tabParam : 'business'

  return (
    <>
      <PageHeader title="Settings" breadcrumbs={[{ label: 'System' }, { label: 'Settings' }]} />
      <div className="mb-6 border-b border-line">
        <Tabs
          label="Settings sections"
          value={tab}
          onChange={(value) => setParams(value === 'business' ? {} : { tab: value }, { replace: true })}
          tabs={[
            { value: 'business', label: 'Business & booking rules' },
            { value: 'profile', label: 'Profile & password' },
            { value: 'appearance', label: 'Appearance' },
          ]}
        />
      </div>
      {tab === 'business' && <BusinessSettingsSection />}
      {tab === 'profile' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ProfileSection />
          <PasswordSection />
        </div>
      )}
      {tab === 'appearance' && <AppearanceSection />}
    </>
  )
}

/* ---------- Business settings ---------- */

const int = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, `${label} must be a whole number`)
    .refine((value) => Number(value) >= min && Number(value) <= max, `${label} must be between ${min} and ${max}`)

const businessSchema = z.object({
  businessName: z.string().trim().min(1, 'Required').max(120),
  contactEmail: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]),
  contactPhone: z.union([z.literal(''), z.string().trim().regex(/^\+?[\d\s\-().]{8,20}$/, 'Enter a valid phone number')]),
  address: z.string().trim().max(300),
  bookingHoldMinutes: int('Payment hold', 5, 1440),
  freeCancellationDays: int('Free cancellation', 0, 60),
  minLeadDays: int('Minimum lead time', 0, 60),
  maxAdvanceDays: int('Booking window', 1, 730),
  pickupTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM'),
  returnTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM'),
  weekendNights: z.array(z.number().int().min(0).max(6)),
})
type BusinessValues = z.infer<typeof businessSchema>

function toBusinessValues(settings: BusinessSettings): BusinessValues {
  return {
    businessName: settings.businessName,
    contactEmail: settings.contactEmail ?? '',
    contactPhone: settings.contactPhone ?? '',
    address: settings.address ?? '',
    bookingHoldMinutes: String(settings.bookingHoldMinutes),
    freeCancellationDays: String(settings.freeCancellationDays),
    minLeadDays: String(settings.minLeadDays),
    maxAdvanceDays: String(settings.maxAdvanceDays),
    pickupTime: settings.pickupTime,
    returnTime: settings.returnTime,
    weekendNights: settings.weekendNights,
  }
}

function BusinessSettingsSection() {
  const { data, error, isLoading, refetch } = useSettingsQuery()
  if (isLoading) return <Skeleton className="h-[480px]" />
  if (error || !data) return <Card><ErrorState error={error} onRetry={refetch} /></Card>
  return <BusinessForm settings={data} />
}

function BusinessForm({ settings }: { settings: BusinessSettings }) {
  const toast = useToast()
  const [update, { isLoading }] = useUpdateSettingsMutation()
  const { register, handleSubmit, formState, watch, setValue, reset } = useForm<BusinessValues>({ resolver: zodResolver(businessSchema), defaultValues: toBusinessValues(settings) })
  const errors = formState.errors
  const weekendNights = watch('weekendNights')

  const onSubmit = handleSubmit(async (values) => {
    // Only send what changed; empty optional contact fields are left as they are (the API cannot clear them).
    const body: Record<string, unknown> = {}
    const original = toBusinessValues(settings)
    for (const key of Object.keys(values) as (keyof BusinessValues)[]) {
      if (JSON.stringify(values[key]) === JSON.stringify(original[key])) continue
      const value = values[key]
      if (typeof value === 'string' && /^\d+$/.test(value) && ['bookingHoldMinutes', 'freeCancellationDays', 'minLeadDays', 'maxAdvanceDays'].includes(key)) body[key] = Number(value)
      else if (typeof value === 'string' && value.trim() === '' && ['contactEmail', 'contactPhone'].includes(key)) continue
      else body[key] = typeof value === 'string' ? value.trim() : value
    }
    if (Object.keys(body).length === 0) return toast.info('Nothing to save.')
    try {
      const saved = await update(body).unwrap()
      reset(toBusinessValues(saved))
      toast.success('Settings saved. They apply to new bookings.')
    } catch (err) {
      const fields = fieldErrorMap(err)
      toast.error(Object.values(fields)[0] ?? describeError(err))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader title="Business details" description="Shown to customers on the website" />
        <div className="flex flex-col gap-4 px-5 pb-5">
          <Field label="Business name" required error={errors.businessName?.message}>
            {(id) => <Input id={id} invalid={Boolean(errors.businessName)} {...register('businessName')} />}
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Contact email" error={errors.contactEmail?.message}>
              {(id) => <Input id={id} type="email" invalid={Boolean(errors.contactEmail)} {...register('contactEmail')} />}
            </Field>
            <Field label="Contact phone" error={errors.contactPhone?.message}>
              {(id) => <Input id={id} type="tel" invalid={Boolean(errors.contactPhone)} {...register('contactPhone')} />}
            </Field>
          </div>
          <Field label="Address" error={errors.address?.message}>
            {(id) => <Input id={id} {...register('address')} />}
          </Field>
          <p className="text-xs text-fg-3">Currency: {settings.currency} · Last updated {formatDateTime(settings.updatedAt)}</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Booking rules" description="Enforced by the server on every new booking" />
        <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
          <Field label="Payment hold (minutes)" error={errors.bookingHoldMinutes?.message} hint="How long a pending booking keeps its dates">
            {(id) => <Input id={id} inputMode="numeric" invalid={Boolean(errors.bookingHoldMinutes)} {...register('bookingHoldMinutes')} />}
          </Field>
          <Field label="Free cancellation (days before pickup)" error={errors.freeCancellationDays?.message}>
            {(id) => <Input id={id} inputMode="numeric" invalid={Boolean(errors.freeCancellationDays)} {...register('freeCancellationDays')} />}
          </Field>
          <Field label="Minimum lead time (days)" error={errors.minLeadDays?.message} hint="Earliest pickup = today + this">
            {(id) => <Input id={id} inputMode="numeric" invalid={Boolean(errors.minLeadDays)} {...register('minLeadDays')} />}
          </Field>
          <Field label="Booking window (days ahead)" error={errors.maxAdvanceDays?.message}>
            {(id) => <Input id={id} inputMode="numeric" invalid={Boolean(errors.maxAdvanceDays)} {...register('maxAdvanceDays')} />}
          </Field>
          <Field label="Pickup time" error={errors.pickupTime?.message}>
            {(id) => <Input id={id} type="time" invalid={Boolean(errors.pickupTime)} {...register('pickupTime')} />}
          </Field>
          <Field label="Return time" error={errors.returnTime?.message}>
            {(id) => <Input id={id} type="time" invalid={Boolean(errors.returnTime)} {...register('returnTime')} />}
          </Field>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-[13px] font-medium text-fg-2">Weekend-rate nights</legend>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day, index) => {
                const active = weekendNights.includes(index)
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setValue('weekendNights', active ? weekendNights.filter((d) => d !== index) : [...weekendNights, index].sort(), { shouldDirty: true })}
                    className={cn(
                      'h-8 w-12 rounded-lg border text-xs font-medium transition-colors',
                      active ? 'border-accent/50 bg-accent-soft text-accent-ink' : 'border-line text-fg-3 hover:border-line-strong hover:text-fg',
                    )}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 text-xs text-fg-3">Nights starting on these days use the camper's weekend rate.</p>
          </fieldset>
        </div>
      </Card>
      <div className="flex justify-end gap-2 xl:col-span-2">
        <Button variant="ghost" disabled={!formState.isDirty || isLoading} onClick={() => reset(toBusinessValues(settings))}>
          Discard
        </Button>
        <Button type="submit" variant="primary" loading={isLoading} disabled={!formState.isDirty}>
          Save settings
        </Button>
      </div>
    </form>
  )
}

/* ---------- Profile & password ---------- */

const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'Required').max(60),
  lastName: z.string().trim().min(1, 'Required').max(60),
  phone: z.union([z.literal(''), z.string().trim().regex(/^\+?[\d\s\-().]{8,20}$/, 'Enter a valid phone number')]),
})

function ProfileSection() {
  const admin = useCurrentAdmin()
  const toast = useToast()
  const [update, { isLoading }] = useUpdateProfileMutation()
  const { register, handleSubmit, formState, reset } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: admin.firstName, lastName: admin.lastName, phone: admin.phone ?? '' },
  })
  const errors = formState.errors

  return (
    <Card>
      <CardHeader title="Profile" description={`${admin.email} · ${admin.role === 'SUPER_ADMIN' ? 'Super administrator' : 'Administrator'}`} />
      <form
        noValidate
        className="flex flex-col gap-4 px-5 pb-5"
        onSubmit={handleSubmit(async (values) => {
          try {
            const result = await update({ firstName: values.firstName, lastName: values.lastName, phone: values.phone ? values.phone : null }).unwrap()
            reset({ firstName: result.member.firstName, lastName: result.member.lastName, phone: result.member.phone ?? '' })
            toast.success('Profile updated.')
          } catch (err) {
            toast.error(describeError(err))
          }
        })}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" required error={errors.firstName?.message}>
            {(id) => <Input id={id} autoComplete="given-name" invalid={Boolean(errors.firstName)} {...register('firstName')} />}
          </Field>
          <Field label="Last name" required error={errors.lastName?.message}>
            {(id) => <Input id={id} autoComplete="family-name" invalid={Boolean(errors.lastName)} {...register('lastName')} />}
          </Field>
        </div>
        <Field label="Phone" error={errors.phone?.message} hint="Leave empty to remove">
          {(id) => <Input id={id} type="tel" autoComplete="tel" invalid={Boolean(errors.phone)} {...register('phone')} />}
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={isLoading} disabled={!formState.isDirty}>
            Save profile
          </Button>
        </div>
      </form>
    </Card>
  )
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .refine((value) => new TextEncoder().encode(value).length <= 72, 'Password is too long')
      .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), 'Include a letter and a number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
  .refine((data) => data.newPassword !== data.currentPassword, { path: ['newPassword'], message: 'Choose a different password' })

function PasswordSection() {
  const toast = useToast()
  const [change, { isLoading }] = useChangePasswordMutation()
  const { register, handleSubmit, formState, reset, setError } = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const errors = formState.errors

  return (
    <Card>
      <CardHeader title="Password" description="Changing it signs out your other sessions." />
      <form
        noValidate
        className="flex flex-col gap-4 px-5 pb-5"
        onSubmit={handleSubmit(async (values) => {
          try {
            await change({ currentPassword: values.currentPassword, newPassword: values.newPassword }).unwrap()
            reset()
            toast.success('Password changed.')
          } catch (err) {
            const fields = fieldErrorMap(err)
            if (fields.currentPassword || /current password/i.test(describeError(err))) setError('currentPassword', { message: fields.currentPassword ?? describeError(err) })
            else toast.error(fields.newPassword ?? describeError(err))
          }
        })}
      >
        <Field label="Current password" required error={errors.currentPassword?.message}>
          {(id) => <Input id={id} type="password" autoComplete="current-password" invalid={Boolean(errors.currentPassword)} {...register('currentPassword')} />}
        </Field>
        <Field label="New password" required error={errors.newPassword?.message} hint="At least 8 characters with a letter and a number">
          {(id, describedBy) => <Input id={id} aria-describedby={describedBy} type="password" autoComplete="new-password" invalid={Boolean(errors.newPassword)} {...register('newPassword')} />}
        </Field>
        <Field label="Confirm new password" required error={errors.confirmPassword?.message}>
          {(id) => <Input id={id} type="password" autoComplete="new-password" invalid={Boolean(errors.confirmPassword)} {...register('confirmPassword')} />}
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={isLoading}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  )
}

/* ---------- Appearance ---------- */

function AppearanceSection() {
  const { theme, preference, setTheme, followSystem } = useTheme()
  const options = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Warm white surfaces' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Deep navy surfaces' },
    { value: 'system', label: 'System', icon: Monitor, description: 'Follow your device setting' },
  ] as const

  return (
    <Card className="max-w-3xl">
      <CardHeader title="Theme" description={`Currently ${theme}. Saved in this browser.`} />
      <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
        {options.map((option) => {
          const active = preference === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => (option.value === 'system' ? followSystem() : setTheme(option.value))}
              className={cn(
                'flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-[border-color,background-color]',
                active ? 'border-accent bg-accent-soft/50 ring-2 ring-accent/20' : 'border-line hover:border-line-strong',
              )}
            >
              <option.icon className={cn('h-5 w-5', active ? 'text-accent-ink' : 'text-fg-3')} aria-hidden />
              <span>
                <span className="block text-sm font-medium text-fg">{option.label}</span>
                <span className="block text-xs text-fg-3">{option.description}</span>
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
