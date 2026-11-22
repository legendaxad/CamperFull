import {
  Activity,
  BarChart3,
  Bell,
  CalendarRange,
  Caravan,
  CreditCard,
  FileSpreadsheet,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { MemberRole } from '@/types/api'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Exact match for the active state (the dashboard root). */
  end?: boolean
  roles?: MemberRole[]
  badge?: 'notifications'
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
      { label: 'Analytics', to: '/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Bookings', to: '/bookings', icon: CalendarRange },
      { label: 'Fleet', to: '/campers', icon: Caravan },
      { label: 'Customers', to: '/customers', icon: Users },
      { label: 'Payments', to: '/payments', icon: CreditCard },
    ],
  },
  {
    title: 'Business',
    items: [
      { label: 'Reports', to: '/reports', icon: FileSpreadsheet },
      { label: 'Notifications', to: '/notifications', icon: Bell, badge: 'notifications' },
      { label: 'Activity log', to: '/activity', icon: Activity },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', to: '/settings', icon: Settings },
      { label: 'Admins & roles', to: '/admins', icon: ShieldCheck, roles: ['SUPER_ADMIN'] },
    ],
  },
]
