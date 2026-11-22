import type { FormEventHandler, ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { STEP_FORM_ID } from '../wizardConfig'

/** The <form> every wizard step renders; the shared footer's "Next" button submits it. */
export function StepForm({ onSubmit, children, className }: { onSubmit: FormEventHandler<HTMLFormElement>; children: ReactNode; className?: string }) {
  return (
    <form id={STEP_FORM_ID} onSubmit={onSubmit} noValidate className={cn('grid gap-5 sm:grid-cols-2', className)}>
      {children}
    </form>
  )
}

export function StepSubheading({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 text-sm font-bold tracking-wider text-muted uppercase sm:col-span-2">{children}</h3>
}
