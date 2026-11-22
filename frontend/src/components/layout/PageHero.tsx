import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

export interface Crumb {
  label: string
  to?: string
}

interface PageHeroProps {
  image: string
  title: string
  eyebrow?: string
  crumbs?: Crumb[]
  children?: ReactNode
  size?: 'md' | 'lg'
}

/**
 * Photo banner with 60% black overlay, breadcrumb and huge title
 * (Figma "Motors", "Compare our models", "Camping places" headers — 350px on desktop).
 */
export function PageHero({ image, title, eyebrow, crumbs, children, size = 'md' }: PageHeroProps) {
  return (
    <section
      className={cn(
        'relative isolate flex items-center justify-center overflow-hidden text-center text-white',
        size === 'md' ? 'min-h-[220px] md:min-h-[300px] lg:min-h-[350px]' : 'min-h-[320px] md:min-h-[420px] lg:min-h-[525px]',
      )}
    >
      <img src={image} alt="" className="absolute inset-0 -z-10 size-full object-cover" fetchPriority="high" />
      <div className="absolute inset-0 -z-10 bg-black/60" aria-hidden />
      <div className="container-page animate-slide-up py-10">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-2 text-sm font-medium md:text-base">
            {crumbs.map((crumb, i) => (
              // Positional key: labels can repeat (e.g. "Campers / Campers" while a category is loading).
              <Fragment key={`${i}-${crumb.label}`}>
                {i > 0 && <span className="mx-1 opacity-80">/</span>}
                {crumb.to ? (
                  <Link to={crumb.to} className="hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
              </Fragment>
            ))}
          </nav>
        )}
        {eyebrow && <p className="text-lg font-bold md:text-[27px]">{eyebrow}</p>}
        <h1 className="text-[40px] leading-[1.05] font-bold tracking-tight break-words sm:text-6xl lg:text-[80px]">{title}</h1>
        {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
      </div>
    </section>
  )
}
