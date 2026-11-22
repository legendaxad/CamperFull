import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { EmptyState, ErrorState, Skeleton } from './Feedback'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  className?: string
  align?: 'left' | 'right'
  /** Hide below a breakpoint to keep tables readable on small screens. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl'
}

const HIDE: Record<NonNullable<Column<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  /** Rows navigate here on click; the first cell should also contain a real link for keyboard users. */
  rowHref?: (row: T) => string
  empty?: ReactNode
  skeletonRows?: number
  /** Dim the table while a new page loads over existing data. */
  fetching?: boolean
  caption?: string
}

export function DataTable<T>({ columns, rows, rowKey, loading, error, onRetry, rowHref, empty, skeletonRows = 8, fetching, caption }: DataTableProps<T>) {
  const navigate = useNavigate()

  if (error && !rows) return <ErrorState error={error} onRetry={onRetry} />

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className={cn('w-full min-w-[640px] border-collapse text-sm transition-opacity', fetching && 'opacity-60')}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-line bg-subtle">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'h-10 px-4 text-xs font-medium whitespace-nowrap text-fg-3 first:pl-5 last:pr-5',
                  column.align === 'right' ? 'text-right' : 'text-left',
                  column.hideBelow && HIDE[column.hideBelow],
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && !rows
            ? Array.from({ length: skeletonRows }, (_, index) => (
                <tr key={index} className="border-b border-line last:border-0">
                  {columns.map((column) => (
                    <td key={column.key} className={cn('h-14 px-4 first:pl-5 last:pr-5', column.hideBelow && HIDE[column.hideBelow])}>
                      <Skeleton className={cn('h-3.5', column.align === 'right' ? 'ml-auto w-16' : 'w-3/4 max-w-40')} />
                    </td>
                  ))}
                </tr>
              ))
            : rows?.map((row) => {
                const href = rowHref?.(row)
                return (
                  <tr
                    key={rowKey(row)}
                    onClick={
                      href
                        ? (event) => {
                            if ((event.target as HTMLElement).closest('a, button, input, select, label')) return
                            navigate(href)
                          }
                        : undefined
                    }
                    className={cn('border-b border-line transition-colors last:border-0', href && 'cursor-pointer hover:bg-subtle')}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          'h-14 px-4 align-middle first:pl-5 last:pr-5',
                          column.align === 'right' && 'text-right tabular',
                          column.hideBelow && HIDE[column.hideBelow],
                          column.className,
                        )}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                )
              })}
        </tbody>
      </table>
      {rows && rows.length === 0 && (empty ?? <EmptyState title="Nothing here yet" description="No records match the current filters." />)}
    </div>
  )
}
