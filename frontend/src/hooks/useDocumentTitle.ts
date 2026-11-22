import { useEffect } from 'react'

const SUFFIX = 'FullCamper'

export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : `${SUFFIX} — Camper marketplace`
  }, [title])
}
