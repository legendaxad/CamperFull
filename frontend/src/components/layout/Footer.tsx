import { Link } from 'react-router-dom'
import footerSocial from '@/assets/icons/footer-social.svg'
import { useAppSelector } from '@/app/hooks'
import { FOOTER_LINKS } from '@/constants/navigation'
import { selectSettings } from '@/features/content/contentSlice'
import { Logo } from './Logo'

const YEAR = new Date().getFullYear()

/** Footer from the Figma "footer" component (brand-blue band, four columns). */
export function Footer() {
  // Contact details come from the business settings (GET /settings); Figma copy is the fallback.
  const settings = useAppSelector(selectSettings)
  const email = settings?.contactEmail ?? 'camper@example.com'
  const phone = settings?.contactPhone ?? '(021) 345-6789-99'
  return (
    <footer className="bg-brand text-white">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 md:py-14 lg:grid-cols-4 lg:py-[50px]">
        <div>
          <Logo tone="white" className="md:text-[40px]" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/80">
            Rent, compare and publish campers across Korea.
          </p>
        </div>
        <nav aria-label="Services">
          <h2 className="text-xl font-semibold">Services</h2>
          <ul className="mt-6 space-y-2.5 text-sm font-medium">
            {FOOTER_LINKS.services.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className="text-white/90 transition hover:text-white hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Menu">
          <h2 className="text-xl font-semibold">Menu</h2>
          <ul className="mt-6 space-y-2.5 text-sm font-medium">
            {FOOTER_LINKS.menu.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className="text-white/90 transition hover:text-white hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="text-xl font-semibold">Contact</h2>
          <img src={footerSocial} alt="YouTube, Instagram and Naver" width={89} height={25} className="mt-6" />
          <address className="mt-4 space-y-1.5 text-sm font-medium not-italic">
            <p>{settings?.address ?? '021 Korea Seoul, LA'}</p>
            <p>
              <a href={`mailto:${email}`} className="hover:underline">
                {email}
              </a>
            </p>
            <p>
              <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="hover:underline">
                {phone}
              </a>
            </p>
          </address>
        </div>
      </div>
      <div className="border-t border-white/15">
        <p className="container-page py-5 text-xs text-white/70">
          © {YEAR} {settings?.businessName ?? 'FullCamper'} — camper rentals in Korea.
        </p>
      </div>
    </footer>
  )
}
