import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BulkActionBar } from '@/components/BulkActionBar'
import { isSafeUrl } from '@/lib/utils'
import {
  Plus,
  Copy,
  Settings,
  Users,
  ArrowRight,
  Gift,
  Eye,
  Check,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const avatarColors = ['bg-[#C67C5A]', 'bg-[#8FA98F]', 'bg-[#D4A574]', 'bg-[#5A8F6E]', 'bg-[#B85450]']

function AvatarInitials({ name, index = 0 }: { name: string; index?: number }) {
  return (
    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${avatarColors[index % avatarColors.length]} text-white text-xs font-medium ring-2 ring-white`}>
      {getInitials(name)}
    </div>
  )
}

export default function Dashboard({ tab = 'lists' }: { tab?: 'lists' | 'items' }) {
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true })
  const [activeTab, setActiveTab] = useState<'lists' | 'items'>(tab)
  const [createOpen, setCreateOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  // Master view: multi-select
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  // Tracks whether create-list modal was opened from Move/Copy, and which items to act on
  const pendingActionRef = useRef<{ action: 'move' | 'copy'; itemIds?: number[] } | null>(null)

  // Per-row actions
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: '', price: '', quantity: 1, notes: '', listId: 0 })
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null)

  // Filter + sort
  const [filterListId, setFilterListId] = useState<string>('all')
  const [sort, setSort] = useState<'updated' | 'name' | 'list'>('updated')

  // Create list form
  const [newListTitle, setNewListTitle] = useState('')
  const [newListPassword, setNewListPassword] = useState('')
  const [newListZelle, setNewListZelle] = useState('')
  const [newListVenmo, setNewListVenmo] = useState('')
  const [newListPaypal, setNewListPaypal] = useState('')

  const utils = trpc.useUtils()
  const { data: myLists, isLoading: listsLoading } = trpc.list.mine.useQuery(undefined, {
    enabled: !!user,
  })
  const { data: allItems } = trpc.list.allItems.useQuery(undefined, {
    enabled: activeTab === 'items' && !!user,
  })

  const createList = trpc.list.create.useMutation({
    onSuccess: (newList) => {
      utils.list.mine.invalidate()
      if (pendingActionRef.current && newList) {
        const ids = pendingActionRef.current.itemIds ?? [...selectedIds]
        if (pendingActionRef.current.action === 'move') {
          moveItems.mutate({ itemIds: ids, targetListId: newList.id })
        } else {
          copyItems.mutate({ itemIds: ids, targetListId: newList.id })
        }
        pendingActionRef.current = null
      }
      setCreateOpen(false)
      setNewListTitle('')
      setNewListPassword('')
      setNewListZelle('')
      setNewListVenmo('')
      setNewListPaypal('')
    },
  })

  const moveItems = trpc.item.move.useMutation({
    onSuccess: () => {
      utils.list.allItems.invalidate()
      setSelectedIds(new Set())
    },
  })

  const copyItems = trpc.item.copy.useMutation({
    onSuccess: () => {
      utils.list.allItems.invalidate()
      setSelectedIds(new Set())
    },
  })

  const bulkDelete = trpc.item.bulkDelete.useMutation({
    onSuccess: () => {
      utils.list.allItems.invalidate()
      setSelectedIds(new Set())
    },
  })

  const itemDelete = trpc.item.delete.useMutation({
    onSuccess: () => {
      utils.list.allItems.invalidate()
      setDeletingItemId(null)
    },
  })

  const itemUpdate = trpc.item.update.useMutation({
    onSuccess: () => {
      utils.list.allItems.invalidate()
      setEditingId(null)
    },
  })

  function suggestPassphrase() {
    const words = ['happy', 'joyful', 'warm', 'cozy', 'bright', 'sweet', 'lovely', 'gentle']
    const nouns = ['birthday', 'holiday', 'wedding', 'baby', 'celebration', 'moment', 'gathering', 'wish']
    const r1 = words[Math.floor(Math.random() * words.length)]
    const r2 = nouns[Math.floor(Math.random() * nouns.length)]
    const r3 = Math.floor(1000 + Math.random() * 9000)
    setNewListPassword(`${r1}-${r2}-${r3}`)
  }

  function copyLinkAndPassword(listId: number, password: string) {
    const base = `${window.location.origin}/lists/${listId}/access`
    const isHashed = password.startsWith('pbkdf2:')
    const url = isHashed ? base : `${base}?p=${encodeURIComponent(password)}`
    navigator.clipboard.writeText(url)
    setCopiedId(listId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleCreate() {
    if (!newListTitle.trim() || !newListPassword.trim()) return
    createList.mutate({
      title: newListTitle.trim(),
      password: newListPassword.trim(),
      zelle: newListZelle || undefined,
      venmo: newListVenmo || undefined,
      paypal: newListPaypal || undefined,
    })
  }

  if (authLoading || listsLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7]">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C67C5A] border-t-transparent" />
        </div>
      </div>
    )
  }

  const ownedLists = myLists?.owned || []
  const ownedListsSlim = ownedLists.map((l) => ({ id: l.id, title: l.title }))
  const hasLists = ownedLists.length > 0

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <Tabs value={activeTab} onValueChange={(v) => {
          setActiveTab(v as 'lists' | 'items')
          if (v === 'items') navigate('/dashboard/items')
          else navigate('/dashboard')
        }} className="mb-8">
          <TabsList className="bg-[#F5F1EC] border border-[#E8E2DA]">
            <TabsTrigger value="lists" className="data-[state=active]:bg-white data-[state=active]:text-[#3D3632]">My lists</TabsTrigger>
            <TabsTrigger value="items" className="data-[state=active]:bg-white data-[state=active]:text-[#3D3632]">All my items</TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === 'lists' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl font-semibold text-[#3D3632]">Lists I own</h2>
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-[#C67C5A] text-white hover:bg-[#B56A48]"
              >
                <Plus className="mr-2 h-4 w-4" />
                New list
              </Button>
            </div>

            {!hasLists && (
              <Card className="border-[#E8E2DA] bg-white">
                <CardContent className="flex flex-col items-center py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#C67C5A]/10">
                    <Gift className="h-8 w-8 text-[#C67C5A]" />
                  </div>
                  <h3 className="mt-4 font-serif text-xl font-semibold text-[#3D3632]">
                    Welcome — create your first list
                  </h3>
                  <p className="mt-2 max-w-md text-[#6B6058]">
                    Create a wishlist for your next celebration, share it privately with a password, and let people claim items.
                  </p>
                  <Button
                    onClick={() => setCreateOpen(true)}
                    className="mt-6 bg-[#C67C5A] text-white hover:bg-[#B56A48]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create a list
                  </Button>
                </CardContent>
              </Card>
            )}

            {hasLists && (
              <div className="grid gap-4 md:grid-cols-2">
                {ownedLists.map((list) => {
                  const totalItems = (list as any).items?.length || 0
                  const claimedCount = (list as any).items?.reduce((acc: number, item: any) => acc + (item.claims?.length || 0), 0) || 0
                  return (
                    <Card key={list.id} className="border-[#E8E2DA] bg-white hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-serif text-lg font-semibold text-[#3D3632]">{list.title}</h3>
                            <p className="mt-1 text-sm text-[#6B6058]">
                              {totalItems} items · {claimedCount} claimed
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/lists/${list.id}`)}
                            className="text-[#6B6058] hover:text-[#3D3632] hover:bg-[#F5F1EC]"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyLinkAndPassword(list.id, list.password)}
                            className="border-[#E8E2DA] text-[#3D3632] hover:bg-[#F5F1EC]"
                          >
                            {copiedId === list.id ? (
                              <Check className="mr-2 h-4 w-4 text-[#5A8F6E]" />
                            ) : (
                              <Copy className="mr-2 h-4 w-4" />
                            )}
                            {copiedId === list.id ? 'Copied' : 'Copy link'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/lists/${list.id}`)}
                            className="border-[#E8E2DA] text-[#3D3632] hover:bg-[#F5F1EC]"
                          >
                            Manage
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>

                        {((list as any).accessRecords?.length || 0) > 0 && (
                          <div className="mt-4 flex items-center gap-2 border-t border-[#E8E2DA] pt-4">
                            <div className="flex -space-x-2">
                              {(list as any).accessRecords?.slice(0, 3).map((a: any, i: number) => (
                                <AvatarInitials key={i} name={a.name || a.email} index={i} />
                              ))}
                            </div>
                            <span className="text-sm text-[#6B6058]">
                              {(list as any).accessRecords?.length || 0} {(list as any).accessRecords?.length === 1 ? 'person' : 'people'} have access
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/lists/${list.id}/people`)}
                              className="ml-auto text-[#C67C5A] hover:text-[#B56A48] hover:bg-[#C67C5A]/10"
                            >
                              <Users className="mr-1 h-4 w-4" />
                              View all
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'items' && (() => {
          const items = allItems ?? []

          const filtered = filterListId === 'all'
            ? items
            : items.filter((i) => i.listId === Number(filterListId))

          const sorted = [...filtered].sort((a, b) => {
            if (sort === 'name') return a.name.localeCompare(b.name)
            if (sort === 'list') return (a.list?.title ?? '').localeCompare(b.list?.title ?? '')
            return +new Date(b.updatedAt) - +new Date(a.updatedAt)
          })

          const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id))
          const someSelected = items.some((i) => selectedIds.has(i.id)) && !allSelected

          function toggleAll() {
            if (allSelected) {
              setSelectedIds(new Set())
            } else {
              setSelectedIds(new Set(items.map((i) => i.id)))
            }
          }

          function toggleOne(id: number) {
            setSelectedIds((prev) => {
              const next = new Set(prev)
              if (next.has(id)) next.delete(id)
              else next.add(id)
              return next
            })
          }

          const selectedItems = items.filter((i) => selectedIds.has(i.id))
          const claimedInSelection = selectedItems
            .filter((i) => i.claims.some((c) => !c.purchased))
            .map((i) => ({
              id: i.id,
              name: i.name,
              claimerName: i.claims.find((c) => !c.purchased)?.name ?? null,
            }))

          function handleMove(targetListId: number) {
            const moveableIds = selectedItems
              .filter((i) => !i.claims.some((c) => !c.purchased))
              .map((i) => i.id)
            if (moveableIds.length > 0) {
              moveItems.mutate({ itemIds: moveableIds, targetListId })
            } else {
              setSelectedIds(new Set())
            }
          }

          function startEdit(item: typeof items[0]) {
            setEditForm({
              name: item.name,
              price: item.price ?? '',
              quantity: item.quantity,
              notes: item.notes ?? '',
              listId: item.listId,
            })
            setEditingId(item.id)
          }

          function saveEdit() {
            if (!editingId || !editForm.name.trim()) return
            itemUpdate.mutate({
              id: editingId,
              name: editForm.name.trim(),
              price: editForm.price ? Number(editForm.price) : undefined,
              quantity: editForm.quantity,
              notes: editForm.notes,
              listId: editForm.listId,
            })
          }

          return (
            <>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-[#3D3632]">All my items</h2>
                  <p className="mt-1 text-sm text-[#6B6058]">
                    {items.length} item{items.length !== 1 ? 's' : ''} across {ownedListsSlim.length} list{ownedListsSlim.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {!items.length && (
                <Card className="border-[#E8E2DA] bg-white">
                  <CardContent className="flex flex-col items-center py-16 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#C67C5A]/10">
                      <Eye className="h-8 w-8 text-[#C67C5A]" />
                    </div>
                    <h3 className="mt-4 font-serif text-xl font-semibold text-[#3D3632]">No items yet</h3>
                    <p className="mt-2 text-[#6B6058]">Add items to any of your lists to see them here.</p>
                    <Button
                      onClick={() => navigate('/dashboard')}
                      className="mt-6 bg-[#C67C5A] text-white hover:bg-[#B56A48]"
                    >
                      Go to my lists
                    </Button>
                  </CardContent>
                </Card>
              )}

              {!!items.length && (
                <>
                  {/* Filter + sort controls */}
                  <div className="mb-4 flex items-center gap-3">
                    <Select value={filterListId} onValueChange={setFilterListId}>
                      <SelectTrigger className="w-[180px] border-[#E8E2DA] bg-white text-sm h-9">
                        <SelectValue placeholder="All lists" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All lists</SelectItem>
                        {ownedListsSlim.map((l) => (
                          <SelectItem key={l.id} value={String(l.id)}>{l.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                      <SelectTrigger className="w-[160px] border-[#E8E2DA] bg-white text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="updated">Last updated</SelectItem>
                        <SelectItem value="name">Name A→Z</SelectItem>
                        <SelectItem value="list">List name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    {/* Select all row */}
                    <div className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-[#6B6058]">
                      <Checkbox
                        id="select-all"
                        checked={allSelected}
                        data-state={someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
                        onCheckedChange={toggleAll}
                        aria-label="Select all items"
                        className="border-[#D4C9BF] data-[state=checked]:bg-[#C67C5A] data-[state=checked]:border-[#C67C5A]"
                      />
                      <label htmlFor="select-all" className="cursor-pointer select-none">
                        {allSelected ? 'Deselect all' : 'Select all'}
                      </label>
                    </div>

                    {sorted.map((item) => {
                      const isSelected = selectedIds.has(item.id)
                      const activeClaim = item.claims.find((c) => !c.purchased)
                      const isEditing = editingId === item.id
                      return (
                        <Card
                          key={item.id}
                          className={`border-[#E8E2DA] bg-white transition-colors ${isSelected ? 'bg-[#FDF6F1] border-[#C67C5A]/30' : 'hover:bg-[#FDFAF7]'}`}
                        >
                          <CardContent className="p-4">
                            {isEditing ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="col-span-2">
                                    <Label className="text-xs text-[#6B6058]">Name</Label>
                                    <Input
                                      value={editForm.name}
                                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                      className="mt-1 h-8 text-sm border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-[#6B6058]">Price ($)</Label>
                                    <Input
                                      type="number"
                                      value={editForm.price}
                                      onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                                      className="mt-1 h-8 text-sm border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-[#6B6058]">Qty</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={editForm.quantity}
                                      onChange={(e) => setEditForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                                      className="mt-1 h-8 text-sm border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <Label className="text-xs text-[#6B6058]">Notes</Label>
                                    <Input
                                      value={editForm.notes}
                                      onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                                      className="mt-1 h-8 text-sm border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <Label className="text-xs text-[#6B6058]">On list</Label>
                                    <Select
                                      value={String(editForm.listId)}
                                      onValueChange={(v) => setEditForm((f) => ({ ...f, listId: Number(v) }))}
                                    >
                                      <SelectTrigger className="mt-1 h-8 text-sm border-[#E8E2DA]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ownedListsSlim.map((l) => (
                                          <SelectItem key={l.id} value={String(l.id)}>{l.title}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <Button
                                    size="sm"
                                    onClick={saveEdit}
                                    disabled={!editForm.name.trim() || itemUpdate.isPending}
                                    className="bg-[#C67C5A] text-white hover:bg-[#B56A48] h-8 text-xs"
                                  >
                                    {itemUpdate.isPending ? 'Saving…' : 'Save'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingId(null)}
                                    className="border-[#E8E2DA] text-[#3D3632] hover:bg-[#F5F1EC] h-8 text-xs"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-4">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleOne(item.id)}
                                  aria-label={`Select ${item.name}`}
                                  className="flex-shrink-0 border-[#D4C9BF] data-[state=checked]:bg-[#C67C5A] data-[state=checked]:border-[#C67C5A]"
                                />
                                <div className="h-14 w-14 rounded-lg bg-[#F5F1EC] flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {item.imageUrl && isSafeUrl(item.imageUrl) ? (
                                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                                  ) : (
                                    <Gift className="h-6 w-6 text-[#A39B92]" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-[#3D3632] truncate">{item.name}</p>
                                  <p className="text-sm text-[#6B6058]">
                                    {item.price ? `$${item.price}` : 'No price'} · on{' '}
                                    <span
                                      className="text-[#C67C5A] cursor-pointer hover:underline"
                                      onClick={() => navigate(`/lists/${item.listId}`)}
                                    >
                                      {item.list?.title ?? 'Unknown list'}
                                    </span>
                                  </p>
                                  {activeClaim && (
                                    <p className="text-xs text-[#A39B92] mt-0.5">
                                      Claimed{activeClaim.name ? ` by ${activeClaim.name}` : ''}
                                    </p>
                                  )}
                                </div>

                                {/* Per-row ⋯ menu */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-[#A39B92] hover:text-[#3D3632] hover:bg-[#F5F1EC]"
                                      aria-label="Item actions"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="min-w-[180px]">
                                    <DropdownMenuItem
                                      onClick={() => startEdit(item)}
                                      className="cursor-pointer gap-2"
                                    >
                                      <Pencil className="h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger className="cursor-pointer gap-2">
                                        <ArrowRight className="h-4 w-4" />
                                        Move to…
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent className="min-w-[180px]">
                                        {ownedListsSlim
                                          .filter((l) => l.id !== item.listId)
                                          .map((l) => (
                                            <DropdownMenuItem
                                              key={l.id}
                                              onClick={() => moveItems.mutate({ itemIds: [item.id], targetListId: l.id })}
                                              className="cursor-pointer"
                                            >
                                              {l.title}
                                            </DropdownMenuItem>
                                          ))}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => {
                                            pendingActionRef.current = { action: 'move', itemIds: [item.id] }
                                            setCreateOpen(true)
                                          }}
                                          className="cursor-pointer text-[#C67C5A] font-medium gap-2"
                                        >
                                          <Plus className="h-4 w-4" />
                                          Create new list
                                        </DropdownMenuItem>
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger className="cursor-pointer gap-2">
                                        <Copy className="h-4 w-4" />
                                        Copy to…
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent className="min-w-[180px]">
                                        {ownedListsSlim.map((l) => (
                                          <DropdownMenuItem
                                            key={l.id}
                                            onClick={() => copyItems.mutate({ itemIds: [item.id], targetListId: l.id })}
                                            className="cursor-pointer"
                                          >
                                            {l.title}
                                          </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => {
                                            pendingActionRef.current = { action: 'copy', itemIds: [item.id] }
                                            setCreateOpen(true)
                                          }}
                                          className="cursor-pointer text-[#C67C5A] font-medium gap-2"
                                        >
                                          <Plus className="h-4 w-4" />
                                          Create new list
                                        </DropdownMenuItem>
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => navigate(`/lists/${item.listId}`)}
                                      className="cursor-pointer gap-2"
                                    >
                                      <Eye className="h-4 w-4" />
                                      Open list
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setDeletingItemId(item.id)}
                                      className="cursor-pointer text-red-600 focus:text-red-600 gap-2"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Bulk action bar — visible when ≥1 item selected */}
              {selectedIds.size > 0 && (
                <BulkActionBar
                  count={selectedIds.size}
                  ownedLists={ownedListsSlim}
                  claimedItems={claimedInSelection}
                  onMove={handleMove}
                  onCopy={(targetListId) =>
                    copyItems.mutate({ itemIds: [...selectedIds], targetListId })
                  }
                  onDelete={() =>
                    bulkDelete.mutate({ itemIds: [...selectedIds] })
                  }
                  onCreateNewAndMove={() => {
                    pendingActionRef.current = { action: 'move' }
                    setCreateOpen(true)
                  }}
                  onCreateNewAndCopy={() => {
                    pendingActionRef.current = { action: 'copy' }
                    setCreateOpen(true)
                  }}
                  onClear={() => setSelectedIds(new Set())}
                />
              )}

              {/* Single-item delete confirmation */}
              <AlertDialog open={!!deletingItemId} onOpenChange={() => setDeletingItemId(null)}>
                <AlertDialogContent className="bg-white border-[#E8E2DA]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-serif text-[#3D3632]">Remove this item?</AlertDialogTitle>
                    <AlertDialogDescription className="text-[#6B6058]">
                      This removes the item from the list. Anyone who claimed it will be notified.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-[#E8E2DA] text-[#3D3632] hover:bg-[#F5F1EC]">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deletingItemId && itemDelete.mutate({ id: deletingItemId })}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      Remove item
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )
        })()}
      </main>

      {/* Create List Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-white border-[#E8E2DA] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#3D3632]">Create a new list</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-[#3D3632]">List name</Label>
              <Input
                placeholder="Sarah's Birthday"
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                className="mt-1 border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
              />
            </div>
            <div>
              <Label className="text-[#3D3632]">Password</Label>
              <Input
                placeholder="Enter a password"
                value={newListPassword}
                onChange={(e) => setNewListPassword(e.target.value)}
                className="mt-1 border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
              />
              <button
                onClick={suggestPassphrase}
                className="mt-1 text-xs text-[#C67C5A] hover:underline"
              >
                Suggest a passphrase
              </button>
            </div>
            <div className="border-t border-[#E8E2DA] pt-4">
              <Label className="text-[#3D3632] text-sm">Payment handles (optional)</Label>
              <p className="text-xs text-[#A39B92] mb-2">Shown to group gift contributors</p>
              <div className="space-y-2">
                <Input placeholder="Zelle handle" value={newListZelle} onChange={(e) => setNewListZelle(e.target.value)} className="border-[#E8E2DA] focus-visible:ring-[#C67C5A]" />
                <Input placeholder="Venmo handle" value={newListVenmo} onChange={(e) => setNewListVenmo(e.target.value)} className="border-[#E8E2DA] focus-visible:ring-[#C67C5A]" />
                <Input placeholder="PayPal handle" value={newListPaypal} onChange={(e) => setNewListPaypal(e.target.value)} className="border-[#E8E2DA] focus-visible:ring-[#C67C5A]" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="flex-1 border-[#E8E2DA] text-[#3D3632] hover:bg-[#F5F1EC]">
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newListTitle.trim() || !newListPassword.trim() || createList.isPending}
                className="flex-1 bg-[#C67C5A] text-white hover:bg-[#B56A48]"
              >
                {createList.isPending ? 'Creating...' : 'Create list'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
