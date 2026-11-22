import { motion } from 'motion/react'
import { NavLink } from 'react-router-dom'
import { useCurrentAdmin } from '@/features/auth/useCurrentAdmin'
import { useUnreadCountQuery } from '@/services/endpoints'
import { cn } from '@/utils/cn'
import { Logo } from './Logo'
import { NAV_SECTIONS } from './navigation'

interface SidebarNavProps {
  collapsed: boolean
  onNavigate?: () => void
  /** Distinct id so the desktop and mobile active indicators animate independently. */
  layoutScope: string
}

/** Navigation list shared by the desktop sidebar and the mobile drawer. */
export function SidebarNav({ collapsed, onNavigate, layoutScope }: SidebarNavProps) {
  const admin = useCurrentAdmin()
  const { data: unread } = useUnreadCountQuery(undefined, { pollingInterval: 60_000, skipPollingIfUnfocused: true })

  return (
    <nav className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto px-3 pb-4" aria-label="Main">
      {NAV_SECTIONS.map((section) => {
        const items = section.items.filter((item) => !item.roles || item.roles.includes(admin.role))
        if (items.length === 0) return null
        return (
          <div key={section.title} className="mt-5 first:mt-2">
            <p
              className={cn(
                'mb-1.5 px-2.5 text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap text-fg-3 uppercase transition-opacity duration-200',
                collapsed && 'opacity-0',
              )}
              aria-hidden={collapsed}
            >
              {section.title}
            </p>
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => {
                const count = item.badge === 'notifications' ? (unread?.count ?? 0) : 0
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors',
                          isActive ? 'text-fg' : 'text-nav-fg hover:bg-muted hover:text-fg',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.span
                              layoutId={`nav-active-${layoutScope}`}
                              className="absolute inset-0 rounded-lg bg-nav-active ring-1 ring-accent/15"
                              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                            />
                          )}
                          {isActive && <span className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-full bg-accent" aria-hidden />}
                          <item.icon className={cn('relative h-[18px] w-[18px] shrink-0', isActive ? 'text-accent-ink' : 'text-fg-3 group-hover:text-fg-2')} aria-hidden />
                          <span className={cn('relative truncate transition-opacity duration-200', collapsed && 'opacity-0')}>{item.label}</span>
                          {count > 0 && (
                            <span
                              className={cn(
                                'relative ml-auto rounded-full bg-accent px-1.5 text-[11px] leading-[18px] font-semibold text-on-accent tabular',
                                collapsed && 'absolute top-1 right-1 ml-0 h-2 w-2 p-0 text-[0px]',
                              )}
                              aria-label={`${count} unread`}
                            >
                              {count > 99 ? '99+' : count}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 248 }}
      transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-nav lg:flex"
    >
      <div className="flex h-16 shrink-0 items-center px-5">
        <Logo compact={collapsed} />
      </div>
      <SidebarNav collapsed={collapsed} layoutScope="desktop" />
      <div className={cn('border-t border-line px-5 py-3 text-[11px] whitespace-nowrap text-fg-3 transition-opacity', collapsed && 'opacity-0')}>
        All times in Korea Standard Time
      </div>
    </motion.aside>
  )
}
