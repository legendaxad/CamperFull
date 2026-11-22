import { CheckCheck, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { NOTIFICATION_TYPE_LABELS, notificationLink, NotificationIcon } from '@/components/layout/notificationMeta'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Segmented'
import { useToast } from '@/components/ui/toastContext'
import { describeError } from '@/services/errors'
import { useDeleteNotificationMutation, useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation, useNotificationsQuery, useUnreadCountQuery } from '@/services/endpoints'
import { cn } from '@/utils/cn'
import { formatDateTime, formatRelative } from '@/utils/format'

export default function NotificationsPage() {
  const toast = useToast()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [page, setPage] = useState(1)
  const { data, error, isLoading, isFetching, refetch } = useNotificationsQuery({ page, limit: 20, unread: filter === 'unread' ? true : undefined })
  const { data: unread } = useUnreadCountQuery()
  const [markRead] = useMarkNotificationReadMutation()
  const [markAll, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation()
  const [remove] = useDeleteNotificationMutation()

  const run = async (action: () => Promise<unknown>, success?: string) => {
    try {
      await action()
      if (success) toast.success(success)
    } catch (err) {
      toast.error(describeError(err))
    }
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Booking requests, payments, refunds, reviews and inquiries sent to administrators."
        breadcrumbs={[{ label: 'Business' }, { label: 'Notifications' }]}
        actions={
          <Button icon={<CheckCheck className="h-4 w-4" />} disabled={!unread?.count} loading={markingAll} onClick={() => void run(() => markAll().unwrap(), 'All notifications marked as read.')}>
            Mark all read
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <div className="border-b border-line px-3">
          <Tabs
            label="Filter notifications"
            value={filter}
            onChange={(value) => (setFilter(value), setPage(1))}
            tabs={[
              { value: 'all', label: 'All' },
              { value: 'unread', label: 'Unread', count: unread?.count },
            ]}
          />
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-3 p-5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : data && data.items.length === 0 ? (
          <EmptyState title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'} description="You'll be notified about new bookings, payments and customer messages." />
        ) : (
          <ul className={cn('divide-y divide-line transition-opacity', isFetching && 'opacity-60')}>
            <AnimatePresence initial={false}>
              {data?.items.map((notification) => {
                const link = notificationLink(notification)
                return (
                  <motion.li
                    key={notification._id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={cn('group flex items-start gap-4 px-5 py-4', !notification.isRead && 'bg-accent-soft/40')}
                  >
                    <NotificationIcon type={notification.type} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <p className="text-sm font-medium text-fg">{notification.title}</p>
                        <span className="text-xs text-fg-3">{NOTIFICATION_TYPE_LABELS[notification.type]}</span>
                        {!notification.isRead && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-label="Unread" />}
                      </div>
                      <p className="mt-0.5 text-[13px] text-fg-2">{notification.message}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-fg-3">
                        <time dateTime={notification.createdAt} title={formatDateTime(notification.createdAt)}>
                          {formatRelative(notification.createdAt)}
                        </time>
                        {link && (
                          <Link to={link} onClick={() => !notification.isRead && void markRead(notification._id)} className="font-medium text-accent-ink hover:underline">
                            Open
                          </Link>
                        )}
                        {!notification.isRead && (
                          <button type="button" onClick={() => void run(() => markRead(notification._id).unwrap())} className="font-medium hover:text-fg">
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                      onClick={() => void run(() => remove(notification._id).unwrap())}
                      aria-label="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
        <Pagination meta={data?.meta} onPageChange={setPage} label="notifications" />
      </Card>
      <p className="mt-4 text-xs text-fg-3">
        The backend creates administrator notifications for new bookings, captured payments, payment problems, reviews and inquiries. New customer registrations are shown on the dashboard and in the activity log instead.
      </p>
    </>
  )
}
