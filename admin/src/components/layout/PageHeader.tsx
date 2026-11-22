import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/common'

export interface Crumb {
  label: string
  to?: string
}

interface PageHeaderProps {
  title: ReactNode
  /** Plain-text title for the browser tab when `title` is not a string. */
  documentTitle?: string
  description?: ReactNode
  breadcrumbs?: Crumb[]
  actions?: ReactNode
}

export function PageHeader({ title, documentTitle, description, breadcrumbs, actions }: PageHeaderProps) {
  useDocumentTitle(documentTitle ?? (typeof title === 'string' ? title : ''))
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2">
            <ol className="flex flex-wrap items-center gap-1 text-[13px] text-fg-3">
              {breadcrumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />}
                  {crumb.to ? (
                    <Link to={crumb.to} className="transition-colors hover:text-fg">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-fg-2">
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-fg [overflow-wrap:anywhere]">{title}</h1>
        {description && <p className="mt-1 text-sm text-fg-3">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
