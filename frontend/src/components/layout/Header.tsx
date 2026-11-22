import { ChevronDown, GitCompareArrows, Heart, Menu, Plus, ShoppingCart } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { buttonClasses } from '@/components/common/buttonStyles'
import { ROUTES } from '@/constants/navigation'
import { selectActiveCategories } from '@/features/campers/camperSelectors'
import { selectCartCount } from '@/features/cart/cartSlice'
import { selectCompareIds } from '@/features/comparison/comparisonSlice'
import { selectFavoriteIds } from '@/features/favorites/favoritesSlice'
import { setMobileNav } from '@/features/ui/uiSlice'
import { useClickOutside } from '@/hooks/useClickOutside'
import { cn } from '@/utils/cn'
import { LanguageMenu } from './LanguageMenu'
import { Logo } from './Logo'
import { MegaMenu } from './MegaMenu'
import { MobileNav } from './MobileNav'
import { UserMenu } from './UserMenu'

function CountBadge({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="absolute -top-0.5 -right-0.5 flex min-w-[17px] items-center justify-center rounded-full bg-accent px-1 text-[10px] leading-[17px] font-semibold text-white">
      {count > 9 ? '9+' : count}
    </span>
  )
}

function HeaderIconLink({ to, label, count, children }: { to: string; label: string; count: number; children: ReactNode }) {
  return (
    <Link
      to={to}
      aria-label={count ? `${label} (${count})` : label}
      title={label}
      className="relative rounded-full p-2 text-brand transition hover:bg-brand-soft"
    >
      {children}
      <CountBadge count={count} />
    </Link>
  )
}

/*
 * Categories are admin-managed, so only the first ones (by sort order) are shown inline:
 * one at `lg`, two from `xl`. With exactly three categories the third also fits from 1366px,
 * because it takes the place of the "More" button. The rest are listed under "More",
 * which opens the same mega-menu.
 */
const INLINE_CLASSES = ['', 'hidden xl:flex', 'hidden min-[1366px]:flex']
/** For categories[1..]: hidden from "More" at the breakpoint where they are shown inline. */
const IN_MORE_CLASSES = ['xl:hidden', 'min-[1366px]:hidden']
const MORE_MENU = '__more__'

/**
 * Global navigation (Figma component "main nav", 90px tall with soft shadow).
 * Desktop: category links with mega-menu dropdowns. Below `lg`: logo, cart and a drawer.
 */
export function Header() {
  const dispatch = useAppDispatch()
  const cartCount = useAppSelector(selectCartCount)
  const compareCount = useAppSelector(selectCompareIds).length
  const favoriteCount = useAppSelector(selectFavoriteIds).length
  const categories = useAppSelector(selectActiveCategories)
  const location = useLocation()
  // The mega-menu remembers the path it was opened on, so it closes itself on navigation
  // without an extra state update.
  const [menu, setMenu] = useState<{ category: string; path: string } | null>(null)
  const openCategory = menu?.path === location.pathname ? menu.category : null
  const setOpenCategory = (update: (current: string | null) => string | null) => {
    const next = update(openCategory)
    setMenu(next ? { category: next, path: location.pathname } : null)
  }
  const navRef = useRef<HTMLElement>(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  useClickOutside(navRef, openCategory !== null, closeMenu)

  // The mobile drawer lives in Redux; close it when the route changes.
  useEffect(() => {
    dispatch(setMobileNav(false))
  }, [location.pathname, dispatch])

  const openMenuCategory = categories.find((c) => c.slug === openCategory)
  const inlineSlots = categories.length === 3 ? 3 : 2
  const inlineCategories = categories.slice(0, inlineSlots)
  const moreCategories = categories.slice(1)
  const moreActive = moreCategories.some((c) => c.slug === openCategory || location.pathname === ROUTES.category(c.slug))
  // "More" disappears at the breakpoint where every category fits inline.
  const moreButtonClass = categories.length > inlineSlots ? '' : (IN_MORE_CLASSES[categories.length - 2] ?? '')

  const navLinkClass = (active: boolean) =>
    cn(
      'flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink transition hover:bg-surface xl:px-4 xl:text-base',
      active && 'bg-surface text-brand',
    )

  return (
    <header ref={navRef} className="sticky top-0 z-50 bg-white shadow-nav">
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-[90px]">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {inlineCategories.map(({ slug, name }, index) => (
            <button
              key={slug}
              type="button"
              aria-expanded={openCategory === slug}
              aria-haspopup="true"
              onClick={() => setOpenCategory((current) => (current === slug ? null : slug))}
              className={cn(navLinkClass(openCategory === slug || location.pathname === ROUTES.category(slug)), INLINE_CLASSES[index])}
            >
              {name}
              <ChevronDown className={cn('size-4 transition', openCategory === slug && 'rotate-180')} aria-hidden />
            </button>
          ))}
          {moreCategories.length > 0 && (
            <div className={cn('relative', moreButtonClass)}>
              <button
                type="button"
                aria-expanded={openCategory === MORE_MENU}
                aria-haspopup="true"
                onClick={() => setOpenCategory((current) => (current === MORE_MENU ? null : MORE_MENU))}
                className={navLinkClass(openCategory === MORE_MENU || moreActive)}
              >
                More
                <ChevronDown className={cn('size-4 transition', openCategory === MORE_MENU && 'rotate-180')} aria-hidden />
              </button>
              {openCategory === MORE_MENU && (
                <ul className="absolute top-full left-0 z-10 mt-2 min-w-[220px] rounded-xl bg-white py-2 shadow-nav">
                  {moreCategories.map(({ slug, name }, index) => (
                    // Categories that are shown inline at the current breakpoint are hidden here.
                    <li key={slug} className={index < inlineSlots - 1 ? IN_MORE_CLASSES[index] : undefined}>
                      <button
                        type="button"
                        onClick={() => setOpenCategory(() => slug)}
                        className="w-full px-4 py-2.5 text-left text-[15px] font-semibold text-ink transition hover:bg-surface hover:text-brand"
                      >
                        {name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <NavLink to={ROUTES.campingPlaces} className={({ isActive }) => navLinkClass(isActive)}>
            Camping Place
          </NavLink>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            to={ROUTES.publish}
            // `max-md:hidden`, not `hidden md:inline-flex`: cn() does not merge classes, and the base
            // `inline-flex` from buttonClasses would win over `hidden`, overflowing small screens.
            className={cn(buttonClasses({ variant: 'accent', size: 'sm' }), 'mr-1 max-md:hidden')}
          >
            <Plus className="size-4" aria-hidden /> List your camper
          </Link>
          <div className="hidden items-center sm:flex">
            <HeaderIconLink to={ROUTES.favorites} label="Favorites" count={favoriteCount}>
              <Heart className="size-[22px]" />
            </HeaderIconLink>
            <HeaderIconLink to={ROUTES.compare} label="Compare" count={compareCount}>
              <GitCompareArrows className="size-[22px]" />
            </HeaderIconLink>
          </div>
          <HeaderIconLink to={ROUTES.cart} label="Cart" count={cartCount}>
            <ShoppingCart className="size-[24px] fill-brand" />
          </HeaderIconLink>
          <div className="hidden lg:block">
            <UserMenu />
          </div>
          <div className="hidden lg:block">
            <LanguageMenu />
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-ink transition hover:bg-black/5 lg:hidden"
            aria-label="Open menu"
            aria-controls="mobile-nav"
            onClick={() => dispatch(setMobileNav(true))}
          >
            <Menu className="size-7" />
          </button>
        </div>
      </div>

      {openMenuCategory && <MegaMenu category={openMenuCategory} onClose={closeMenu} />}
      <MobileNav />
    </header>
  )
}
