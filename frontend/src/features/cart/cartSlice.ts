import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { createAppAsyncThunk } from '@/app/createAppAsyncThunk'
import type { RootState } from '@/app/store'
import { createBooking } from '@/features/bookings/bookingSlice'
import type { RequestStatus } from '@/features/campers/camperSlice'
import { describeError } from '@/services/api/errors'
import { bookingApi, type ExtraSelection } from '@/services/bookingApi'
import type { BookingQuote } from '@/types/api'

/*
 * The cart is a local "trip planner": the backend has no cart, and a booking holds a
 * camper only for a short payment window. Each cart item therefore becomes its own
 * booking at checkout. Prices are never computed here — they come from POST /bookings/quote.
 * A small snapshot (name, image, rate) lets the cart render without refetching campers.
 */
export interface CartItem {
  camperId: string
  slug: string
  name: string
  image: string | null
  dailyRate: number
  startDate: string
  endDate: string
  extras: ExtraSelection[]
  addedAt: string
}

interface QuoteState {
  key: string
  status: RequestStatus
  data: BookingQuote | null
  error: string | null
}

export interface CartState {
  items: CartItem[]
  quotes: Record<string, QuoteState>
}

const initialState: CartState = { items: [], quotes: {} }

export const quoteKey = (item: Pick<CartItem, 'camperId' | 'startDate' | 'endDate' | 'extras'>) =>
  `${item.camperId}|${item.startDate}|${item.endDate}|${item.extras.map((e) => `${e.extraId}x${e.quantity}`).join(',')}`

export const fetchCartQuote = createAppAsyncThunk(
  'cart/fetchQuote',
  async (item: CartItem, { rejectWithValue }) => {
    try {
      return await bookingApi.quote({ camperId: item.camperId, startDate: item.startDate, endDate: item.endDate, extras: item.extras })
    } catch (error) {
      return rejectWithValue(describeError(error))
    }
  },
  {
    condition: (item, { getState }) => {
      const quote = getState().cart.quotes[item.camperId]
      return !(quote && quote.key === quoteKey(item) && quote.status !== 'failed')
    },
  },
)

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    /** Adds a camper, or replaces its dates/extras when it is already in the cart. */
    addToCart: {
      reducer(state, action: PayloadAction<CartItem>) {
        const index = state.items.findIndex((i) => i.camperId === action.payload.camperId)
        if (index === -1) state.items.push(action.payload)
        else state.items[index] = { ...action.payload, addedAt: state.items[index]!.addedAt }
      },
      prepare(item: Omit<CartItem, 'addedAt'>) {
        return { payload: { ...item, addedAt: new Date().toISOString() } }
      },
    },
    updateCartItem(state, action: PayloadAction<{ camperId: string } & Partial<Pick<CartItem, 'startDate' | 'endDate' | 'extras'>>>) {
      const item = state.items.find((i) => i.camperId === action.payload.camperId)
      if (item) Object.assign(item, action.payload)
    },
    removeFromCart(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.camperId !== action.payload)
      delete state.quotes[action.payload]
    },
    clearCart(state) {
      state.items = []
      state.quotes = {}
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCartQuote.pending, (state, action) => {
        state.quotes[action.meta.arg.camperId] = { key: quoteKey(action.meta.arg), status: 'loading', data: null, error: null }
      })
      .addCase(fetchCartQuote.fulfilled, (state, action) => {
        const quote = state.quotes[action.meta.arg.camperId]
        if (!quote || quote.key !== quoteKey(action.meta.arg)) return
        quote.status = 'succeeded'
        quote.data = action.payload
      })
      .addCase(fetchCartQuote.rejected, (state, action) => {
        const quote = state.quotes[action.meta.arg.camperId]
        if (!quote || quote.key !== quoteKey(action.meta.arg)) return
        quote.status = 'failed'
        quote.error = action.payload ?? 'Price could not be calculated.'
      })
      // Once a camper is booked it leaves the trip planner.
      .addCase(createBooking.fulfilled, (state, action) => {
        const camperId = action.meta.arg.camperId
        state.items = state.items.filter((i) => i.camperId !== camperId)
        delete state.quotes[camperId]
      })
  },
})

export const { addToCart, updateCartItem, removeFromCart, clearCart } = cartSlice.actions

export const selectCartItems = (state: RootState) => state.cart.items
export const selectCartCount = (state: RootState) => state.cart.items.length
export const selectCartItem = (state: RootState, camperId: string | undefined) =>
  state.cart.items.find((i) => i.camperId === camperId)
export const selectIsInCart = (state: RootState, camperId: string) => state.cart.items.some((i) => i.camperId === camperId)
export const selectCartQuote = (state: RootState, camperId: string) => state.cart.quotes[camperId]

export default cartSlice.reducer
