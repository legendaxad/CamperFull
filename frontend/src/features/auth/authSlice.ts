import { createSlice } from '@reduxjs/toolkit'
import { createAppAsyncThunk } from '@/app/createAppAsyncThunk'
import type { RootState } from '@/app/store'
import { describeError, toApiError } from '@/services/api/errors'
import { authApi, type LoginRequest, type ProfileUpdateRequest, type RegisterRequest } from '@/services/authApi'
import type { ApiErrorDetail, Member } from '@/types/api'

/*
 * Authentication follows the backend's cookie strategy: the access/refresh tokens are
 * HTTP-only cookies the browser sends automatically. Nothing secret is kept in Redux or
 * localStorage — only the public member profile, rebuilt from GET /auth/me on every load.
 */

export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous'

export interface AuthState {
  user: Member | null
  /** `unknown` until the initial session check finishes (protected routes wait for it). */
  status: AuthStatus
  /** A GET /auth/me request is in flight. */
  checking: boolean
  pending: boolean
  error: string | null
  fieldErrors: ApiErrorDetail[]
}

const initialState: AuthState = {
  user: null,
  status: 'unknown',
  checking: false,
  pending: false,
  error: null,
  fieldErrors: [],
}

export interface AuthRejection {
  message: string
  fieldErrors: ApiErrorDetail[]
}

const rejection = (error: unknown): AuthRejection => {
  const apiError = toApiError(error)
  return { message: describeError(apiError), fieldErrors: apiError.fieldErrors }
}

/** Restores the session after a page refresh (401 -> silent refresh -> retry happens in the API client). */
export const fetchCurrentUser = createAppAsyncThunk(
  'auth/fetchCurrentUser',
  async (_: void, { rejectWithValue }) => {
    try {
      return await authApi.me()
    } catch (error) {
      return rejectWithValue(describeError(error))
    }
  },
  { condition: (_, { getState }) => !getState().auth.checking },
)

export const loginUser = createAppAsyncThunk<Member, LoginRequest, { rejectValue: AuthRejection }>(
  'auth/login',
  async (body, { rejectWithValue }) => {
    try {
      return await authApi.login(body)
    } catch (error) {
      return rejectWithValue(rejection(error))
    }
  },
)

export interface RegisterInput extends RegisterRequest {
  avatar?: File | null
}

export interface RegisterResult {
  member: Member
  /** Set when the account was created but the optional avatar upload failed. */
  avatarError: string | null
}

export const registerUser = createAppAsyncThunk<RegisterResult, RegisterInput, { rejectValue: AuthRejection }>(
  'auth/register',
  async ({ avatar, ...body }, { rejectWithValue }) => {
    let member: Member
    try {
      member = await authApi.register(body)
    } catch (error) {
      return rejectWithValue(rejection(error))
    }
    if (!avatar) return { member, avatarError: null }
    try {
      return { member: await authApi.uploadAvatar(avatar), avatarError: null }
    } catch (error) {
      return { member, avatarError: describeError(error) }
    }
  },
)

export const logoutUser = createAppAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout()
  } catch {
    // Cookies are cleared server-side when reachable; locally we sign out regardless.
  }
})

export const updateProfile = createAppAsyncThunk<Member, ProfileUpdateRequest, { rejectValue: AuthRejection }>(
  'auth/updateProfile',
  async (body, { rejectWithValue }) => {
    try {
      return await authApi.updateProfile(body)
    } catch (error) {
      return rejectWithValue(rejection(error))
    }
  },
)

export const uploadAvatar = createAppAsyncThunk<Member, File, { rejectValue: AuthRejection }>(
  'auth/uploadAvatar',
  async (file, { rejectWithValue }) => {
    try {
      return await authApi.uploadAvatar(file)
    } catch (error) {
      return rejectWithValue(rejection(error))
    }
  },
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Dispatched by the API client when a refresh fails (expired or revoked session). */
    sessionExpired(state) {
      state.user = null
      state.status = 'anonymous'
    },
    clearAuthError(state) {
      state.error = null
      state.fieldErrors = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.checking = true
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.checking = false
        state.user = action.payload
        state.status = 'authenticated'
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.checking = false
        state.user = null
        state.status = 'anonymous'
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.status = 'anonymous'
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload
      })
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        state.user = action.payload
      })

    // Shared pending/error handling for the credential forms.
    for (const thunk of [loginUser, registerUser] as const) {
      builder
        .addCase(thunk.pending, (state) => {
          state.pending = true
          state.error = null
          state.fieldErrors = []
        })
        .addCase(thunk.rejected, (state, action) => {
          state.pending = false
          state.error = action.payload?.message ?? 'Something went wrong. Please try again.'
          state.fieldErrors = action.payload?.fieldErrors ?? []
        })
    }
    builder
      .addCase(loginUser.fulfilled, (state, action) => {
        state.pending = false
        state.user = action.payload
        state.status = 'authenticated'
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.pending = false
        state.user = action.payload.member
        state.status = 'authenticated'
      })
  },
})

export const { sessionExpired, clearAuthError } = authSlice.actions

export const selectCurrentUser = (state: RootState) => state.auth.user
export const selectAuthStatus = (state: RootState) => state.auth.status
export const selectIsAuthenticated = (state: RootState) => state.auth.status === 'authenticated'
export const selectAuthPending = (state: RootState) => state.auth.pending
export const selectAuthError = (state: RootState) => state.auth.error
export const selectAuthFieldErrors = (state: RootState) => state.auth.fieldErrors

export function fullName(member: Pick<Member, 'firstName' | 'lastName'>): string {
  return `${member.firstName} ${member.lastName}`.trim()
}

export default authSlice.reducer
