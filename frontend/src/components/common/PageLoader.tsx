import { Loader2 } from 'lucide-react'

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status">
      <Loader2 className="size-8 animate-spin text-brand" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  )
}
