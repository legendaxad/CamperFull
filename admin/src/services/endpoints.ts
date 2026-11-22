import type {
  ActivityPage,
  ActivityType,
  AppNotification,
  Booking,
  BookingPoint,
  BookingStatus,
  BusinessSettings,
  Camper,
  CamperStatus,
  Category,
  CustomerAnalytics,
  CustomerDetail,
  Feature,
  FleetResponse,
  Interval,
  KpiResponse,
  Member,
  MemberStatus,
  Overview,
  Paginated,
  Payment,
  PaymentStatus,
  PaymentSummary,
  RevenuePoint,
  TopCamper,
} from '@/types/api'
import { api, BUSINESS_TAGS } from './api'

/* ---------- Query argument types ---------- */

export interface RangeArgs {
  from: string
  to: string
  interval?: Interval
  limit?: number
}

export interface BookingListArgs {
  page: number
  limit: number
  status?: BookingStatus[]
  search?: string
  camperId?: string
  customerId?: string
  from?: string
  to?: string
  sort?: 'newest' | 'oldest' | 'start_asc' | 'start_desc' | 'total_desc'
}

export interface CamperListArgs {
  page: number
  limit: number
  status?: CamperStatus[]
  search?: string
  category?: string
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'popular'
}

export interface MemberListArgs {
  page: number
  limit: number
  search?: string
  status?: MemberStatus
  sort?: 'newest' | 'oldest' | 'name'
}

export interface PaymentListArgs {
  page: number
  limit: number
  status?: PaymentStatus[]
  search?: string
  customerId?: string
  bookingId?: string
  from?: string
  to?: string
}

/** Body accepted by POST/PATCH /admin/campers (backend camperCreateSchema). */
export interface CamperInput {
  name: string
  category: string
  features: string[]
  description: string
  highlights: { title: string; description: string }[]
  brand?: string
  company?: string
  baseVehicle?: string
  modelYear?: number
  licenseType: Camper['licenseType']
  capacity: { seats: number; sleeps: number }
  specifications: Partial<Camper['specifications']>
  location: Camper['location']
  pricing: { dailyRate: number; weekendDailyRate?: number; cleaningFee: number; securityDeposit: number }
  extras: { _id?: string; name: string; price: number; chargeType: 'PER_BOOKING' | 'PER_NIGHT'; maxQuantity: number }[]
  minNights: number
  maxNights: number
  status: CamperStatus
  isFeatured: boolean
}

const listTag = <T extends string>(type: T) => ({ type, id: 'LIST' as const })

export const adminApi = api.injectEndpoints({
  endpoints: (build) => ({
    /* ---------- Auth ---------- */
    me: build.query<{ member: Member }, void>({
      query: () => ({ url: '/auth/me' }),
      providesTags: ['Me'],
    }),
    login: build.mutation<{ member: Member }, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    logout: build.mutation<null, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
    }),
    updateProfile: build.mutation<{ member: Member }, { firstName?: string; lastName?: string; phone?: string | null }>({
      query: (body) => ({ url: '/auth/me', method: 'PATCH', body }),
      invalidatesTags: ['Me'],
    }),
    changePassword: build.mutation<null, { currentPassword: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/me/password', method: 'PATCH', body }),
    }),

    /* ---------- Dashboard & analytics ---------- */
    overview: build.query<Overview, void>({
      query: () => ({ url: '/dashboard/overview' }),
      providesTags: ['Analytics'],
    }),
    kpis: build.query<KpiResponse, RangeArgs>({
      query: ({ from, to }) => ({ url: '/dashboard/kpis', params: { from, to } }),
      providesTags: ['Analytics'],
    }),
    revenueSeries: build.query<RevenuePoint[], RangeArgs>({
      query: (params) => ({ url: '/dashboard/revenue', params }),
      providesTags: ['Analytics'],
    }),
    bookingSeries: build.query<BookingPoint[], RangeArgs>({
      query: (params) => ({ url: '/dashboard/bookings', params }),
      providesTags: ['Analytics'],
    }),
    topCampers: build.query<TopCamper[], RangeArgs>({
      query: (params) => ({ url: '/dashboard/top-campers', params }),
      providesTags: ['Analytics'],
    }),
    fleet: build.query<FleetResponse, RangeArgs>({
      query: ({ from, to }) => ({ url: '/dashboard/fleet', params: { from, to } }),
      providesTags: ['Analytics'],
    }),
    customerAnalytics: build.query<CustomerAnalytics, RangeArgs>({
      query: (params) => ({ url: '/dashboard/customers', params }),
      providesTags: ['Analytics'],
    }),
    paymentSummary: build.query<PaymentSummary, RangeArgs>({
      query: ({ from, to }) => ({ url: '/dashboard/payments', params: { from, to } }),
      providesTags: ['Analytics'],
    }),
    activity: build.query<ActivityPage, { page: number; limit: number; type?: ActivityType[] }>({
      query: (params) => ({ url: '/dashboard/activity', params }),
      providesTags: ['Analytics'],
    }),

    /* ---------- Bookings ---------- */
    bookings: build.query<Paginated<Booking>, BookingListArgs>({
      query: (params) => ({ url: '/bookings', params, paginated: true }),
      providesTags: (result) => [listTag('Booking'), ...(result?.items.map((b) => ({ type: 'Booking' as const, id: b._id })) ?? [])],
    }),
    booking: build.query<Booking, string>({
      query: (id) => ({ url: `/bookings/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Booking', id }],
    }),
    updateBookingStatus: build.mutation<Booking, { id: string; status: BookingStatus; reason?: string; refund?: boolean }>({
      query: ({ id, ...body }) => ({ url: `/bookings/${id}/status`, method: 'PATCH', body }),
      invalidatesTags: [...BUSINESS_TAGS, 'Notification'],
    }),
    updateBookingNote: build.mutation<Booking, { id: string; adminNote: string }>({
      query: ({ id, adminNote }) => ({ url: `/bookings/${id}/note`, method: 'PATCH', body: { adminNote } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Booking', id }],
    }),

    /* ---------- Campers ---------- */
    campers: build.query<Paginated<Camper>, CamperListArgs>({
      query: (params) => ({ url: '/campers', params, paginated: true }),
      providesTags: (result) => [listTag('Camper'), ...(result?.items.map((c) => ({ type: 'Camper' as const, id: c._id })) ?? [])],
    }),
    camper: build.query<Camper, string>({
      query: (id) => ({ url: `/campers/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Camper', id }],
    }),
    createCamper: build.mutation<Camper, CamperInput>({
      query: (body) => ({ url: '/campers', method: 'POST', body }),
      invalidatesTags: [listTag('Camper'), 'Analytics'],
    }),
    updateCamper: build.mutation<Camper, { id: string; body: Partial<CamperInput> }>({
      query: ({ id, body }) => ({ url: `/campers/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Camper', id }, listTag('Camper'), 'Analytics'],
    }),
    setCamperStatus: build.mutation<Camper, { id: string; status: CamperStatus }>({
      query: ({ id, status }) => ({ url: `/campers/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Camper', id }, listTag('Camper'), 'Analytics'],
    }),
    deleteCamper: build.mutation<null, string>({
      query: (id) => ({ url: `/campers/${id}`, method: 'DELETE' }),
      invalidatesTags: [listTag('Camper'), 'Analytics'],
    }),
    uploadCamperImages: build.mutation<Camper, { id: string; files: File[] }>({
      query: ({ id, files }) => {
        const form = new FormData()
        for (const file of files) form.append('images', file)
        return { url: `/campers/${id}/images`, method: 'POST', body: form }
      },
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Camper', id }, listTag('Camper')],
    }),
    deleteCamperImage: build.mutation<Camper, { id: string; imageId: string }>({
      query: ({ id, imageId }) => ({ url: `/campers/${id}/images/${imageId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Camper', id }, listTag('Camper')],
    }),
    reorderCamperImages: build.mutation<Camper, { id: string; imageIds: string[] }>({
      query: ({ id, imageIds }) => ({ url: `/campers/${id}/images/order`, method: 'PATCH', body: { imageIds } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Camper', id }, listTag('Camper')],
    }),
    categories: build.query<Category[], void>({
      query: () => ({ url: '/categories' }),
      providesTags: ['Catalog'],
    }),
    features: build.query<Feature[], void>({
      query: () => ({ url: '/features' }),
      providesTags: ['Catalog'],
    }),

    /* ---------- Customers ---------- */
    customers: build.query<Paginated<Member>, MemberListArgs>({
      query: (params) => ({ url: '/customers', params, paginated: true }),
      providesTags: (result) => [listTag('Customer'), ...(result?.items.map((m) => ({ type: 'Customer' as const, id: m._id })) ?? [])],
    }),
    customer: build.query<CustomerDetail, string>({
      query: (id) => ({ url: `/customers/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Customer', id }],
    }),
    setCustomerStatus: build.mutation<Member, { id: string; status: 'ACTIVE' | 'BLOCKED' }>({
      query: ({ id, status }) => ({ url: `/customers/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Customer', id }, listTag('Customer')],
    }),

    /* ---------- Payments ---------- */
    payments: build.query<Paginated<Payment>, PaymentListArgs>({
      query: (params) => ({ url: '/payments', params, paginated: true }),
      providesTags: (result) => [listTag('Payment'), ...(result?.items.map((p) => ({ type: 'Payment' as const, id: p._id })) ?? [])],
    }),
    payment: build.query<Payment, string>({
      query: (id) => ({ url: `/payments/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Payment', id }],
    }),
    refundPayment: build.mutation<Payment, { id: string; amount?: number; reason: string }>({
      query: ({ id, ...body }) => ({ url: `/payments/${id}/refund`, method: 'POST', body }),
      invalidatesTags: [...BUSINESS_TAGS],
    }),

    /* ---------- Notifications ---------- */
    notifications: build.query<Paginated<AppNotification>, { page: number; limit: number; unread?: boolean }>({
      query: (params) => ({ url: '/notifications', params, paginated: true }),
      providesTags: [listTag('Notification')],
    }),
    unreadCount: build.query<{ count: number }, void>({
      query: () => ({ url: '/notifications/unread-count' }),
      providesTags: [listTag('Notification')],
    }),
    markNotificationRead: build.mutation<AppNotification, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: [listTag('Notification')],
    }),
    markAllNotificationsRead: build.mutation<unknown, void>({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }),
      invalidatesTags: [listTag('Notification')],
    }),
    deleteNotification: build.mutation<null, string>({
      query: (id) => ({ url: `/notifications/${id}`, method: 'DELETE' }),
      invalidatesTags: [listTag('Notification')],
    }),

    /* ---------- Settings & administrators ---------- */
    settings: build.query<BusinessSettings, void>({
      query: () => ({ url: '/settings' }),
      providesTags: ['Settings'],
    }),
    updateSettings: build.mutation<BusinessSettings, Partial<Omit<BusinessSettings, 'currency' | 'createdAt' | 'updatedAt'>>>({
      query: (body) => ({ url: '/settings', method: 'PATCH', body }),
      invalidatesTags: ['Settings'],
    }),
    admins: build.query<Paginated<Member>, MemberListArgs>({
      query: (params) => ({ url: '/admins', params, paginated: true }),
      providesTags: ['Admin'],
    }),
    createAdmin: build.mutation<Member, { firstName: string; lastName: string; email: string; phone?: string; password: string; role: 'ADMIN' | 'SUPER_ADMIN' }>({
      query: (body) => ({ url: '/admins', method: 'POST', body }),
      invalidatesTags: ['Admin'],
    }),
    updateAdmin: build.mutation<Member, { id: string; role?: 'ADMIN' | 'SUPER_ADMIN'; status?: 'ACTIVE' | 'BLOCKED' }>({
      query: ({ id, ...body }) => ({ url: `/admins/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Admin'],
    }),
  }),
})

export const {
  useMeQuery,
  useLoginMutation,
  useLogoutMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useOverviewQuery,
  useKpisQuery,
  useRevenueSeriesQuery,
  useBookingSeriesQuery,
  useTopCampersQuery,
  useFleetQuery,
  useCustomerAnalyticsQuery,
  usePaymentSummaryQuery,
  useActivityQuery,
  useBookingsQuery,
  useBookingQuery,
  useUpdateBookingStatusMutation,
  useUpdateBookingNoteMutation,
  useCampersQuery,
  useCamperQuery,
  useCreateCamperMutation,
  useUpdateCamperMutation,
  useSetCamperStatusMutation,
  useDeleteCamperMutation,
  useUploadCamperImagesMutation,
  useDeleteCamperImageMutation,
  useReorderCamperImagesMutation,
  useCategoriesQuery,
  useFeaturesQuery,
  useCustomersQuery,
  useCustomerQuery,
  useSetCustomerStatusMutation,
  usePaymentsQuery,
  usePaymentQuery,
  useRefundPaymentMutation,
  useNotificationsQuery,
  useUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
  useSettingsQuery,
  useUpdateSettingsMutation,
  useAdminsQuery,
  useCreateAdminMutation,
  useUpdateAdminMutation,
} = adminApi
