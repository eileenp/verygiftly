import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { isSafeUrl } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Plus,
  Copy,
  Settings,
  ArrowLeft,
  Gift,
  ExternalLink,
  Eye,
  EyeOff,
  Check,
  Trash2,
  Edit3,
  Lock,
} from 'lucide-react'

export default function ListManage() {
  const { id } = useParams<{ id: string }>()
  const listId = Number(id)
  const navigate = useNavigate()
  const { user } = useAuth({ redirectOnUnauthenticated: true })
  const utils = trpc.useUtils()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [editItemOpen, setEditItemOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)

  // Item form state
  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemQuantity, setItemQuantity] = useState('1')
  const [itemNotes, setItemNotes] = useState('')
  const [itemUrl, setItemUrl] = useState('')
  const [itemImage, setItemImage] = useState('')
  const [isGroupGift, setIsGroupGift] = useState(false)
  const [targetPrice, setTargetPrice] = useState('')

  // Settings form state
  const [settingsTitle, setSettingsTitle] = useState('')
  const [settingsPassword, setSettingsPassword] = useState('')
  const [settingsZelle, setSettingsZelle] = useState('')
  const [settingsVenmo, setSettingsVenmo] = useState('')
  const [settingsPaypal, setSettingsPaypal] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: list, isLoading } = trpc.list.get.useQuery(
    { id: listId },
    { enabled: !!user && !!listId }
  )

  const deleteList = trpc.list.delete.useMutation({
    onSuccess: () => {
      navigate('/dashboard')
    },
  })

  const updateList = trpc.list.update.useMutation({
    onSuccess: () => {
      utils.list.get.invalidate({ id: listId })
      utils.list.mine.invalidate()
      setSettingsOpen(false)
      setShowDeleteConfirm(false)
      setDeleteConfirm('')
    },
  })

  const createItem = trpc.item.create.useMutation({
    onSuccess: () => {
      utils.list.get.invalidate({ id: listId })
      setAddItemOpen(false)
      resetItemForm()
    },
  })

  const updateItem = trpc.item.update.useMutation({
    onSuccess: () => {
      utils.list.get.invalidate({ id: listId })
      setEditItemOpen(false)
      setEditingItem(null)
      resetItemForm()
    },
  })

  const deleteItem = trpc.item.delete.useMutation({
    onSuccess: () => {
      utils.list.get.invalidate({ id: listId })
    },
  })

  function resetItemForm() {
    setItemName('')
    setItemPrice('')
    setItemQuantity('1')
    setItemNotes('')
    setItemUrl('')
    setItemImage('')
    setIsGroupGift(false)
    setTargetPrice('')
  }

  function openEditItem(item: any) {
    setEditingItem(item)
    setItemName(item.name)
    setItemPrice(item.price ? String(item.price) : '')
    setItemQuantity(String(item.quantity))
    setItemNotes(item.notes || '')
    setItemUrl(item.purchaseUrl || '')
    setItemImage(item.imageUrl || '')
    setIsGroupGift(item.isGroupGift)
    setTargetPrice(item.targetPrice ? String(item.targetPrice) : '')
    setEditItemOpen(true)
  }

  function handleCreateItem() {
    if (!itemName.trim()) return
    createItem.mutate({
      listId,
      name: itemName.trim(),
      price: itemPrice ? parseFloat(itemPrice) : undefined,
      quantity: parseInt(itemQuantity) || 1,
      notes: itemNotes || undefined,
      purchaseUrl: itemUrl || undefined,
      imageUrl: itemImage || undefined,
      isGroupGift,
      targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
    })
  }

  function handleUpdateItem() {
    if (!editingItem || !itemName.trim()) return
    updateItem.mutate({
      id: editingItem.id,
      name: itemName.trim(),
      price: itemPrice ? parseFloat(itemPrice) : undefined,
      quantity: parseInt(itemQuantity) || 1,
      notes: itemNotes || undefined,
      purchaseUrl: itemUrl || undefined,
      imageUrl: itemImage || undefined,
      isGroupGift,
      targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
    })
  }

  const isPasswordHashed = list?.password?.startsWith('pbkdf2:') ?? false

  function copyLinkAndPassword() {
    if (!list) return
    const url = `${window.location.origin}/lists/${list.id}/access`
    const text = isPasswordHashed
      ? url
      : `${url}\nPassword: ${list.password}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openSettings() {
    if (!list) return
    setSettingsTitle(list.title)
    setSettingsPassword('')
    setSettingsZelle(list.zelle || '')
    setSettingsVenmo(list.venmo || '')
    setSettingsPaypal(list.paypal || '')
    setSettingsOpen(true)
  }

  function handleUpdateList() {
    if (!list) return
    const newPassword = settingsPassword.trim()
    updateList.mutate({
      id: listId,
      title: settingsTitle.trim(),
      ...(newPassword ? { password: newPassword } : {}),
      zelle: settingsZelle || undefined,
      venmo: settingsVenmo || undefined,
      paypal: settingsPaypal || undefined,
    })
  }

  if (isLoading || !list) {
    return (
      <div className="min-h-screen bg-[#FDFBF7]">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C67C5A] border-t-transparent" />
        </div>
      </div>
    )
  }

  const totalItems = list.items?.length || 0
  const claimedCount = list.items?.reduce((acc: number, item: any) => acc + (item.claims?.length || 0), 0) || 0
  const purchasedCount = list.items?.reduce((acc: number, item: any) => acc + (item.claims?.filter((c: any) => c.purchased)?.length || 0), 0) || 0

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1 text-sm text-[#6B6058] hover:text-[#3D3632] mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[#3D3632]">{list.title}</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openSettings}
              className="border-[#E8E2DA] text-[#3D3632] hover:bg-[#F5F1EC]"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button
              size="sm"
              onClick={() => {
                resetItemForm()
                setAddItemOpen(true)
              }}
              className="bg-[#C67C5A] text-white hover:bg-[#B56A48]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add item
            </Button>
          </div>
        </div>

        {/* Share Strip */}
        <Card className="border-[#E8E2DA] bg-white mb-6">
          <CardContent className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#A39B92] uppercase tracking-wider mb-1">Share link</p>
                <code className="block truncate rounded-md bg-[#F5F1EC] px-3 py-2 text-sm text-[#3D3632] font-mono">
                  {window.location.origin}/lists/{list.id}/access
                </code>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#A39B92]" />
                  <span className="font-mono text-sm text-[#3D3632]">
                    {showPassword && !isPasswordHashed ? list.password : '••••••••'}
                  </span>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#A39B92] hover:text-[#3D3632]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyLinkAndPassword}
                  className="border-[#E8E2DA] text-[#3D3632] hover:bg-[#F5F1EC]"
                >
                  {copied ? <Check className="mr-2 h-4 w-4 text-[#5A8F6E]" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy link + password'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl bg-white border border-[#E8E2DA] p-4 text-center">
            <p className="text-2xl font-semibold text-[#3D3632]">{totalItems}</p>
            <p className="text-xs text-[#6B6058]">Total items</p>
          </div>
          <div className="rounded-xl bg-white border border-[#E8E2DA] p-4 text-center">
            <p className="text-2xl font-semibold text-[#C67C5A]">{claimedCount}</p>
            <p className="text-xs text-[#6B6058]">Claimed</p>
          </div>
          <div className="rounded-xl bg-white border border-[#E8E2DA] p-4 text-center">
            <p className="text-2xl font-semibold text-[#5A8F6E]">{purchasedCount}</p>
            <p className="text-xs text-[#6B6058]">Purchased</p>
          </div>
        </div>

        {/* Items */}
        {totalItems === 0 && (
          <Card className="border-[#E8E2DA] bg-white">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#C67C5A]/10">
                <Gift className="h-8 w-8 text-[#C67C5A]" />
              </div>
              <h3 className="mt-4 font-serif text-xl font-semibold text-[#3D3632]">Your list has no items yet</h3>
              <p className="mt-2 text-[#6B6058]">Add items by pasting a link from any shop.</p>
              <Button
                onClick={() => {
                  resetItemForm()
                  setAddItemOpen(true)
                }}
                className="mt-6 bg-[#C67C5A] text-white hover:bg-[#B56A48]"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add from a URL
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {list.items?.map((item: any) => {
            const claims = item.claims || []
            const contributions = item.contributions || []
            const isFullyClaimed = claims.length >= item.quantity
            const isPurchased = claims.some((c: any) => c.purchased)
            const isGroup = item.isGroupGift
            const totalContributed = contributions.reduce((acc: number, c: any) => acc + parseFloat(c.amount || 0), 0)
            const target = item.targetPrice ? parseFloat(item.targetPrice) : 0
            const progress = target > 0 ? Math.min((totalContributed / target) * 100, 100) : 0

            return (
              <Card key={item.id} className={`border-[#E8E2DA] bg-white ${isFullyClaimed && !isGroup ? 'opacity-70' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    <div className="h-20 w-20 rounded-lg bg-[#F5F1EC] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {item.imageUrl && isSafeUrl(item.imageUrl) ? (
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <Gift className="h-8 w-8 text-[#A39B92]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-[#3D3632]">{item.name}</h3>
                          <p className="text-sm text-[#6B6058]">
                            {item.price ? `$${item.price}` : 'No price set'}
                            {item.quantity > 1 && ` · Qty: ${item.quantity}`}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditItem(item)}
                            className="text-[#6B6058] hover:text-[#3D3632] hover:bg-[#F5F1EC] h-8 w-8 p-0"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Delete this item?')) deleteItem.mutate({ id: item.id })
                            }}
                            className="text-[#B85450] hover:text-[#A04440] hover:bg-[#B85450]/10 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {item.notes && (
                        <p className="mt-1 text-xs text-[#A39B92]">{item.notes}</p>
                      )}

                      {/* Status badges */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {isGroup && (
                          <span className="inline-flex items-center rounded-full bg-[#8FA98F]/10 px-2.5 py-0.5 text-xs font-medium text-[#5A8F6E]">
                            Group gift
                          </span>
                        )}
                        {isFullyClaimed && !isGroup && (
                          <span className="inline-flex items-center rounded-full bg-[#C67C5A]/10 px-2.5 py-0.5 text-xs font-medium text-[#C67C5A]">
                            Claimed
                          </span>
                        )}
                        {isPurchased && !isGroup && (
                          <span className="inline-flex items-center rounded-full bg-[#5A8F6E]/10 px-2.5 py-0.5 text-xs font-medium text-[#5A8F6E]">
                            Purchased
                          </span>
                        )}
                        {item.purchaseUrl && (
                          <a
                            href={item.purchaseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-[#C67C5A] hover:underline"
                          >
                            <ExternalLink className="mr-1 h-3 w-3" />
                            View on site
                          </a>
                        )}
                      </div>

                      {/* Owner-only claim details */}
                      {claims.length > 0 && !isGroup && (
                        <div className="mt-3 space-y-1">
                          {claims.map((claim: any) => (
                            <div key={claim.id} className="flex items-center gap-2 text-xs">
                              <span className={`inline-block h-2 w-2 rounded-full ${claim.purchased ? 'bg-[#5A8F6E]' : 'bg-[#C67C5A]'}`} />
                              <span className="text-[#6B6058]">
                                {claim.name} ({claim.email})
                                {claim.purchased && ' — purchased'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Group gift contributors */}
                      {isGroup && contributions.length > 0 && (
                        <div className="mt-3">
                          <div className="h-2 w-full rounded-full bg-[#F5F1EC]">
                            <div
                              className="h-2 rounded-full bg-[#C67C5A] transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-[#6B6058]">
                            ${totalContributed.toFixed(2)} of ${target.toFixed(2)} · {contributions.length} contributors
                          </p>
                          <div className="mt-2 space-y-1">
                            {contributions.map((c: any) => (
                              <div key={c.id} className="flex items-center justify-between text-xs">
                                <span className="text-[#6B6058]">{c.name} — ${parseFloat(c.amount || 0).toFixed(2)}</span>
                                <span className={`${c.paid ? 'text-[#5A8F6E]' : 'text-[#D4A574]'}`}>
                                  {c.paid ? 'Paid' : 'Pledged'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>

      {/* Add/Edit Item Modal */}
      <Dialog open={addItemOpen || editItemOpen} onOpenChange={(open) => {
        if (!open) {
          setAddItemOpen(false)
          setEditItemOpen(false)
          resetItemForm()
          setEditingItem(null)
        }
      }}>
        <DialogContent className="bg-white border-[#E8E2DA] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#3D3632]">
              {editItemOpen ? 'Edit item' : 'Add an item'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-[#3D3632]">Item name <span className="text-[#B85450]">*</span></Label>
              <Input
                placeholder="What do you want?"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="mt-1 border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#3D3632]">Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="mt-1 border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
                />
              </div>
              <div>
                <Label className="text-[#3D3632]">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                  className="mt-1 border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
                />
              </div>
            </div>
            <div>
              <Label className="text-[#3D3632]">Notes</Label>
              <Textarea
                placeholder="Size, color preference, etc."
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                className="mt-1 border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
              />
            </div>
            <div>
              <Label className="text-[#3D3632]">Purchase link</Label>
              <Input
                placeholder="https://..."
                value={itemUrl}
                onChange={(e) => setItemUrl(e.target.value)}
                className="mt-1 border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
              />
            </div>
            <div>
              <Label className="text-[#3D3632]">Image URL</Label>
              <Input
                placeholder="https://..."
                value={itemImage}
                onChange={(e) => setItemImage(e.target.value)}
                className="mt-1 border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Switch
                checked={isGroupGift}
                onCheckedChange={setIsGroupGift}
                className="data-[state=checked]:bg-[#C67C5A]"
              />
              <Label className="text-[#3D3632] cursor-pointer">This is a group gift</Label>
            </div>
            {isGroupGift && (
              <div>
                <Label className="text-[#3D3632]">Target price</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="mt-1 border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
                />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAddItemOpen(false)
                  setEditItemOpen(false)
                  resetItemForm()
                  setEditingItem(null)
                }}
                className="flex-1 border-[#E8E2DA] text-[#3D3632] hover:bg-[#F5F1EC]"
              >
                Cancel
              </Button>
              <Button
                onClick={editItemOpen ? handleUpdateItem : handleCreateItem}
                disabled={!itemName.trim() || (editItemOpen ? updateItem.isPending : createItem.isPending)}
                className="flex-1 bg-[#C67C5A] text-white hover:bg-[#B56A48]"
              >
                {editItemOpen ? (updateItem.isPending ? 'Saving...' : 'Save changes') : (createItem.isPending ? 'Adding...' : 'Add to list')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-white border-[#E8E2DA] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#3D3632]">List settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-[#3D3632]">List name</Label>
              <Input
                value={settingsTitle}
                onChange={(e) => setSettingsTitle(e.target.value)}
                className="mt-1 border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
              />
            </div>
            <div>
              <Label className="text-[#3D3632]">Password</Label>
              <Input
                type="password"
                placeholder="Leave blank to keep current password"
                value={settingsPassword}
                onChange={(e) => setSettingsPassword(e.target.value)}
                className="mt-1 border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
              />
            </div>
            <div className="border-t border-[#E8E2DA] pt-4">
              <Label className="text-[#3D3632] text-sm">Payment handles</Label>
              <p className="text-xs text-[#A39B92] mb-2">Shown to group gift contributors</p>
              <div className="space-y-2">
                <Input placeholder="Zelle handle" value={settingsZelle} onChange={(e) => setSettingsZelle(e.target.value)} className="border-[#E8E2DA] focus-visible:ring-[#C67C5A]" />
                <Input placeholder="Venmo handle" value={settingsVenmo} onChange={(e) => setSettingsVenmo(e.target.value)} className="border-[#E8E2DA] focus-visible:ring-[#C67C5A]" />
                <Input placeholder="PayPal handle" value={settingsPaypal} onChange={(e) => setSettingsPaypal(e.target.value)} className="border-[#E8E2DA] focus-visible:ring-[#C67C5A]" />
              </div>
            </div>
            <div className="border-t border-[#E8E2DA] pt-4">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-sm text-[#B85450] hover:underline"
                >
                  Delete this list
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[#6B6058]">
                    Type "<strong>{list.title}</strong>" to confirm deletion.
                  </p>
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={list.title}
                    className="border-[#E8E2DA] focus-visible:ring-[#B85450]"
                  />
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setDeleteConfirm('')
                      }}
                      className="flex-1 border-[#E8E2DA]"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => deleteList.mutate({ id: listId })}
                      disabled={deleteConfirm !== list.title || deleteList.isPending}
                      className="flex-1"
                    >
                      {deleteList.isPending ? 'Deleting...' : 'Delete list'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSettingsOpen(false)
                  setShowDeleteConfirm(false)
                  setDeleteConfirm('')
                }}
                className="flex-1 border-[#E8E2DA] text-[#3D3632] hover:bg-[#F5F1EC]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateList}
                disabled={updateList.isPending}
                className="flex-1 bg-[#C67C5A] text-white hover:bg-[#B56A48]"
              >
                {updateList.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
