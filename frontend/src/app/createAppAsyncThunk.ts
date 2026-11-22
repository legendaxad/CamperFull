import { createAsyncThunk } from '@reduxjs/toolkit'
import type { AppDispatch, RootState } from './store'

/** Pre-typed `createAsyncThunk` — rejected payloads are always user-facing messages. */
export const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: RootState
  dispatch: AppDispatch
  rejectValue: string
}>()

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  return error instanceof Error && error.message ? error.message : fallback
}
