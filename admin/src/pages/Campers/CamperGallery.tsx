import { ImagePlus, Star, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Thumb } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toastContext'
import { describeError, errorStatus } from '@/services/errors'
import { useDeleteCamperImageMutation, useReorderCamperImagesMutation, useUploadCamperImagesMutation } from '@/services/endpoints'
import type { Camper } from '@/types/api'
import { cn } from '@/utils/cn'

/* Same limits as the backend upload middleware. */
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const MAX_BYTES = 5 * 1024 * 1024
const MAX_PER_REQUEST = 10
const MAX_IMAGES = 20

export function CamperGallery({ camper }: { camper: Camper }) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState(0)
  const [toDelete, setToDelete] = useState<string | null>(null)
  const [upload, { isLoading: uploading }] = useUploadCamperImagesMutation()
  const [removeImage, { isLoading: removing }] = useDeleteCamperImageMutation()
  const [reorder, { isLoading: reordering }] = useReorderCamperImagesMutation()
  const images = camper.images
  const current = images[Math.min(selected, images.length - 1)]
  const remaining = MAX_IMAGES - images.length

  const onFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? [])
    if (inputRef.current) inputRef.current.value = ''
    if (files.length === 0) return
    const invalid = files.find((file) => !ACCEPTED.includes(file.type))
    if (invalid) return toast.error(`${invalid.name}: only JPEG, PNG, WEBP or AVIF images are allowed.`)
    const tooBig = files.find((file) => file.size > MAX_BYTES)
    if (tooBig) return toast.error(`${tooBig.name} is larger than 5 MB.`)
    if (files.length > Math.min(MAX_PER_REQUEST, remaining)) {
      return toast.error(remaining <= 0 ? 'This camper already has the maximum of 20 photos.' : `You can add up to ${Math.min(MAX_PER_REQUEST, remaining)} more photos at once.`)
    }
    try {
      await upload({ id: camper._id, files }).unwrap()
      toast.success(files.length === 1 ? 'Photo uploaded.' : `${files.length} photos uploaded.`)
    } catch (error) {
      toast.error(errorStatus(error) === 503 ? 'Image storage is not configured on the server (Cloudinary credentials are missing).' : describeError(error))
    }
  }

  const makeCover = async (imageId: string) => {
    const ids = images.map((image) => image._id).filter((id): id is string => Boolean(id))
    try {
      await reorder({ id: camper._id, imageIds: [imageId, ...ids.filter((id) => id !== imageId)] }).unwrap()
      setSelected(0)
      toast.success('Cover photo updated.')
    } catch (error) {
      toast.error(describeError(error))
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Photos"
        description={`${images.length} of ${MAX_IMAGES} · the first photo is the cover`}
        action={
          <>
            <input ref={inputRef} type="file" accept={ACCEPTED.join(',')} multiple className="sr-only" onChange={(e) => void onFiles(e.target.files)} aria-label="Upload photos" />
            <Button size="sm" icon={<ImagePlus className="h-4 w-4" />} loading={uploading} disabled={remaining <= 0} onClick={() => inputRef.current?.click()}>
              Upload
            </Button>
          </>
        }
      />
      <div className="px-5 pb-5">
        {current ? (
          <>
            <div className="group relative overflow-hidden rounded-xl bg-muted">
              <img src={current.url} alt={current.alt ?? camper.name} className="aspect-[16/9] w-full object-cover" />
              {current._id && (
                <div className="absolute top-3 right-3 flex gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                  {selected > 0 && (
                    <Button size="sm" variant="secondary" loading={reordering} icon={<Star className="h-3.5 w-3.5" />} onClick={() => current._id && void makeCover(current._id)}>
                      Make cover
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" className="text-danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setToDelete(current._id ?? null)}>
                    Remove
                  </Button>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="scrollbar-thin mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    key={image._id ?? image.url}
                    type="button"
                    onClick={() => setSelected(index)}
                    className={cn('shrink-0 rounded-lg ring-2 transition', index === selected ? 'ring-accent' : 'ring-transparent opacity-70 hover:opacity-100')}
                    aria-label={`Show photo ${index + 1}`}
                    aria-pressed={index === selected}
                  >
                    <Thumb src={image.url} alt="" className="h-14 w-20" />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong text-fg-3 transition-colors hover:border-accent hover:text-accent-ink"
          >
            <ImagePlus className="h-6 w-6" />
            <span className="text-sm font-medium">Add photos</span>
            <span className="text-xs">JPEG, PNG, WEBP or AVIF · up to 5 MB each</span>
          </button>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        busy={removing}
        tone="danger"
        title="Remove this photo?"
        description="The image is deleted from storage and cannot be recovered."
        confirmLabel="Remove photo"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return
          try {
            await removeImage({ id: camper._id, imageId: toDelete }).unwrap()
            setSelected(0)
            setToDelete(null)
            toast.success('Photo removed.')
          } catch (error) {
            toast.error(describeError(error))
          }
        }}
      />
    </Card>
  )
}
