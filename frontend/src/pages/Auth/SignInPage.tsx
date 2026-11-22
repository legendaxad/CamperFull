import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Button, ButtonLink } from '@/components/common/Button'
import { FormField, TextInput } from '@/components/forms/FormField'
import { ROUTES } from '@/constants/navigation'
import { signInSchema, type SignInValues } from '@/features/auth/authSchemas'
import { clearAuthError, loginUser, selectAuthError, selectAuthPending } from '@/features/auth/authSlice'
import { showToast } from '@/features/ui/uiSlice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { applyServerFieldErrors } from '@/hooks/useServerFieldErrors'
import type { RedirectState } from '@/routes/ProtectedRoute'
import { AuthCard, SocialLogin } from './AuthCard'

const FIELDS = ['email', 'password'] as const

export default function SignInPage() {
  useDocumentTitle('Sign in')
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const pending = useAppSelector(selectAuthPending)
  const authError = useAppSelector(selectAuthError)
  const from = (location.state as RedirectState | null)?.from ?? ROUTES.home

  const { register, handleSubmit, setError, formState: { errors } } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    dispatch(clearAuthError())
  }, [dispatch])

  const onSubmit = async (values: SignInValues) => {
    const result = await dispatch(loginUser(values))
    if (loginUser.fulfilled.match(result)) {
      dispatch(showToast(`Welcome back, ${result.payload.firstName}!`))
      navigate(from, { replace: true })
    } else if (result.payload) {
      applyServerFieldErrors(result.payload.fieldErrors, FIELDS, setError)
    }
  }

  return (
    <AuthCard title="Sign in">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Email" error={errors.email?.message}>
          <TextInput type="email" autoComplete="email" placeholder="Your email" {...register('email')} />
        </FormField>
        <FormField label="Password" error={errors.password?.message}>
          <TextInput type="password" autoComplete="current-password" placeholder="Your password" {...register('password')} />
        </FormField>
        <div className="flex justify-end px-1">
          <Link to={ROUTES.forgotPassword} className="text-xs text-ink hover:text-brand hover:underline">
            Forget your password ?
          </Link>
        </div>
        {authError && (
          <p role="alert" className="rounded-xl bg-[#fff6f6] px-3 py-2 text-sm font-medium text-danger">
            {authError}
          </p>
        )}
        <Button type="submit" block loading={pending} className="uppercase">
          Sign in
        </Button>
      </form>
      <SocialLogin />
      <ButtonLink to={ROUTES.register} state={location.state} variant="outline" block className="mt-6 border-2 uppercase">
        Create account
      </ButtonLink>
    </AuthCard>
  )
}
