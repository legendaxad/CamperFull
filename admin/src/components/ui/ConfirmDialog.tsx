import { useState, type ReactNode } from 'react'
import { Button } from './Button'
import { Checkbox, Field, Textarea } from './Field'
import { Modal } from './Modal'

export interface ConfirmResult {
  reason?: string
  checked: boolean
}

interface ConfirmDialogProps {
  open: boolean
  title: ReactNode
  description?: ReactNode
  confirmLabel: string
  tone?: 'primary' | 'danger'
  busy?: boolean
  /** Optional free-text reason (sent to the backend and stored in the booking history). */
  reason?: { label: string; required?: boolean; placeholder?: string; minLength?: number }
  /** Optional checkbox, e.g. "Refund the paid amount". */
  option?: { label: string; description?: string; defaultChecked?: boolean }
  children?: ReactNode
  onCancel: () => void
  onConfirm: (result: ConfirmResult) => void
}

/** Confirmation for consequential or destructive actions. */
export function ConfirmDialog(props: ConfirmDialogProps) {
  // Remount the body each time it opens so text and checkbox reset.
  return (
    <Modal open={props.open} onClose={props.onCancel} title={props.title} description={props.description} size="sm" busy={props.busy}>
      {props.open && <ConfirmBody {...props} />}
    </Modal>
  )
}

function ConfirmBody({ confirmLabel, tone = 'primary', busy, reason, option, children, onCancel, onConfirm }: ConfirmDialogProps) {
  const [text, setText] = useState('')
  const [checked, setChecked] = useState(option?.defaultChecked ?? false)
  const minLength = reason?.minLength ?? (reason?.required ? 3 : 0)
  const trimmed = text.trim()
  const reasonError = reason && trimmed.length > 0 && trimmed.length < minLength ? `Please enter at least ${minLength} characters.` : undefined
  const canConfirm = !reason?.required || trimmed.length >= minLength

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!canConfirm || reasonError) return
        onConfirm({ reason: trimmed || undefined, checked })
      }}
    >
      {children}
      {reason && (
        <Field label={reason.label} required={reason.required} error={reasonError}>
          {(id, describedBy) => (
            <Textarea id={id} aria-describedby={describedBy} value={text} onChange={(e) => setText(e.target.value)} placeholder={reason.placeholder} maxLength={500} rows={3} />
          )}
        </Field>
      )}
      {option && <Checkbox label={option.label} description={option.description} checked={checked} onChange={(e) => setChecked(e.target.checked)} />}
      <div className="-mx-5 -mb-4 flex justify-end gap-2 border-t border-line bg-subtle px-5 py-3">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Keep as is
        </Button>
        <Button type="submit" variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} disabled={!canConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </form>
  )
}
