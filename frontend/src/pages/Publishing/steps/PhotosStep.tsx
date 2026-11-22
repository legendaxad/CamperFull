import { nanoid } from '@reduxjs/toolkit'
import { ArrowLeft, ArrowRight, GripVertical, ImagePlus, Loader2, Star, Trash2, UploadCloud } from 'lucide-react'
import { useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_BYTES, MAX_PHOTOS } from '@/constants/camper'
import { photosSchema } from '@/features/publishing/publishingSchemas'
import { selectSessionPhotos } from '@/features/publishing/publishingSelectors'
import { addPhotos, removePhoto, reorderPhoto, setCoverPhoto } from '@/features/publishing/publishingSlice'
import { useObjectUrls } from '@/hooks/useObjectUrls'
import type { CamperPhoto } from '@/types/camper'
import { cn } from '@/utils/cn'
import { formatBytes } from '@/utils/format'
import { compressImage, dataUrlBytes, validateImageFile } from '@/utils/image'
import { useWizardNavigation } from '../useWizardStep'
import { STEP_FORM_ID } from '../wizardConfig'

/** Warn before photos approach the ~5 MB localStorage quota. */
const STORAGE_WARNING_BYTES = 3 * 1024 * 1024

interface PendingUpload {
  id: string
  name: string
}

/**
 * Photo manager.
 * - The original File only lives here (local state) while it is processed.
 * - An object URL gives an instant preview and is revoked afterwards / on unmount.
 * - Redux receives serializable metadata plus a compressed data URL that survives reloads.
 */
export function PhotosStep() {
  const dispatch = useAppDispatch()
  const photos = useAppSelector(selectSessionPhotos)
  const { next } = useWizardNavigation()
  const { urls, create, revoke } = useObjectUrls()
  const [pending, setPending] = useState<PendingUpload[]>([])
  const [problems, setProblems] = useState<string[]>([])
  const [stepError, setStepError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const storedBytes = photos.reduce((sum, p) => sum + (p.src.startsWith('data:') ? dataUrlBytes(p.src) : 0), 0)
  const slotsLeft = MAX_PHOTOS - photos.length - pending.length

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    const issues: string[] = []
    const accepted: File[] = []
    for (const file of files) {
      const problem = validateImageFile(file)
      if (problem) issues.push(problem)
      else if (accepted.length < slotsLeft) accepted.push(file)
      else issues.push(`"${file.name}" was skipped — the limit is ${MAX_PHOTOS} photos.`)
    }
    setProblems(issues)
    setStepError(null)
    if (!accepted.length) return

    const jobs = accepted.map((file) => ({ id: `photo-${nanoid(8)}`, file }))
    setPending((p) => [...p, ...jobs.map(({ id, file }) => ({ id, name: file.name }))])

    await Promise.all(
      jobs.map(async ({ id, file }) => {
        const objectUrl = create(id, file)
        try {
          const { dataUrl, width, height } = await compressImage(objectUrl)
          const photo: CamperPhoto = { id, src: dataUrl, name: file.name, sizeBytes: file.size, width, height, isCover: false }
          dispatch(addPhotos([photo]))
        } catch {
          revoke(id)
          setProblems((p) => [...p, `"${file.name}" could not be processed.`])
        } finally {
          setPending((p) => p.filter((item) => item.id !== id))
        }
      }),
    )
  }

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void handleFiles(event.target.files)
    event.target.value = ''
  }

  const onDropZone = (event: DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    if (event.dataTransfer.files.length) void handleFiles(event.dataTransfer.files)
  }

  const onRemove = (id: string) => {
    dispatch(removePhoto(id))
    revoke(id)
  }

  const onTileDrop = (targetIndex: number) => {
    if (draggedId) dispatch(reorderPhoto({ id: draggedId, toIndex: targetIndex }))
    setDraggedId(null)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (pending.length) {
      setStepError('Please wait until all photos have finished processing.')
      return
    }
    const result = photosSchema.safeParse(photos)
    if (!result.success) {
      setStepError(result.error.issues[0]?.message ?? 'Please check your photos.')
      return
    }
    next()
  }

  return (
    <form id={STEP_FORM_ID} onSubmit={onSubmit} noValidate className="space-y-6">
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDropZone}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed px-6 py-10 text-center transition',
          'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand',
          dragOver ? 'border-brand bg-brand-soft' : 'border-[#c4c4c4] bg-surface hover:border-brand hover:bg-brand-soft/50',
          slotsLeft <= 0 && 'pointer-events-none opacity-50',
        )}
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-white text-brand shadow-card">
          <UploadCloud className="size-7" aria-hidden />
        </span>
        <span className="text-base font-semibold">Drag photos here or <span className="text-brand underline">browse</span></span>
        <span className="text-xs text-muted">
          JPG, PNG or WebP · up to {formatBytes(MAX_PHOTO_BYTES)} each · {Math.max(0, slotsLeft)} of {MAX_PHOTOS} slots left
        </span>
        <input
          type="file"
          multiple
          accept={ACCEPTED_PHOTO_TYPES.join(',')}
          onChange={onInput}
          disabled={slotsLeft <= 0}
          className="sr-only"
          aria-label="Upload camper photos"
        />
      </label>

      {problems.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-xl bg-[#fff6f6] p-4 text-sm text-danger">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}

      {photos.length + pending.length > 0 && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>Drag tiles or use the arrows to reorder. The ★ cover photo is shown first everywhere.</span>
            <span>Stored on this device: {formatBytes(storedBytes)}</span>
          </div>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo, index) => (
              <li
                key={photo.id}
                draggable
                onDragStart={() => setDraggedId(photo.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onTileDrop(index)}
                onDragEnd={() => setDraggedId(null)}
                className={cn(
                  'group relative overflow-hidden rounded-[16px] bg-white shadow-card transition',
                  photo.isCover && 'ring-3 ring-accent',
                  draggedId === photo.id && 'opacity-40',
                )}
              >
                <img src={urls[photo.id] ?? photo.src} alt={photo.name} className="aspect-[4/3] w-full object-cover" />
                <GripVertical className="absolute top-2 left-2 size-5 cursor-grab text-white drop-shadow" aria-hidden />
                {photo.isCover && (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white uppercase">
                    <Star className="size-3 fill-white" aria-hidden /> Cover
                  </span>
                )}
                <div className="flex items-center justify-between gap-1 p-2">
                  <div className="flex">
                    <button type="button" onClick={() => dispatch(reorderPhoto({ id: photo.id, toIndex: index - 1 }))} disabled={index === 0} className="rounded-lg p-1.5 hover:bg-surface disabled:opacity-30" aria-label={`Move ${photo.name} earlier`}>
                      <ArrowLeft className="size-4" />
                    </button>
                    <button type="button" onClick={() => dispatch(reorderPhoto({ id: photo.id, toIndex: index + 1 }))} disabled={index === photos.length - 1} className="rounded-lg p-1.5 hover:bg-surface disabled:opacity-30" aria-label={`Move ${photo.name} later`}>
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                  <div className="flex">
                    {!photo.isCover && (
                      <button type="button" onClick={() => dispatch(setCoverPhoto(photo.id))} className="rounded-lg p-1.5 text-accent hover:bg-surface" aria-label={`Use ${photo.name} as cover`} title="Set as cover">
                        <Star className="size-4" />
                      </button>
                    )}
                    <button type="button" onClick={() => onRemove(photo.id)} className="rounded-lg p-1.5 text-danger hover:bg-[#fff6f6]" aria-label={`Remove ${photo.name}`} title="Remove">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {pending.map((item) => (
              <li key={item.id} className="relative overflow-hidden rounded-[16px] bg-white shadow-card" aria-busy="true">
                {urls[item.id] ? (
                  <img src={urls[item.id]} alt="" className="aspect-[4/3] w-full object-cover opacity-50" />
                ) : (
                  <div className="skeleton aspect-[4/3] w-full rounded-none" />
                )}
                <div className="flex items-center gap-2 p-3 text-xs text-muted">
                  <Loader2 className="size-4 animate-spin text-brand" aria-hidden /> Optimizing {item.name}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {photos.length === 0 && pending.length === 0 && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted">
          <ImagePlus className="size-4" aria-hidden /> Tip: add a side view, the living area, kitchen and bed.
        </p>
      )}

      {storedBytes > STORAGE_WARNING_BYTES && (
        <p className="rounded-xl bg-[#fff4e5] p-3 text-xs text-[#8a4b00]">
          Photos are kept in your browser until the backend is connected. You are close to the storage limit — consider
          removing a photo or two.
        </p>
      )}
      {stepError && <p role="alert" className="text-sm font-medium text-danger">{stepError}</p>}
    </form>
  )
}
