/*
 * Static marketing content for the home page and camper FAQ.
 * The backend has no CMS endpoints for videos, blog posts or FAQs, so this copy and the
 * imagery (exported from the Figma file) ship with the frontend. Marketplace data
 * (campers, reviews, camping places, bookings) always comes from the API.
 */
import awning from '@/assets/images/lifestyle/awning.jpg'
import campfire from '@/assets/images/lifestyle/campfire.jpg'
import classicCamper from '@/assets/images/lifestyle/classic-camper.jpg'
import coastCamper from '@/assets/images/lifestyle/coast-camper.jpg'
import forestCamp from '@/assets/images/lifestyle/forest-camp.jpg'
import lakeCamper from '@/assets/images/lifestyle/lake-camper.jpg'
import popupVan from '@/assets/images/lifestyle/popup-van.jpg'
import tentNight from '@/assets/images/lifestyle/tent-night.jpg'
import vwVan from '@/assets/images/lifestyle/vw-van.jpg'

export interface MediaItem {
  id: string
  title: string
  image: string
}

export const VIDEOS: MediaItem[] = [
  { id: 'v1', title: 'Pop-up roof in 30 seconds', image: popupVan },
  { id: 'v2', title: 'Living the classic camper life', image: classicCamper },
  { id: 'v3', title: 'Coastal route along the East Sea', image: coastCamper },
  { id: 'v4', title: 'Night camping essentials', image: tentNight },
  { id: 'v5', title: 'Lake-side weekend', image: lakeCamper },
  { id: 'v6', title: 'Campfire cooking 101', image: campfire },
  { id: 'v7', title: 'Restoring a vintage van', image: vwVan },
  { id: 'v8', title: 'Setting up your awning', image: forestCamp },
]

export const BLOG_IMAGES: MediaItem[] = [
  { id: 'b1', title: 'Awning afternoons', image: awning },
  { id: 'b2', title: 'Into the forest', image: forestCamp },
  { id: 'b3', title: 'Coastline mornings', image: coastCamper },
  { id: 'b4', title: 'Pop-up adventures', image: popupVan },
  { id: 'b5', title: 'Vintage charm', image: vwVan },
  { id: 'b6', title: 'Nights under canvas', image: tentNight },
]

export const CAMPER_FAQ = [
  { q: 'What driving licence do I need?', a: 'Each camper lists the required Korean licence class. Campers up to 3.5 t can usually be driven with a class 2 ordinary licence; larger vehicles and trailers need class 1 or a special trailer licence.' },
  { q: 'When is my booking confirmed?', a: 'Your dates are held for a short time after you book. The booking is confirmed as soon as the payment is completed.' },
  { q: 'Can I cancel my booking?', a: 'Unpaid bookings can be cancelled at any time. Paid bookings can be cancelled online until the free-cancellation deadline shown on your booking.' },
  { q: 'When is the security deposit returned?', a: 'The deposit is paid at pickup and returned after the camper comes back in the same condition.' },
]
