import { Bell, CheckCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation, useNotificationsQuery, useUnreadCountQuery } from '@/services/endpoints'
import type { AppNotification } from '@/types/api'
import { cn } from '@/utils/cn'
import { formatRelative } from '@/utils/format'
import { EmptyState, ErrorState, Skeleton } from '../ui/Feedback'
import { Popover } from '../ui/Menu'
import { notificationLink, NotificationIcon } from './notificationMeta'

/** Top-bar bell: unread count (polled every minute) and the latest notifications. */
export function NotificationBell() {
  const { data: unread } = useUnreadCountQuery(undefined, { pollingInterval: 60_000, skipPollingIfUnfocused: true })
  const count = unread?.count ?? 0

  return (
    <Popover
      kind="dialog"
      className="w-[min(92vw,380px)] p-0"
      trigger={({ toggle, ...aria }) => (
        <button
          type="button"
          onClick={toggle}
          {...aria}
          className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-fg-2 transition-colors hover:bg-muted hover:text-fg"
          aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
        >
          <Bell className="h-[18px] w-[18px]" />
          {count > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-on-accent ring-2 ring-surface tabular">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      )}
    >
      {(close) => <NotificationPanel close={close} unread={count} />}
    </Popover>
  )
}

function NotificationPanel({ close, unread }: { close: () => void; unread: number }) {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useNotificationsQuery({ page: 1, limit: 6 })
  const [markRead] = useMarkNotificationReadMutation()
  const [markAll, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation()

  const open = (notification: AppNotification) => {
    if (!notification.isRead) void markRead(notification._id)
    const link = notificationLink(notification)
    close()
    if (link) navigate(link)
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-sm font-semibold text-fg">Notifications</p>
        {unread > 0 && (
          <button type="button" onClick={() => void markAll()} disabled={markingAll} className="flex items-center gap-1 text-xs font-medium text-accent-ink hover:underline disabled:opacity-50">
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>
      <div className="scrollbar-thin max-h-[60vh] overflow-y-auto p-1">
        {isLoading && (
          <div className="flex flex-col gap-3 p-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        )}
        {error && <ErrorState error={error} onRetry={refetch} compact />}
        {data && data.items.length === 0 && <EmptyState compact title="You're all caught up" description="New bookings, payments and inquiries will appear here." />}
        {data?.items.map((notification) => (
          <button
            key={notification._id}
            type="button"
            onClick={() => open(notification)}
            className={cn('flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted', !notification.isRead && 'bg-accent-soft/50')}
          >
            <NotificationIcon type={notification.type} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-[13px] font-medium text-fg">{notification.title}</span>
                {!notification.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-xs text-fg-3">{notification.message}</span>
              <span className="mt-1 block text-[11px] text-fg-3">{formatRelative(notification.createdAt)}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="border-t border-line p-1">
        <Link to="/notifications" onClick={close} className="block rounded-lg px-3 py-2 text-center text-[13px] font-medium text-fg-2 hover:bg-muted hover:text-fg">
          View all notifications
        </Link>
      </div>
    </div>
  )
}
