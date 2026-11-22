import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Owns blob object URLs created for local previews. URLs are revoked when an entry is
 * removed and when the component unmounts, so no blob memory leaks.
 */
export function useObjectUrls() {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const ref = useRef(urls)
  useEffect(() => {
    ref.current = urls
  }, [urls])

  const create = useCallback((key: string, file: Blob) => {
    const url = URL.createObjectURL(file)
    setUrls((prev) => {
      if (prev[key]) URL.revokeObjectURL(prev[key])
      return { ...prev, [key]: url }
    })
    return url
  }, [])

  const revoke = useCallback((key: string) => {
    setUrls((prev) => {
      if (!prev[key]) return prev
      URL.revokeObjectURL(prev[key])
      const { [key]: _removed, ...rest } = prev
      return rest
    })
  }, [])

  useEffect(
    () => () => {
      Object.values(ref.current).forEach((url) => URL.revokeObjectURL(url))
    },
    [],
  )

  return { urls, create, revoke }
}
