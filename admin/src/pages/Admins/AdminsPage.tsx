import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, MemberStatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Field, Input, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/toastContext'
import { useCurrentAdmin } from '@/features/auth/useCurrentAdmin'
import { describeError, fieldErrorMap } from '@/services/errors'
import { useAdminsQuery, useCreateAdminMutation, useUpdateAdminMutation } from '@/services/endpoints'
import type { Member } from '@/types/api'
import { formatDate, formatRelative, fullName } from '@/utils/format'

type PendingChange = { admin: Member; change: { role?: 'ADMIN' | 'SUPER_ADMIN'; status?: 'ACTIVE' | 'BLOCKED' } }

export default function AdminsPage() {
  const me = useCurrentAdmin()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [pending, setPending] = useState<PendingChange | null>(null)
  const { data, error, isLoading, isFetching, refetch } = useAdminsQuery({ page, limit: 20, sort: 'name' })
  const [update, { isLoading: updating }] = useUpdateAdminMutation()

  const columns: Column<Member>[] = [
    {
      key: 'name',
      header: 'Administrator',
      cell: (admin) => (
        <div className="flex items-center gap-3">
          <Avatar name={fullName(admin)} src={admin.avatar?.url} />
          <span className="min-w-0">
            <span className="block truncate font-medium text-fg">
              {fullName(admin)} {admin._id === me._id && <span className="text-xs font-normal text-fg-3">(you)</span>}
            </span>
            <span className="block truncate text-xs text-fg-3">{admin.email}</span>
          </span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (admin) =>
        admin._id === me._id ? (
          <Badge tone={admin.role === 'SUPER_ADMIN' ? 'accent' : 'neutral'}>{admin.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin'}</Badge>
        ) : (
          <Select
            aria-label={`Role of ${fullName(admin)}`}
            value={admin.role}
            onChange={(e) => setPending({ admin, change: { role: e.target.value as 'ADMIN' | 'SUPER_ADMIN' } })}
            className="w-40"
          >
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super admin</option>
          </Select>
        ),
    },
    { key: 'lastLogin', header: 'Last sign-in', hideBelow: 'md', cell: (admin) => <span className="text-fg-3">{admin.lastLoginAt ? formatRelative(admin.lastLoginAt) : 'Never'}</span> },
    { key: 'created', header: 'Added', hideBelow: 'lg', cell: (admin) => <span className="text-fg-3">{formatDate(admin.createdAt)}</span> },
    { key: 'status', header: 'Status', cell: (admin) => <MemberStatusBadge status={admin.status} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: (admin) =>
        admin._id !== me._id && (
          <Button size="sm" variant="ghost" className={admin.status === 'BLOCKED' ? undefined : 'text-danger'} onClick={() => setPending({ admin, change: { status: admin.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED' } })}>
            {admin.status === 'BLOCKED' ? 'Unblock' : 'Block'}
          </Button>
        ),
    },
  ]

  const describe = (change: PendingChange) => {
    const name = fullName(change.admin)
    if (change.change.status === 'BLOCKED') return { title: `Block ${name}?`, description: 'They are signed out everywhere and cannot sign in until unblocked.', confirm: 'Block', danger: true }
    if (change.change.status === 'ACTIVE') return { title: `Unblock ${name}?`, description: 'They can sign in to the dashboard again.', confirm: 'Unblock', danger: false }
    if (change.change.role === 'SUPER_ADMIN') return { title: `Make ${name} a super admin?`, description: 'Super admins can create, block and change the role of other administrators.', confirm: 'Grant super admin', danger: false }
    return { title: `Make ${name} a regular admin?`, description: 'They keep dashboard access but can no longer manage administrators.', confirm: 'Change role', danger: true }
  }
  const dialog = pending ? describe(pending) : null

  return (
    <>
      <PageHeader
        title="Admins & roles"
        description="Super admins manage administrator accounts. Admins can use every other part of the dashboard."
        breadcrumbs={[{ label: 'System' }, { label: 'Admins & roles' }]}
        actions={
          <Button variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            Add administrator
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <DataTable caption="Administrators" columns={columns} rows={data?.items} rowKey={(admin) => admin._id} loading={isLoading} fetching={isFetching} error={error} onRetry={refetch} skeletonRows={4} />
        <Pagination meta={data?.meta} onPageChange={setPage} label="administrators" />
      </Card>
      <div className="mt-4 grid gap-3 text-xs text-fg-3 sm:grid-cols-2">
        <p>
          <strong className="font-medium text-fg-2">Admin:</strong> bookings, fleet, customers, payments and refunds, reports, notifications and settings.
        </p>
        <p>
          <strong className="font-medium text-fg-2">Super admin:</strong> everything above, plus creating, blocking and changing roles of administrators. You cannot change your own role or status.
        </p>
      </div>

      <CreateAdminModal open={creating} onClose={() => setCreating(false)} />
      {dialog && pending && (
        <ConfirmDialog
          open
          busy={updating}
          title={dialog.title}
          description={dialog.description}
          confirmLabel={dialog.confirm}
          tone={dialog.danger ? 'danger' : 'primary'}
          onCancel={() => setPending(null)}
          onConfirm={async () => {
            try {
              await update({ id: pending.admin._id, ...pending.change }).unwrap()
              toast.success('Administrator updated.')
              setPending(null)
            } catch (err) {
              toast.error(describeError(err))
            }
          }}
        />
      )}
    </>
  )
}

const createSchema = z.object({
  firstName: z.string().trim().min(1, 'Required').max(60),
  lastName: z.string().trim().min(1, 'Required').max(60),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.union([z.literal(''), z.string().trim().regex(/^\+?[\d\s\-().]{8,20}$/, 'Enter a valid phone number')]),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), 'Include a letter and a number'),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']),
})
type CreateValues = z.infer<typeof createSchema>

function CreateAdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [create, { isLoading }] = useCreateAdminMutation()
  const { register, handleSubmit, formState, reset, setError } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '', password: '', role: 'ADMIN' },
  })
  const errors = formState.errors
  const close = () => {
    reset()
    onClose()
  }

  const submit = handleSubmit(async (values) => {
    try {
      await create({ ...values, phone: values.phone || undefined }).unwrap()
      toast.success(`${values.firstName} can now sign in to the dashboard.`)
      close()
    } catch (err) {
      const fields = fieldErrorMap(err)
      if (fields.email) setError('email', { message: 'This email is already in use' })
      else if (fields.phone) setError('phone', { message: 'This phone number is already in use' })
      else toast.error(describeError(err))
    }
  })

  return (
    <Modal
      open={open}
      onClose={close}
      busy={isLoading}
      title="Add administrator"
      description="Share the temporary password securely; they can change it under Settings."
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" loading={isLoading} onClick={() => void submit()}>
            Create account
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" required error={errors.firstName?.message}>
          {(id) => <Input id={id} invalid={Boolean(errors.firstName)} {...register('firstName')} />}
        </Field>
        <Field label="Last name" required error={errors.lastName?.message}>
          {(id) => <Input id={id} invalid={Boolean(errors.lastName)} {...register('lastName')} />}
        </Field>
        <Field label="Email" required error={errors.email?.message} className="sm:col-span-2">
          {(id) => <Input id={id} type="email" autoComplete="off" invalid={Boolean(errors.email)} {...register('email')} />}
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          {(id) => <Input id={id} type="tel" invalid={Boolean(errors.phone)} {...register('phone')} />}
        </Field>
        <Field label="Role" required>
          {(id) => (
            <Select id={id} {...register('role')}>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super admin</option>
            </Select>
          )}
        </Field>
        <Field label="Temporary password" required error={errors.password?.message} hint="At least 8 characters with a letter and a number" className="sm:col-span-2">
          {(id, describedBy) => <Input id={id} aria-describedby={describedBy} type="password" autoComplete="new-password" invalid={Boolean(errors.password)} {...register('password')} />}
        </Field>
        <button type="submit" className="hidden" tabIndex={-1}>Submit</button>
      </form>
    </Modal>
  )
}
