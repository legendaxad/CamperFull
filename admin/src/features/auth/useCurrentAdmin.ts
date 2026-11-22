import { useMeQuery } from '@/services/endpoints'
import type { Member } from '@/types/api'

/** The signed-in administrator. Only used below <RequireAuth>, which guarantees the data is loaded. */
export function useCurrentAdmin(): Member {
  const { data } = useMeQuery()
  if (!data) throw new Error('useCurrentAdmin must be used inside <RequireAuth>')
  return data.member
}
