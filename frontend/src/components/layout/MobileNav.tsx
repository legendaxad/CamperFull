import {
  CalendarCheck,
  Caravan,
  ChevronRight,
  GitCompareArrows,
  Heart,
  LogIn,
  LogOut,
  Plus,
  Settings,
  Tent,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Avatar } from '@/components/common/Avatar'
import { buttonClasses } from '@/components/common/buttonStyles'
import { ROUTES } from '@/constants/navigation'
import { fullName, logoutUser, selectCurrentUser } from '@/features/auth/authSlice'
import { selectActiveCategories } from '@/features/campers/camperSelectors'
import { selectMobileNavOpen, setMobileNav, showToast } from '@/features/ui/uiSlice'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { Logo } from './Logo'

function DrawerLink({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-ink hover:bg-surface">
      <Icon className="size-5 text-brand" aria-hidden />
      {label}
    </Link>
  )
}

/** Slide-in drawer replacing the desktop nav on tablet & mobile (Figma iPhone/iPad frames). */
export function MobileNav() {
  const open = useAppSelector(selectMobileNavOpen)
  const user = useAppSelector(selectCurrentUser)
  const categories = useAppSelector(selectActiveCategories)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  useLockBodyScroll(open)

  if (!open) return null
  const close = () => dispatch(setMobileNav(false))

  const handleLogout = async () => {
    await dispatch(logoutUser())
    dispatch(showToast('You have been signed out', 'info'))
    close()
    navigate(ROUTES.home)
  }

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={close} aria-hidden />
      <aside
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className="absolute inset-y-0 right-0 flex w-[min(88vw,380px)] animate-slide-in-right flex-col bg-white shadow-raised"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <Logo />
          <button type="button" onClick={close} aria-label="Close menu" className="rounded-full p-2 hover:bg-black/5">
            <X className="size-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {user && (
            <Link to={ROUTES.profile} className="mb-4 flex items-center gap-3 rounded-2xl bg-surface p-3">
              <Avatar name={fullName(user)} src={user.avatar?.url ?? null} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{fullName(user)}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </Link>
          )}

          <p className="px-3 pb-1 text-xs font-semibold tracking-wider text-muted uppercase">Browse</p>
          <nav aria-label="Categories">
            {categories.map(({ slug, name }) => (
              <Link
                key={slug}
                to={ROUTES.category(slug)}
                className="flex items-center justify-between rounded-xl px-3 py-3 text-[15px] font-semibold text-ink hover:bg-surface"
              >
                {name}
                <ChevronRight className="size-4 text-muted" aria-hidden />
              </Link>
            ))}
            <DrawerLink to={ROUTES.campingPlaces} icon={Tent} label="Camping places" />
          </nav>

          <p className="mt-4 px-3 pb-1 text-xs font-semibold tracking-wider text-muted uppercase">Your trips</p>
          <DrawerLink to={ROUTES.favorites} icon={Heart} label="Favorites" />
          <DrawerLink to={ROUTES.compare} icon={GitCompareArrows} label="Compare" />
          {user ? (
            <>
              <DrawerLink to={ROUTES.bookings} icon={CalendarCheck} label="My orders" />
              <DrawerLink to={ROUTES.myCampers} icon={Caravan} label="My campers" />
              <DrawerLink to={ROUTES.profile} icon={Settings} label="Settings" />
            </>
          ) : (
            <>
              <DrawerLink to={ROUTES.signIn} icon={LogIn} label="Sign in" />
              <DrawerLink to={ROUTES.register} icon={UserPlus} label="Create account" />
            </>
          )}
        </div>

        <div className="space-y-2 border-t border-line p-4">
          <Link to={ROUTES.publish} className={buttonClasses({ variant: 'accent', block: true })}>
            <Plus className="size-4" aria-hidden /> List your camper
          </Link>
          {user && (
            <button type="button" onClick={() => void handleLogout()} className={buttonClasses({ variant: 'ghost', block: true }) + ' text-danger'}>
              <LogOut className="size-4" aria-hidden /> Log out
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}
