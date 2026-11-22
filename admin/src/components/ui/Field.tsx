import { ChevronDown, Search, X } from 'lucide-react'
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

const controlBase =
  'w-full rounded-[var(--radius-control)] border bg-surface text-sm text-fg placeholder:text-fg-3 shadow-xs ' +
  'transition-[border-color,box-shadow] duration-150 outline-none ' +
  'focus:border-accent focus:ring-3 focus:ring-accent/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-fg-3'

function controlClass(invalid?: boolean, className?: string) {
  return cn(controlBase, invalid ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-line hover:border-line-strong', className)
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { invalid, className, ...rest },
  ref,
) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={controlClass(invalid, cn('h-9 px-3', className))} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { invalid, className, rows = 3, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} aria-invalid={invalid || undefined} className={controlClass(invalid, cn('px-3 py-2 leading-relaxed', className))} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select(
  { invalid, className, children, ...rest },
  ref,
) {
  return (
    <div className={cn('relative', className)}>
      <select ref={ref} aria-invalid={invalid || undefined} className={controlClass(invalid, 'h-9 appearance-none pr-9 pl-3')} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-fg-3" aria-hidden />
    </div>
  )
})

interface FieldProps {
  label: ReactNode
  error?: string
  hint?: ReactNode
  required?: boolean
  className?: string
  children: (id: string, describedBy: string | undefined) => ReactNode
}

/** Label + control + hint/error, with ids wired for accessibility. */
export function Field({ label, error, hint, required, className, children }: FieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-fg-2">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children(id, error || hint ? messageId : undefined)}
      {error ? (
        <p id={messageId} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="text-xs text-fg-3">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  label = 'Search',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  label?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-3" aria-hidden />
      <Input aria-label={label} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pr-8 pl-9 [&::-webkit-search-cancel-button]:hidden" maxLength={100} />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-fg-3 hover:text-fg" aria-label="Clear search">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export function Checkbox({ label, description, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input id={id} type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong accent-[var(--c-accent)]" {...rest} />
      <label htmlFor={id} className="text-sm leading-snug text-fg">
        {label}
        {description && <span className="mt-0.5 block text-xs text-fg-3">{description}</span>}
      </label>
    </div>
  )
}
