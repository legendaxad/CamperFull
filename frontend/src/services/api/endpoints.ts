/** Backend routes (relative to API_BASE_URL). Source: backend/src/routes/*.ts */
export const ENDPOINTS = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
    changePassword: '/auth/me/password',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
  },
  members: {
    me: '/members/me',
    avatar: '/members/me/avatar',
  },
  campers: {
    list: '/campers',
    filters: '/campers/filters',
    compare: '/campers/compare',
    detail: (idOrSlug: string) => `/campers/${encodeURIComponent(idOrSlug)}`,
    availability: (idOrSlug: string) => `/campers/${encodeURIComponent(idOrSlug)}/availability`,
    reviews: (idOrSlug: string) => `/campers/${encodeURIComponent(idOrSlug)}/reviews`,
  },
  categories: '/categories',
  features: '/features',
  campingPlaces: '/camping-places',
  settings: '/settings',
  bookings: {
    quote: '/bookings/quote',
    list: '/bookings',
    create: '/bookings',
    detail: (id: string) => `/bookings/${id}`,
    cancel: (id: string) => `/bookings/${id}/cancel`,
  },
  payments: {
    checkout: '/payments/checkout',
    confirm: '/payments/confirm',
  },
  favorites: {
    list: '/favorites',
    ids: '/favorites/ids',
    item: (camperId: string) => `/favorites/${camperId}`,
  },
  reviews: '/reviews',
  myReviews: '/reviews/me',
  inquiries: '/inquiries',
} as const
