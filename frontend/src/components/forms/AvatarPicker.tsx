import { Camera, Trash2 } from 'lucide-react'
import { useEffect, useId, useState, type ChangeEvent } from 'react'
import { Avatar } from '@/components/common/Avatar'
import { validateImageFile } from '@/utils/image'

/** Backend upload limits (middleware/upload.middleware.ts). */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

/**
 * Selects a profile photo. The File stays in component state and is uploaded with
 * PUT /members/me/avatar; the preview uses an object URL that is revoked on change/unmount.
 */
export function AvatarPicker({
  name,
  file,
  currentUrl = null,
  onChange,
  disabled,
}: {
  name: string
  file: File | null
  currentUrl?: string | null
  onChange: (file: File | null) => void
  disabled?: boolean
}) {
  const id = useId()
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    event.target.value = ''
    if (!selected) return
    const problem = validateImageFile(selected, AVATAR_MAX_BYTES, AVATAR_TYPES)
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    onChange(selected)
  }

  const shown = preview ?? currentUrl
  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar name={name || '?'} src={shown} size="md" />
        <div className="flex flex-wrap gap-2">
          <label
            htmlFor={id}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-brand px-3 py-2 text-xs font-bold text-brand transition focus-within:ring-2 focus-within:ring-brand hover:bg-brand-soft has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
          >
            <Camera className="size-4" aria-hidden /> {shown ? 'Change photo' : 'Upload photo'}
            <input id={id} type="file" accept={AVATAR_TYPES.join(',')} className="sr-only" onChange={onFile} disabled={disabled} />
          </label>
          {file && (
            <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-xs font-semibold text-danger hover:bg-[#fff6f6]">
              <Trash2 className="size-4" aria-hidden /> Remove
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  )
}
