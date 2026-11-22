import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/navigation'
import { cn } from '@/utils/cn'

/** Wordmark from the Figma nav ("Camper", Montserrat SemiBold, brand blue). */
export function Logo({ tone = 'brand', className }: { tone?: 'brand' | 'white'; className?: string }) {
  return (
    <Link
      to={ROUTES.home}
      className={cn(
        'shrink-0 text-[26px] leading-none font-semibold tracking-tight md:text-[32px]',
        tone === 'brand' ? 'text-brand' : 'text-white',
        className,
      )}
      aria-label="FullCamper home"
    >
      <span className="font-medium opacity-70">Full</span>Camper
    </Link>
  )
}
