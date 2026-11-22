import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { HeroCarousel } from './HeroCarousel'
import { BlogsSection, PublishCta, VideosSection } from './MediaSections'
import { RecommendSection } from './RecommendSection'

export default function HomePage() {
  useDocumentTitle(null)
  return (
    <>
      <HeroCarousel />
      <RecommendSection />
      <VideosSection />
      <PublishCta />
      <BlogsSection />
    </>
  )
}
