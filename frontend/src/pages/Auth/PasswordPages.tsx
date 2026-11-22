import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppDispatch } from '@/app/hooks'
import { Button, ButtonLink } from '@/components/common/Button'
import { FormField, TextInput } from '@/components/forms/FormField'
import { ROUTES } from '@/constants/navigation'
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordValues,
  type ResetPasswordValues,
} from '@/features/auth/authSchemas'
import { showToast } from '@/features/ui/uiSlice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { describeError } from '@/services/api/errors'
import { authApi } from '@/services/authApi'
import { AuthCard } from './AuthCard'

/** POST /auth/forgot-password — the backend always answers the same way, so we never reveal if an email exists. */
export function ForgotPasswordPage() {
  useDocumentTitle('Forgot password')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async ({ email }: ForgotPasswordValues) => {
    setError(null)
    try {
      await authApi.forgotPassword(email)
      setSentTo(email)
    } catch (e) {
      setError(describeError(e))
    }
  }

  if (sentTo) {
    return (
      <AuthCard title="Check your email">
        <div className="space-y-4 text-sm leading-relaxed">
          <MailCheck className="size-10 text-brand" aria-hidden />
          <p>
            If an account exists for <strong>{sentTo}</strong>, we have sent a link to reset your password. The link expires in
            30 minutes.
          </p>
          <ButtonLink to={ROUTES.signIn} block>
            Back to sign in
          </ButtonLink>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Forgot password">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <p className="text-sm text-muted">Enter the email you registered with and we will send you a reset link.</p>
        <FormField label="Email" error={errors.email?.message}>
          <TextInput type="email" autoComplete="email" placeholder="Your email" {...register('email')} />
        </FormField>
        {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
        <Button type="submit" block loading={isSubmitting}>
          Send reset link
        </Button>
        <p className="text-center text-sm">
          <Link to={ROUTES.signIn} className="font-semibold text-brand hover:underline">Back to sign in</Link>
        </p>
      </form>
    </AuthCard>
  )
}

/** Target of the emailed link: CLIENT_URL/reset-password?token=… (POST /auth/reset-password). */
export function ResetPasswordPage() {
  useDocumentTitle('Reset password')
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = async ({ password }: ResetPasswordValues) => {
    setError(null)
    try {
      await authApi.resetPassword(token, password)
      dispatch(showToast('Your password has been reset. Please sign in.'))
      navigate(ROUTES.signIn, { replace: true })
    } catch (e) {
      setError(describeError(e))
    }
  }

  if (token.length < 32) {
    return (
      <AuthCard title="Reset password">
        <p className="text-sm text-muted">This reset link is invalid or incomplete. Please request a new one.</p>
        <ButtonLink to={ROUTES.forgotPassword} block className="mt-6">
          Request a new link
        </ButtonLink>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Reset password">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="New password" error={errors.password?.message} hint="At least 8 characters with a letter and a number.">
          <TextInput type="password" autoComplete="new-password" {...register('password')} />
        </FormField>
        <FormField label="Repeat new password" error={errors.confirmPassword?.message}>
          <TextInput type="password" autoComplete="new-password" {...register('confirmPassword')} />
        </FormField>
        {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
        <Button type="submit" block loading={isSubmitting}>
          Set new password
        </Button>
      </form>
    </AuthCard>
  )
}
