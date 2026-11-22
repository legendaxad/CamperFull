import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { useAppDispatch } from '@/app/hooks'
import { LogoMark } from '@/components/layout/Logo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useDocumentTitle } from '@/hooks/common'
import { adminApi } from '@/services/endpoints'
import { describeError, errorStatus } from '@/services/errors'
import { useLoginMutation, useMeQuery } from '@/services/endpoints'

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})
type FormValues = z.infer<typeof schema>

/** Only same-app relative paths are accepted as a post-login redirect (no open redirects). */
function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/login') ? value : '/'
}

export default function LoginPage() {
  useDocumentTitle('Sign in')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const next = safeNext(params.get('next'))
  const [showPassword, setShowPassword] = useState(false)
  const [login, { isLoading, error }] = useLoginMutation()
  // An existing session skips the form. A failed check (401) simply shows it.
  const session = useMeQuery()

  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  if (session.data) return <Navigate to={next} replace />

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await login(values).unwrap()
      dispatch(adminApi.util.upsertQueryData('me', undefined, result))
      navigate(next, { replace: true })
    } catch {
      /* rendered below */
    }
  })

  const status = errorStatus(error)
  const message = error ? (status === 401 ? 'Incorrect email or password.' : status === 403 ? 'This account does not have dashboard access.' : describeError(error)) : null

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: 'radial-gradient(60rem 30rem at 50% -10%, var(--c-accent-soft), transparent 70%)' }}
        aria-hidden
      />
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }} className="relative w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="h-11 w-11" />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-fg">Sign in to FullCamper</h1>
          <p className="mt-1.5 text-sm text-fg-3">Administration dashboard</p>
        </div>
        <form onSubmit={onSubmit} noValidate className="card flex flex-col gap-4 p-6 shadow-md">
          {params.get('expired') && !message && (
            <p className="rounded-lg bg-info-soft px-3 py-2 text-[13px] text-info" role="status">
              Your session expired. Please sign in again.
            </p>
          )}
          {message && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger" role="alert">
              {message}
            </p>
          )}
          <Field label="Email" error={formState.errors.email?.message}>
            {(id, describedBy) => <Input id={id} aria-describedby={describedBy} type="email" autoComplete="username" autoFocus invalid={!!formState.errors.email} {...register('email')} />}
          </Field>
          <Field label="Password" error={formState.errors.password?.message}>
            {(id, describedBy) => (
              <div className="relative">
                <Input id={id} aria-describedby={describedBy} type={showPassword ? 'text' : 'password'} autoComplete="current-password" className="pr-10" invalid={!!formState.errors.password} {...register('password')} />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-fg-3 hover:text-fg"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}
          </Field>
          <Button type="submit" variant="primary" loading={isLoading} className="mt-1 h-10 w-full">
            Sign in
          </Button>
        </form>
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-fg-3">
          <LockKeyhole className="h-3.5 w-3.5" /> Administrator accounts are created by a super administrator.
        </p>
      </motion.div>
    </div>
  )
}
