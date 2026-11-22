import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Button } from '@/components/common/Button'
import { AvatarPicker } from '@/components/forms/AvatarPicker'
import { FormField, TextInput } from '@/components/forms/FormField'
import { ROUTES } from '@/constants/navigation'
import { normalizePhone, registerSchema, type RegisterValues } from '@/features/auth/authSchemas'
import { clearAuthError, registerUser, selectAuthError, selectAuthPending } from '@/features/auth/authSlice'
import { showToast } from '@/features/ui/uiSlice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { applyServerFieldErrors } from '@/hooks/useServerFieldErrors'
import type { RedirectState } from '@/routes/ProtectedRoute'
import { AuthCard } from './AuthCard'

const FIELDS = ['firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword'] as const

export default function RegisterPage() {
  useDocumentTitle('Create account')
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const pending = useAppSelector(selectAuthPending)
  const authError = useAppSelector(selectAuthError)
  const [avatar, setAvatar] = useState<File | null>(null)
  const from = (location.state as RedirectState | null)?.from ?? ROUTES.home

  const { register, handleSubmit, watch, setError, formState: { errors } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' },
  })

  useEffect(() => {
    dispatch(clearAuthError())
  }, [dispatch])

  const onSubmit = async ({ phone, ...values }: RegisterValues) => {
    const result = await dispatch(registerUser({ ...values, phone: phone ? normalizePhone(phone) : undefined, avatar }))
    if (registerUser.fulfilled.match(result)) {
      dispatch(showToast(`Welcome to FullCamper, ${result.payload.member.firstName}!`))
      if (result.payload.avatarError) {
        dispatch(showToast(`Your account is ready, but the profile photo was not saved: ${result.payload.avatarError}`, 'info'))
      }
      navigate(from, { replace: true })
    } else if (result.payload) {
      applyServerFieldErrors(result.payload.fieldErrors, FIELDS, setError)
    }
  }

  const displayName = `${watch('firstName')} ${watch('lastName')}`.trim()

  return (
    <AuthCard title="Registrate" closable>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="px-1">
          <p className="mb-2 text-sm font-medium">
            Profile image <span className="text-xs font-normal text-muted">(optional)</span>
          </p>
          <AvatarPicker name={displayName} file={avatar} onChange={setAvatar} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First name" error={errors.firstName?.message}>
            <TextInput autoComplete="given-name" placeholder="First name" {...register('firstName')} />
          </FormField>
          <FormField label="Last name" error={errors.lastName?.message}>
            <TextInput autoComplete="family-name" placeholder="Last name" {...register('lastName')} />
          </FormField>
        </div>
        <FormField label="Email" error={errors.email?.message}>
          <TextInput type="email" autoComplete="email" placeholder="Your email" {...register('email')} />
        </FormField>
        <FormField label="Mobile phone" optional error={errors.phone?.message}>
          <TextInput type="tel" autoComplete="tel" placeholder="010-1234-5678" {...register('phone')} />
        </FormField>
        <FormField label="Password" error={errors.password?.message} hint="At least 8 characters with a letter and a number.">
          <TextInput type="password" autoComplete="new-password" placeholder="Your password" {...register('password')} />
        </FormField>
        <FormField label="Repeat your password" error={errors.confirmPassword?.message}>
          <TextInput type="password" autoComplete="new-password" placeholder="Your password" {...register('confirmPassword')} />
        </FormField>
        {authError && (
          <p role="alert" className="rounded-xl bg-[#fff6f6] px-3 py-2 text-sm font-medium text-danger">
            {authError}
          </p>
        )}
        <Button type="submit" block loading={pending} className="uppercase">
          Registrate
        </Button>
      </form>
      <p className="mt-5 text-center text-sm">
        Already have an account?{' '}
        <Link to={ROUTES.signIn} state={location.state} className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}
