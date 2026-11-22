import { Check } from 'lucide-react'
import { useAppSelector } from '@/app/hooks'
import { selectSession, selectStepValidity } from '@/features/publishing/publishingSelectors'
import { cn } from '@/utils/cn'
import { useWizardNavigation } from './useWizardStep'
import { WIZARD_STEPS } from './wizardConfig'

/**
 * Progress indicator. Desktop/tablet: numbered steps with labels; mobile: compact
 * "Step x of 7" with a progress bar. Users can jump to any step they have reached.
 */
export function WizardStepper() {
  const session = useAppSelector(selectSession)!
  const validity = useAppSelector(selectStepValidity)
  const { current, goTo } = useWizardNavigation()
  const meta = WIZARD_STEPS[current]!
  const progress = ((current + 1) / WIZARD_STEPS.length) * 100

  return (
    <nav aria-label="Listing steps">
      {/* Mobile */}
      <div className="md:hidden">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Step {current + 1} of {WIZARD_STEPS.length}</span>
          <span className="text-muted">{meta.short}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white shadow-inner" role="progressbar" aria-valuemin={1} aria-valuemax={WIZARD_STEPS.length} aria-valuenow={current + 1}>
          <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Tablet & desktop */}
      <ol className="hidden items-start md:flex">
        {WIZARD_STEPS.map((step, index) => {
          const reachable = index <= session.furthestStep
          const isCurrent = index === current
          const done = validity[step.id] && !isCurrent && step.id !== 'preview'
          return (
            <li key={step.id} className="relative flex flex-1 flex-col items-center">
              {index > 0 && (
                <span
                  aria-hidden
                  className={cn('absolute top-[18px] right-1/2 h-0.5 w-full -translate-y-1/2', index <= session.furthestStep ? 'bg-brand' : 'bg-line')}
                />
              )}
              <button
                type="button"
                onClick={() => reachable && goTo(index)}
                disabled={!reachable}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${step.title}${done ? ' (complete)' : ''}`}
                className={cn(
                  'relative z-10 flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold transition',
                  isCurrent && 'scale-110 border-brand bg-brand text-white shadow-raised',
                  !isCurrent && done && 'border-brand bg-white text-brand',
                  !isCurrent && !done && reachable && 'border-brand/40 bg-white text-ink hover:border-brand',
                  !reachable && 'cursor-not-allowed border-line bg-white text-muted',
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : index + 1}
              </button>
              <span className={cn('mt-2 hidden text-center text-xs font-semibold lg:block', isCurrent ? 'text-brand' : 'text-muted')}>
                {step.short}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
