import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles'

interface StyleProps {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleProps {
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  variant,
  size,
  block,
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonClasses({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}

interface ButtonLinkProps extends LinkProps, StyleProps {
  icon?: ReactNode
}

export function ButtonLink({ variant, size, block, icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonClasses({ variant, size, block }), className)} {...rest}>
      {icon}
      {children}
    </Link>
  )
}

export function IconButton({
  label,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-10 items-center justify-center rounded-full text-ink transition hover:bg-black/5 active:scale-95',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
