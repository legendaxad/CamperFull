import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { MemberStatusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { SearchInput, Select } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/Feedback'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Segmented'
import { useDebouncedValue } from '@/hooks/common'
import { useListParams } from '@/hooks/useListParams'
import { useCustomersQuery, type MemberListArgs } from '@/services/endpoints'
import type { Member } from '@/types/api'
import { formatDate, formatRelative, fullName } from '@/utils/format'

const columns: Column<Member>[] = [
  {
    key: 'name',
    header: 'Customer',
    cell: (member) => (
      <Link to={`/customers/${member._id}`} className="flex min-w-0 items-center gap-3">
        <Avatar name={fullName(member)} src={member.avatar?.url} />
        <span className="min-w-0">
          <span className="block truncate font-medium text-fg hover:underline">{fullName(member)}</span>
          <span className="block truncate text-xs text-fg-3">{member.email}</span>
        </span>
      </Link>
    ),
  },
  { key: 'phone', header: 'Phone', hideBelow: 'md', cell: (member) => <span className="text-fg-2 tabular">{member.phone ?? '—'}</span> },
  { key: 'registered', header: 'Registered', cell: (member) => <span className="text-fg-2">{formatDate(member.createdAt)}</span> },
  { key: 'lastLogin', header: 'Last sign-in', hideBelow: 'lg', cell: (member) => <span className="text-fg-3">{member.lastLoginAt ? formatRelative(member.lastLoginAt) : 'Never'}</span> },
  { key: 'status', header: 'Status', cell: (member) => <MemberStatusBadge status={member.status} /> },
]

export default function CustomersPage() {
  const list = useListParams()
  const [search, setSearch] = useState(list.get('search'))
  const debounced = useDebouncedValue(search.trim())
  const status = list.get('status') === 'BLOCKED' ? 'BLOCKED' : list.get('status') === 'ACTIVE' ? 'ACTIVE' : undefined
  const sortParam = list.get('sort')
  const sort: MemberListArgs['sort'] = sortParam === 'oldest' || sortParam === 'name' ? sortParam : 'newest'

  useEffect(() => {
    if (debounced !== list.get('search')) list.set({ search: debounced })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const { data, error, isLoading, isFetching, refetch } = useCustomersQuery({ page: list.page, limit: 20, search: list.get('search') || undefined, status, sort })

  return (
    <>
      <PageHeader title="Customers" description="Registered customer accounts." breadcrumbs={[{ label: 'Management' }, { label: 'Customers' }]} />
      <Card className="overflow-hidden">
        <div className="border-b border-line px-3">
          <Tabs
            label="Customer status"
            value={status ?? 'ALL'}
            onChange={(value) => list.set({ status: value === 'ALL' ? null : value })}
            tabs={[
              { value: 'ALL', label: 'All' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'BLOCKED', label: 'Blocked' },
            ]}
          />
        </div>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Name, email or phone…" className="sm:w-80" label="Search customers" />
          <Select aria-label="Sort" value={sort} onChange={(e) => list.set({ sort: e.target.value === 'newest' ? null : e.target.value })} className="sm:ml-auto sm:w-44">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
          </Select>
        </div>
        <DataTable
          caption="Customers"
          columns={columns}
          rows={data?.items}
          rowKey={(member) => member._id}
          rowHref={(member) => `/customers/${member._id}`}
          loading={isLoading}
          fetching={isFetching}
          error={error}
          onRetry={refetch}
          empty={<EmptyState title={list.get('search') || status ? 'No customers match' : 'No customers yet'} description="Customers appear here when they register on the customer site." />}
        />
        <Pagination meta={data?.meta} onPageChange={list.setPage} label="customers" />
      </Card>
    </>
  )
}
