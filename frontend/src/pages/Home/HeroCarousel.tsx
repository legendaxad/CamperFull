import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import heroCaravan from '@/assets/images/heroes/hero-caravan.jpg'
import heroCoast from '@/assets/images/heroes/hero-coast.jpg'
import heroHome from '@/assets/images/heroes/hero-home.jpg'
import { Button } from '@/components/common/Button'
import { CarouselArrow, CarouselDots } from '@/components/common/CarouselControls'
import { ROUTES } from '@/constants/navigation'
import { listingQueryToParams } from '@/features/campers/camperFilters'
import { useCarousel } from '@/hooks/useCarousel'
import { cn } from '@/utils/cn'

const SLIDES = [
  { image: heroHome, title: 'Wake up somewhere new', text: 'Motorhomes and campervans ready for the mountains.' },
  { image: heroCoast, title: 'Follow the coastline', text: 'Hand-picked campers for unforgettable road trips.' },
  { image: heroCaravan, title: 'Camp in comfort', text: 'Caravans with full kitchens, showers and heating.' },
]

/** Home hero slider (Figma frame "main": 525px photo with arrows and dots). */
export function HeroCarousel() {
  const { index, go, next, prev, pauseHandlers } = useCarousel({ count: SLIDES.length, autoplayMs: 6500 })
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const onSearch = (event: FormEvent) => {
    event.preventDefault()
    navigate({ pathname: ROUTES.campers, search: listingQueryToParams({ search: query }).toString() })
  }

  return (
    <section
      className="relative h-[440px] overflow-hidden bg-ink md:h-[480px] lg:h-[525px]"
      aria-roledescription="carousel"
      aria-label="Featured trips"
      {...pauseHandlers}
    >
      {SLIDES.map((slide, i) => (
        <img
          key={slide.image}
          src={slide.image}
          alt=""
          aria-hidden={i !== index}
          fetchPriority={i === 0 ? 'high' : 'low'}
          className={cn(
            'absolute inset-0 size-full object-cover transition-opacity duration-700',
            i === index ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" aria-hidden />

      <div className="container-page relative flex h-full flex-col justify-center pb-10">
        <div key={index} className="max-w-xl animate-slide-up text-white" aria-live="polite">
          <h1 className="text-[34px] leading-tight font-bold md:text-5xl lg:text-[56px]">{SLIDES[index]?.title}</h1>
          <p className="mt-3 text-base text-white/90 md:text-lg">{SLIDES[index]?.text}</p>
        </div>
        <form
          onSubmit={onSearch}
          role="search"
          className="mt-7 flex w-full max-w-xl items-center gap-2 rounded-[14px] bg-white p-2 shadow-raised"
        >
          <Search className="ml-2 size-5 shrink-0 text-muted" aria-hidden />
          <label htmlFor="hero-search" className="sr-only">
            Search campers
          </label>
          <input
            id="hero-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Brand, model or city…"
            className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-ink outline-none placeholder:text-muted"
          />
          <Button type="submit" size="sm" className="h-10 px-5">
            Search
          </Button>
        </form>
      </div>

      <CarouselArrow direction="prev" tone="glass" onClick={prev} className="absolute top-1/2 left-4 hidden -translate-y-1/2 md:flex lg:left-[30px]" />
      <CarouselArrow direction="next" tone="glass" onClick={next} className="absolute top-1/2 right-4 hidden -translate-y-1/2 md:flex lg:right-[30px]" />
      <div className="absolute inset-x-0 bottom-6">
        <CarouselDots count={SLIDES.length} index={index} onSelect={go} tone="light" />
      </div>
    </section>
  )
}
