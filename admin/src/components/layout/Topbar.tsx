import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/app/hooks'
import { useCurrentAdmin } from '@/features/auth/useCurrentAdmin'
import { api } from '@/services/api'
import { useLogoutMutation } from '@/services/endpoints'
import { fullName, humanize } from '@/utils/format'
import { Avatar } from '../ui/Avatar'
import { MenuItem, Popover } from '../ui/Menu'
import { useToast } from '../ui/toastContext'
import { NotificationBell } from './NotificationBell'
import { ThemeToggle } from './ThemeToggle'

interface TopbarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  onOpenMobileNav: () => void
}

export function Topbar({ collapsed, onToggleCollapsed, onOpenMobileNav }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="-ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-fg-2 hover:bg-muted hover:text-fg lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="-ml-2 hidden h-9 w-9 items-center justify-center rounded-lg text-fg-3 hover:bg-muted hover:text-fg lg:flex"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
      </button>
      <div className="flex-1" />
      <ThemeToggle />
      <NotificationBell />
      <div className="mx-1 h-6 w-px bg-line" aria-hidden />
      <UserMenu />
    </header>
  )
}

function UserMenu() {
  const admin = useCurrentAdmin()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const toast = useToast()
  const [logout] = useLogoutMutation()
  const name = fullName(admin)

  const signOut = async () => {
    try {
      await logout().unwrap()
    } catch {
      toast.error('Could not reach the server; you were signed out on this device.')
    }
    dispatch(api.util.resetApiState())
    navigate('/login', { replace: true })
  }

  return (
    <Popover
      trigger={({ toggle, ...aria }) => (
        <button type="button" onClick={toggle} {...aria} className="flex items-center gap-2.5 rounded-lg py-1 pr-2 pl-1 transition-colors hover:bg-muted" aria-label="Account menu">
          <Avatar name={name} src={admin.avatar?.url} />
          <span className="hidden text-left leading-tight md:block">
            <span className="block text-[13px] font-medium text-fg">{name}</span>
            <span className="block text-[11px] text-fg-3">{humanize(admin.role)}</span>
          </span>
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-[13px] font-medium text-fg">{name}</p>
            <p className="truncate text-xs text-fg-3">{admin.email}</p>
          </div>
          <div className="py-1">
            <MenuItem icon={<UserRound />} onClick={() => (close(), navigate('/settings?tab=profile'))}>
              Profile & password
            </MenuItem>
            <MenuItem icon={<Settings />} onClick={() => (close(), navigate('/settings'))}>
              Business settings
            </MenuItem>
          </div>
          <div className="border-t border-line pt-1">
            <MenuItem icon={<LogOut />} danger onClick={() => (close(), void signOut())}>
              Sign out
            </MenuItem>
          </div>
        </>
      )}
    </Popover>
  )
}
