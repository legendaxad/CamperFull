import { ArrowRight, Camera, Play, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ButtonLink } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ROUTES } from '@/constants/navigation'
import { BLOG_IMAGES, VIDEOS, type MediaItem } from '@/constants/editorial'

/* Editorial content (videos/blog) is static marketing content — the backend has no CMS endpoints. */

function PlayBadge({ large = false }: { large?: boolean }) {
  return (
    <span
      className={`flex items-center justify-center rounded-full border-2 border-white/80 bg-white/25 text-white backdrop-blur-sm transition group-hover:scale-110 ${
        large ? 'size-14' : 'size-12 md:size-14'
      }`}
    >
      <Play className="ml-0.5 size-6 fill-white" aria-hidden />
    </span>
  )
}

/** "Videos" grid + "Name of the video" modal (Figma frames 0:30 and 0:451). */
export function VideosSection() {
  const [active, setActive] = useState<MediaItem | null>(null)
  const [playRequested, setPlayRequested] = useState(false)

  const close = () => {
    setActive(null)
    setPlayRequested(false)
  }

  return (
    <section className="py-12 md:py-16" aria-labelledby="videos-title">
      <div className="container-page">
        <div className="text-center">
          <h2 id="videos-title" className="section-title">
            Videos
          </h2>
        </div>
        <ul className="mt-10 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
          {VIDEOS.map((video) => (
            <li key={video.id}>
              <button
                type="button"
                onClick={() => setActive(video)}
                className="group relative block aspect-video w-full overflow-hidden rounded-[20px] min-[480px]:aspect-square"
                aria-label={`Play video: ${video.title}`}
              >
                <img src={video.image} alt="" loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/35 transition group-hover:bg-black/25">
                  <PlayBadge />
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-left text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  {video.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Modal open={active !== null} onClose={close} title={active?.title ?? ''} size="lg">
        {active && (
          <div className="relative overflow-hidden rounded-[20px]">
            <img src={active.image} alt="" className="aspect-video w-full object-cover" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 p-6 text-center text-white">
              {playRequested ? (
                <p className="max-w-sm text-sm font-medium">
                  Full videos are coming soon. Enjoy the preview for now!
                </p>
              ) : (
                <button type="button" onClick={() => setPlayRequested(true)} className="group" aria-label="Play">
                  <PlayBadge large />
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}

/** New section (not in Figma) promoting the publishing feature, styled with existing tokens. */
export function PublishCta() {
  return (
    <section className="py-6 md:py-10">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-[24px] bg-brand px-6 py-10 text-white md:px-12 md:py-14">
          <div className="absolute -top-16 -right-16 size-64 rounded-full bg-white/10" aria-hidden />
          <div className="absolute -bottom-24 right-40 size-56 rounded-full bg-accent/30" aria-hidden />
          <div className="relative grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                <Sparkles className="size-3.5" aria-hidden /> For camper owners
              </p>
              <h2 className="mt-4 text-3xl leading-tight font-bold md:text-4xl">Your camper could be earning while you're home.</h2>
              <p className="mt-3 max-w-lg text-white/85">
                Prepare your listing in seven guided steps — photos, pricing and availability included. Listings are
                saved in your browser while camper submissions are being rolled out.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col md:items-end">
              <ButtonLink to={ROUTES.publish} variant="accent" size="lg" icon={<Camera className="size-5" aria-hidden />}>
                List your camper
              </ButtonLink>
              <Link to={ROUTES.myCampers} className="inline-flex items-center gap-1 text-sm font-semibold text-white/90 hover:text-white">
                Manage my campers <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** "Blogs" section (Figma: intro column + 3×2 photo grid). */
export function BlogsSection() {
  return (
    <section className="py-12 md:py-16" aria-labelledby="blogs-title">
      <div className="container-page">
        <div className="text-center">
          <h2 id="blogs-title" className="section-title">
            Blogs
          </h2>
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="lg:pt-2">
            <h3 className="text-2xl font-semibold">Camper</h3>
            <p className="mt-8 text-base text-accent">@camper_1</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink">
              Camping truly is for everyone, from your oldest family member to little campers just trekking out for the
              first time. Whether your plan is to relax, explore or reconnect, CAMPER campgrounds are a great place to
              create memories with those you love.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
            {BLOG_IMAGES.map((item) => (
              <li key={item.id} className="group relative aspect-square overflow-hidden rounded-[20px]">
                <img src={item.image} alt={item.title} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs font-semibold text-white">
                  {item.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
