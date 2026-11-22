import { CalendarCheck, Caravan, Heart, LogIn, LogOut, Settings, User, UserPlus } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Avatar } from '@/components/common/Avatar'
import { ROUTES } from '@/constants/navigation'
import { fullName, logoutUser, selectCurrentUser } from '@/features/auth/authSlice'
import { showToast } from '@/features/ui/uiSlice'
import { useClickOutside } from '@/hooks/useClickOutside'

const itemClass =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-surface'

/** Account dropdown (Figma: "My orders / Settings / Log out" under the user icon). */
export function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const user = useAppSelector(selectCurrentUser)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, open, close)

  const handleLogout = async () => {
    await dispatch(logoutUser())
    dispatch(showToast('You have been signed out', 'info'))
    close()
    navigate(ROUTES.home)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user ? `Account menu for ${fullName(user)}` : 'Account menu'}
        className="flex items-center rounded-full p-1.5 text-brand transition hover:bg-brand-soft"
      >
        {user ? <Avatar name={fullName(user)} src={user.avatar?.url ?? null} size="sm" /> : <User className="size-[27px] fill-brand" />}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-2 w-60 animate-fade-in rounded-[14px] bg-white p-2 shadow-raised"
        >
          {user ? (
            <>
              <div className="border-b border-line px-3 pt-2 pb-3">
                <p className="truncate text-sm font-semibold">{fullName(user)}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
              <div className="pt-1">
                <Link role="menuitem" onClick={close} to={ROUTES.bookings} className={itemClass}>
                  <CalendarCheck className="size-4" /> My orders
                </Link>
                <Link role="menuitem" onClick={close} to={ROUTES.myCampers} className={itemClass}>
                  <Caravan className="size-4" /> My campers
                </Link>
                <Link role="menuitem" onClick={close} to={ROUTES.favorites} className={itemClass}>
                  <Heart className="size-4" /> Favorites
                </Link>
                <Link role="menuitem" onClick={close} to={ROUTES.profile} className={itemClass}>
                  <Settings className="size-4" /> Settings
                </Link>
              </div>
              <button role="menuitem" type="button" onClick={() => void handleLogout()} className={`${itemClass} text-danger`}>
                <LogOut className="size-4" /> Log out
              </button>
            </>
          ) : (
            <div>
              <Link role="menuitem" onClick={close} to={ROUTES.signIn} className={itemClass}>
                <LogIn className="size-4" /> Sign in
              </Link>
              <Link role="menuitem" onClick={close} to={ROUTES.register} className={itemClass}>
                <UserPlus className="size-4" /> Create account
              </Link>
              <Link role="menuitem" onClick={close} to={ROUTES.favorites} className={itemClass}>
                <Heart className="size-4" /> Favorites
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
