import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'outline' | 'accent' | 'ghost' | 'danger' | 'white' | 'outline-white'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonStyleProps {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
}

/* Button styles follow the Figma components: 10px radius, bold Montserrat, blue fill or blue outline. */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark shadow-card',
  outline: 'border border-brand text-brand bg-white hover:bg-brand-soft shadow-card',
  accent: 'bg-accent text-white hover:bg-accent-dark shadow-card',
  ghost: 'text-ink hover:bg-black/5',
  danger: 'bg-danger text-white hover:bg-[#a82020]',
  white: 'bg-white text-brand hover:bg-brand-soft',
  'outline-white': 'border-2 border-white text-white hover:bg-white/10',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
}

export function buttonClasses({ variant = 'primary', size = 'md', block = false }: ButtonStyleProps = {}): string {
  return cn(
    'inline-flex select-none items-center justify-center gap-2 rounded-[10px] font-bold whitespace-nowrap',
    'transition duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55',
    VARIANTS[variant],
    SIZES[size],
    block && 'w-full',
  )
}
