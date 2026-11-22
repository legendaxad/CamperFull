import { createEntityAdapter, createSlice, type EntityState } from '@reduxjs/toolkit'
import { createAppAsyncThunk } from '@/app/createAppAsyncThunk'
import type { RootState } from '@/app/store'
import { logoutUser, sessionExpired } from '@/features/auth/authSlice'
import type { RequestStatus } from '@/features/campers/camperSlice'
import { describeError, toApiError } from '@/services/api/errors'
import { bookingApi, type BookingCreateRequest, type BookingScope } from '@/services/bookingApi'
import { completePayment } from '@/services/paymentFlow'
import type { ApiErrorDetail, Booking, PaginationMeta } from '@/types/api'

/*
 * Customer bookings (server state).
 * Lifecycle (backend Booking.service): PENDING (dates held while paying) -> CONFIRMED
 * after payment -> ACTIVE -> COMPLETED, or CANCELLED / REJECTED.
 */
const bookingsAdapter = createEntityAdapter<Booking, string>({ selectId: (b) => b._id })

export interface BookingState {
  entities: EntityState<Booking, string>
  list: { key: string | null; ids: string[]; meta: PaginationMeta | null; status: RequestStatus; error: string | null }
  details: Record<string, { status: RequestStatus; error: string | null }>
  /** Ids with a mutation in flight (pay / cancel) — blocks duplicate submissions. */
  pending: string[]
}

const initialState: BookingState = {
  entities: bookingsAdapter.getInitialState(),
  list: { key: null, ids: [], meta: null, status: 'idle', error: null },
  details: {},
  pending: [],
}

export interface BookingListParams {
  page: number
  scope: BookingScope
}

const listKey = (p: BookingListParams) => `${p.scope}:${p.page}`

export const fetchBookings = createAppAsyncThunk(
  'bookings/fetchList',
  async ({ page, scope }: BookingListParams, { rejectWithValue }) => {
    try {
      return await bookingApi.list({ page, scope, limit: 10 })
    } catch (error) {
      return rejectWithValue(describeError(error))
    }
  },
  {
    condition: (params, { getState }) => {
      const { list } = getState().bookings
      return !(list.key === listKey(params) && list.status === 'loading')
    },
  },
)

export const fetchBooking = createAppAsyncThunk(
  'bookings/fetchOne',
  async (id: string, { rejectWithValue }) => {
    try {
      return await bookingApi.get(id)
    } catch (error) {
      return rejectWithValue(describeError(error))
    }
  },
  { condition: (id, { getState }) => getState().bookings.details[id]?.status !== 'loading' },
)

export interface BookingRejection {
  message: string
  fieldErrors: ApiErrorDetail[]
}

/** Creates a PENDING booking; the server re-validates dates, availability and price. */
export const createBooking = createAppAsyncThunk<Booking, BookingCreateRequest, { rejectValue: BookingRejection }>(
  'bookings/create',
  async (body, { rejectWithValue }) => {
    try {
      return await bookingApi.create(body)
    } catch (error) {
      const apiError = toApiError(error)
      return rejectWithValue({ message: describeError(apiError), fieldErrors: apiError.fieldErrors })
    }
  },
)

/** Runs checkout + provider payment + confirm, then reloads the (now CONFIRMED) booking. */
export const payBooking = createAppAsyncThunk(
  'bookings/pay',
  async (bookingId: string, { rejectWithValue }) => {
    try {
      await completePayment(bookingId)
      return await bookingApi.get(bookingId)
    } catch (error) {
      return rejectWithValue(describeError(error))
    }
  },
  { condition: (id, { getState }) => !getState().bookings.pending.includes(id) },
)

export const cancelBooking = createAppAsyncThunk(
  'bookings/cancel',
  async ({ id, reason }: { id: string; reason?: string }, { rejectWithValue }) => {
    try {
      return await bookingApi.cancel(id, reason)
    } catch (error) {
      return rejectWithValue(describeError(error))
    }
  },
  { condition: ({ id }, { getState }) => !getState().bookings.pending.includes(id) },
)

/** The cancel endpoint returns the booking without the populated camper — keep the one we have. */
function mergeBooking(state: BookingState, booking: Booking) {
  const existing = state.entities.entities[booking._id]
  const camper = booking.camper && typeof booking.camper === 'object' ? booking.camper : (existing?.camper ?? null)
  bookingsAdapter.upsertOne(state.entities, { ...booking, camper })
}

const bookingSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBookings.pending, (state, action) => {
        state.list.key = listKey(action.meta.arg)
        state.list.status = 'loading'
        state.list.error = null
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        if (state.list.key !== listKey(action.meta.arg)) return
        bookingsAdapter.upsertMany(state.entities, action.payload.items)
        state.list.ids = action.payload.items.map((b) => b._id)
        state.list.meta = action.payload.meta
        state.list.status = 'succeeded'
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        if (state.list.key !== listKey(action.meta.arg)) return
        state.list.status = 'failed'
        state.list.error = action.payload ?? 'Bookings could not be loaded.'
      })
      .addCase(fetchBooking.pending, (state, action) => {
        state.details[action.meta.arg] = { status: 'loading', error: null }
      })
      .addCase(fetchBooking.fulfilled, (state, action) => {
        mergeBooking(state, action.payload)
        state.details[action.meta.arg] = { status: 'succeeded', error: null }
      })
      .addCase(fetchBooking.rejected, (state, action) => {
        state.details[action.meta.arg] = { status: 'failed', error: action.payload ?? 'Booking could not be loaded.' }
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        mergeBooking(state, action.payload)
        state.details[action.payload._id] = { status: 'succeeded', error: null }
        state.list.key = null // list is stale now
      })
      .addCase(payBooking.pending, (state, action) => {
        state.pending.push(action.meta.arg)
      })
      .addCase(payBooking.fulfilled, (state, action) => {
        state.pending = state.pending.filter((id) => id !== action.meta.arg)
        mergeBooking(state, action.payload)
        state.list.key = null
      })
      .addCase(payBooking.rejected, (state, action) => {
        state.pending = state.pending.filter((id) => id !== action.meta.arg)
      })
      .addCase(cancelBooking.pending, (state, action) => {
        state.pending.push(action.meta.arg.id)
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        state.pending = state.pending.filter((id) => id !== action.meta.arg.id)
        mergeBooking(state, action.payload)
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.pending = state.pending.filter((id) => id !== action.meta.arg.id)
      })
      .addCase(logoutUser.fulfilled, () => initialState)
      .addCase(sessionExpired, () => initialState)
  },
})

const bookingSelectors = bookingsAdapter.getSelectors((state: RootState) => state.bookings.entities)

export const selectBookingList = (state: RootState) => state.bookings.list
export const selectBookingById = (state: RootState, id: string | undefined) => (id ? bookingSelectors.selectById(state, id) : undefined)
export const selectBookingDetailRequest = (state: RootState, id: string | undefined) => (id ? state.bookings.details[id] : undefined)
export const selectIsBookingPending = (state: RootState, id: string) => state.bookings.pending.includes(id)
export const selectListedBookings = (state: RootState) =>
  state.bookings.list.ids.map((id) => state.bookings.entities.entities[id]).filter((b): b is Booking => b !== undefined)

export default bookingSlice.reducer
