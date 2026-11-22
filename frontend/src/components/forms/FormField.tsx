import { AlertCircle } from 'lucide-react'
import {
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/utils/cn'

interface FormFieldProps {
  label: string
  error?: string
  hint?: ReactNode
  optional?: boolean
  className?: string
  /** A single input/select/textarea. It receives id + aria attributes automatically. */
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>
  suffix?: ReactNode
}

/** Label + control + hint/error, wired for screen readers (Figma: 14px label, grey filled input). */
export function FormField({ label, error, hint, optional, className, children, suffix }: FormFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error || hint ? messageId : undefined,
      })
    : children

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="flex items-baseline justify-between px-1 text-sm font-medium text-ink">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-muted">Optional</span>}
      </label>
      {suffix ? (
        <div className="relative">
          {control}
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted">
            {suffix}
          </span>
        </div>
      ) : (
        control
      )}
      {error ? (
        <p id={messageId} role="alert" className="flex items-center gap-1 px-1 text-xs font-medium text-danger">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="px-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function TextInput({
  className,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={cn('field-input', className)} {...props} />
}

export function TextArea({
  className,
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} className={cn('field-input min-h-32 resize-y leading-relaxed', className)} {...props} />
}

export function Select({
  className,
  ref,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> }) {
  return (
    <select
      ref={ref}
      className={cn(
        'field-input appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10',
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23373737' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function Checkbox({
  label,
  className,
  ref,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode; ref?: Ref<HTMLInputElement> }) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-2.5 text-sm text-ink', className)}>
      <input
        ref={ref}
        type="checkbox"
        className="size-[18px] shrink-0 cursor-pointer rounded border-line accent-brand"
        {...props}
      />
      <span>{label}</span>
    </label>
  )
}
