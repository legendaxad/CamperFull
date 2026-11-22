export const ROUTES = {
  home: '/',
  campers: '/campers',
  category: (slug: string) => `/campers/${slug}`,
  /** Detail pages use the camper slug (the backend accepts id or slug). */
  camper: (slug: string) => `/camper/${slug}`,
  compare: '/compare',
  favorites: '/favorites',
  cart: '/cart',
  signIn: '/sign-in',
  register: '/register',
  publish: '/publish',
  publishSuccess: (id: string) => `/publish/success/${id}`,
  myCampers: '/my-campers',
  bookings: '/bookings',
  booking: (id: string) => `/bookings/${id}`,
  checkout: (camperId: string) => `/checkout/${camperId}`,
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  profile: '/profile',
  campingPlaces: '/camping-places',
} as const


export const FOOTER_LINKS = {
  services: [
    { label: 'Camping', to: ROUTES.campingPlaces },
    { label: 'Campers', to: ROUTES.campers },
    { label: 'Compare', to: ROUTES.compare },
  ],
  menu: [
    { label: 'About', to: ROUTES.home },
    { label: 'Services', to: ROUTES.campers },
    { label: 'Booking', to: ROUTES.bookings },
    { label: 'List your camper', to: ROUTES.publish },
  ],
}
