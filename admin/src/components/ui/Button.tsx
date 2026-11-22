import { Loader2 } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
type Size = 'sm' | 'md' | 'icon' | 'icon-sm'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent shadow-xs hover:bg-accent-hover',
  secondary: 'border border-line bg-surface text-fg shadow-xs hover:bg-subtle hover:border-line-strong',
  ghost: 'text-fg-2 hover:bg-muted hover:text-fg',
  subtle: 'bg-muted text-fg hover:bg-inset',
  danger: 'bg-danger text-white shadow-xs hover:brightness-110 dark:text-[#1a0a09]',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-[13px]',
  md: 'h-9 gap-2 px-3.5 text-sm',
  icon: 'h-9 w-9 justify-center',
  'icon-sm': 'h-8 w-8 justify-center',
}

export function buttonClasses(variant: Variant = 'secondary', size: Size = 'md', className?: string): string {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-[var(--radius-control)] font-medium',
    'transition-[background-color,border-color,color,box-shadow,transform,filter] duration-150 active:scale-[0.97]',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClasses(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
})

interface ButtonLinkProps extends LinkProps {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

export function ButtonLink({ variant = 'secondary', size = 'md', icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, typeof className === 'string' ? className : undefined)} {...rest}>
      {icon}
      {children}
    </Link>
  )
}
