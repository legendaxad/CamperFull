import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8 shrink-0', className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-[#161b24] dark:fill-[#232b38]" />
      <path d="M7 21.5V14a3 3 0 0 1 3-3h8.6a3 3 0 0 1 2.5 1.3l3.3 4.7c.4.5.6 1.1.6 1.7v2.8" fill="none" stroke="#d4ac55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="22" r="2.2" fill="#d4ac55" />
      <circle cx="21.5" cy="22" r="2.2" fill="#d4ac55" />
      <path d="M11 14.5h4" stroke="#d4ac55" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg" aria-label="FullCamper Admin home">
      <LogoMark />
      <span className={cn('flex flex-col leading-none whitespace-nowrap transition-opacity duration-200', compact && 'pointer-events-none opacity-0')}>
        <span className="text-[15px] font-semibold tracking-tight text-fg">FullCamper</span>
        <span className="mt-1 text-[10.5px] font-medium tracking-[0.14em] text-accent-ink uppercase">Admin</span>
      </span>
    </Link>
  )
}
