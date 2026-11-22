import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarCheck, Caravan, Heart, KeyRound, LogOut, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Button } from '@/components/common/Button'
import { AvatarPicker } from '@/components/forms/AvatarPicker'
import { FormField, TextInput } from '@/components/forms/FormField'
import { ROUTES } from '@/constants/navigation'
import {
  changePasswordSchema,
  normalizePhone,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from '@/features/auth/authSchemas'
import { fullName, logoutUser, selectCurrentUser, updateProfile, uploadAvatar } from '@/features/auth/authSlice'
import { selectBookingList } from '@/features/bookings/bookingSlice'
import { selectFavoriteIds } from '@/features/favorites/favoritesSlice'
import { selectMyLocalListings } from '@/features/publishing/publishingSelectors'
import { showToast } from '@/features/ui/uiSlice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { applyServerFieldErrors } from '@/hooks/useServerFieldErrors'
import { describeError, toApiError } from '@/services/api/errors'
import { authApi } from '@/services/authApi'
import type { Member } from '@/types/api'
import { formatDate } from '@/utils/format'

function Stat({ to, icon: Icon, label, value }: { to: string; icon: LucideIcon; label: string; value: number | string }) {
  return (
    <Link to={to} className="flex items-center gap-4 rounded-[20px] bg-white p-5 shadow-card transition hover:shadow-raised">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Icon className="size-6" aria-hidden /></span>
      <span>
        <span className="block text-2xl font-bold">{value}</span>
        <span className="text-sm text-muted">{label}</span>
      </span>
    </Link>
  )
}

const PROFILE_FIELDS = ['firstName', 'lastName', 'phone'] as const

/** Personal details (PATCH /members/me) and profile photo (PUT /members/me/avatar). */
function ProfileForm({ user }: { user: Member }) {
  const dispatch = useAppDispatch()
  const [avatar, setAvatar] = useState<File | null>(null)
  const { register, handleSubmit, setError, reset, formState: { errors, isDirty, isSubmitting } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user.firstName, lastName: user.lastName, phone: user.phone ?? '' },
  })

  const onSubmit = async (values: ProfileValues) => {
    if (isDirty) {
      const phone = values.phone ? normalizePhone(values.phone) : null
      const result = await dispatch(
        updateProfile({
          firstName: values.firstName,
          lastName: values.lastName,
          // Only send the phone when it changed: `null` removes it on the server.
          ...(phone !== (user.phone ?? null) ? { phone } : {}),
        }),
      )
      if (updateProfile.rejected.match(result)) {
        if (!result.payload || !applyServerFieldErrors(result.payload.fieldErrors, PROFILE_FIELDS, setError)) {
          dispatch(showToast(result.payload?.message ?? 'Profile could not be saved.', 'error'))
        }
        return
      }
      reset({ firstName: result.payload.firstName, lastName: result.payload.lastName, phone: result.payload.phone ?? '' })
    }
    if (avatar) {
      const result = await dispatch(uploadAvatar(avatar))
      if (uploadAvatar.rejected.match(result)) {
        dispatch(showToast(result.payload?.message ?? 'The photo could not be uploaded.', 'error'))
        return
      }
      setAvatar(null)
    }
    dispatch(showToast('Profile updated'))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 rounded-[20px] bg-white p-6 shadow-card md:p-8">
      <h2 className="text-xl font-semibold">Personal information</h2>
      <AvatarPicker name={fullName(user)} file={avatar} currentUrl={user.avatar?.url ?? null} onChange={setAvatar} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="First name" error={errors.firstName?.message}>
          <TextInput autoComplete="given-name" {...register('firstName')} />
        </FormField>
        <FormField label="Last name" error={errors.lastName?.message}>
          <TextInput autoComplete="family-name" {...register('lastName')} />
        </FormField>
      </div>
      <FormField label="Mobile phone" optional error={errors.phone?.message}>
        <TextInput type="tel" autoComplete="tel" placeholder="010-1234-5678" {...register('phone')} />
      </FormField>
      <FormField label="Email" hint="Contact us if you need to change your email address.">
        <TextInput value={user.email} readOnly disabled />
      </FormField>
      <Button type="submit" disabled={!isDirty && !avatar} loading={isSubmitting}>Save changes</Button>
    </form>
  )
}

/** PATCH /auth/me/password — other devices are signed out by the backend. */
function PasswordForm() {
  const dispatch = useAppDispatch()
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = async ({ currentPassword, newPassword }: ChangePasswordValues) => {
    try {
      await authApi.changePassword(currentPassword, newPassword)
      reset()
      dispatch(showToast('Password changed. Other devices have been signed out.'))
    } catch (error) {
      if (!applyServerFieldErrors(toApiError(error).fieldErrors, ['currentPassword', 'newPassword'] as const, setError)) {
        dispatch(showToast(describeError(error), 'error'))
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 rounded-[20px] bg-white p-6 shadow-card">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><KeyRound className="size-5 text-brand" aria-hidden /> Change password</h2>
      <FormField label="Current password" error={errors.currentPassword?.message}>
        <TextInput type="password" autoComplete="current-password" {...register('currentPassword')} />
      </FormField>
      <FormField label="New password" error={errors.newPassword?.message}>
        <TextInput type="password" autoComplete="new-password" {...register('newPassword')} />
      </FormField>
      <FormField label="Repeat new password" error={errors.confirmPassword?.message}>
        <TextInput type="password" autoComplete="new-password" {...register('confirmPassword')} />
      </FormField>
      <Button type="submit" variant="outline" loading={isSubmitting}>Update password</Button>
    </form>
  )
}

export default function ProfilePage() {
  useDocumentTitle('Profile')
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector(selectCurrentUser)!
  const listings = useAppSelector(selectMyLocalListings)
  const bookingTotal = useAppSelector(selectBookingList).meta?.total
  const favorites = useAppSelector(selectFavoriteIds)

  const signOut = async () => {
    await dispatch(logoutUser())
    dispatch(showToast('You have been signed out', 'info'))
    navigate(ROUTES.home)
  }

  return (
    <div className="container-page py-10 md:py-14">
      <h1 className="section-title">Profile</h1>
      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <Stat to={ROUTES.bookings} icon={CalendarCheck} label="Bookings" value={bookingTotal ?? '—'} />
        <Stat to={ROUTES.favorites} icon={Heart} label="Favorites" value={favorites.length} />
        <Stat to={ROUTES.myCampers} icon={Caravan} label="My listings" value={listings.length} />
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <ProfileForm key={user.updatedAt} user={user} />
        <aside className="space-y-6">
          <div className="rounded-[20px] bg-white p-6 shadow-card">
            <h2 className="text-lg font-semibold">Account</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Member since</dt><dd>{formatDate(user.createdAt)}</dd></div>
              {user.lastLoginAt && <div className="flex justify-between"><dt className="text-muted">Last sign-in</dt><dd>{formatDate(user.lastLoginAt)}</dd></div>}
            </dl>
            <Button variant="outline" block className="mt-6 text-danger" onClick={() => void signOut()} icon={<LogOut className="size-4" aria-hidden />}>
              Sign out
            </Button>
          </div>
          <PasswordForm />
        </aside>
      </div>
    </div>
  )
}
