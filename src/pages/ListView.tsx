import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { isSafeUrl } from '@/lib/utils'
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
import { Switch } from '@/components/ui/switch'
import {
  Gift,
  ExternalLink,
  Check,
  Eye,
  Lock,
} from 'lucide-react'

export default function ListView() {
  const { id } = useParams<{ id: string }>()
  const listId = Number(id)
  const [password, setPassword] = useState('')
  const [claimOpen, setClaimOpen] = useState(false)
  const [contributeOpen, setContributeOpen] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState(false)
  const [contributeSuccess, setContributeSuccess] = useState(false)
  const [claimResult, setClaimResult] = useState<{ id: number; token: string | null } | null>(null)
  const [contributeResult, setContributeResult] = useState<{ id: number; token: string | null } | null>(null)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [showClaimed, setShowClaimed] = useState(false)

  // Claim form
  const [claimerName, setClaimerName] = useState('')
  const [claimerEmail, setClaimerEmail] = useState('')
  const [createAccount, setCreateAccount] = useState(false)

  // Contribute form
  const [contributorName, setContributorName] = useState('')
  const [contributorEmail, setContributorEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [quickAmount, setQuickAmount] = useState<number | null>(null)
  const [hasPaid, setHasPaid] = useState(false)

  const [viewerEmail, setViewerEmail] = useState('')

  // Get stored password and viewer email
  useEffect(() => {
    const stored = sessionStorage.getItem(`list-password-${listId}`)
    if (stored) setPassword(stored)
    const email = localStorage.getItem('viewer-email')
    if (email) setViewerEmail(email)
  }, [listId])

  const { data: list, isLoading, error } = trpc.viewer.getList.useQuery(
    { id: listId, password },
    { enabled: !!password, retry: false }
  )

  const utils = trpc.useUtils()

  const claimItem = trpc.viewer.claim.useMutation({
    onSuccess: (data) => {
      setClaimSuccess(true)
      if (data) setClaimResult({ id: data.id, token: data.token ?? null })
      utils.viewer.getList.invalidate({ id: listId, password })
    },
  })

  const contributeItem = trpc.viewer.contribute.useMutation({
    onSuccess: (data) => {
      setContributeSuccess(true)
      if (data) setContributeResult({ id: data.id, token: data.token ?? null })
    },
  })

  function openClaim(item: any) {
    setSelectedItem(item)
    setClaimSuccess(false)
    setClaimerName('')
    setClaimerEmail('')
    setCreateAccount(false)
    setClaimOpen(true)
  }

  function openContribute(item: any) {
    setSelectedItem(item)
    setContributeSuccess(false)
    setContributorName('')
    setContributorEmail('')
    setAmount('')
    setQuickAmount(null)
    setHasPaid(false)
    setContributeOpen(true)
  }

  function handleClaim() {
    if (!selectedItem || !claimerName.trim() || !claimerEmail.trim()) return
    const email = claimerEmail.trim()
    localStorage.setItem('viewer-email', email)
    setViewerEmail(email)
    claimItem.mutate({
      itemId: selectedItem.id,
      name: claimerName.trim(),
      email,
    })
  }

  function handleContribute() {
    if (!selectedItem || !contributorName.trim() || !contributorEmail.trim() || !amount) return
    contributeItem.mutate({
      itemId: selectedItem.id,
      name: contributorName.trim(),
      email: contributorEmail.trim(),
      amount: parseFloat(amount),
      paid: hasPaid,
    })
  }

  function selectQuickAmount(amt: number) {
    setQuickAmount(amt)
    setAmount(String(amt))
  }

  if (!password) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
        <Card className="w-full max-w-sm bg-white border-[#E8E2DA]">
          <CardContent className="p-8 text-center">
            <Lock className="mx-auto h-8 w-8 text-[#C67C5A]" />
            <h2 className="mt-4 font-serif text-xl font-semibold text-[#3D3632]">Password required</h2>
            <p className="mt-2 text-sm text-[#6B6058]">
              Please enter the password on the access page first.
            </p>
            <Button
              asChild
              className="mt-4 bg-[#C67C5A] text-white hover:bg-[#B56A48]"
            >
              <Link to={`/lists/${listId}/access`}>Enter password</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C67C5A] border-t-transparent" />
      </div>
    )
  }

  if (error || !list) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
        <Card className="w-full max-w-sm bg-white border-[#E8E2DA]">
          <CardContent className="p-8 text-center">
            <h2 className="font-serif text-xl font-semibold text-[#3D3632]">List not found</h2>
            <p className="mt-2 text-sm text-[#6B6058]">
              The link may have changed or the list may have been removed.
            </p>
            <Button asChild className="mt-4 bg-[#C67C5A] text-white hover:bg-[#B56A48]">
              <Link to="/">Go to homepage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalItems = list.items?.length || 0
  const availableItems = list.items?.filter((item: any) => {
    const claimsCount = item.claims?.length || 0
    return claimsCount < item.quantity && !item.isGroupGift
  }) || []
  const allClaimed = availableItems.length === 0 && totalItems > 0 && !list.items?.some((i: any) => i.isGroupGift)

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <nav className="sticky top-0 z-50 w-full border-b border-[#E8E2DA]/50 bg-[#FDFBF7]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link to="/" className="font-serif text-xl font-semibold text-[#3D3632]">Gifsto</Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-2">
          <p className="text-xs text-[#A39B92] uppercase tracking-wider">Gift list for</p>
          <h1 className="font-serif text-3xl font-semibold text-[#3D3632]">{list.title}</h1>
          <p className="mt-1 text-sm text-[#6B6058]">
            {totalItems} items · {availableItems.length} available
          </p>
        </div>

        {allClaimed && (
          <Card className="border-[#E8E2DA] bg-white mb-6">
            <CardContent className="flex flex-col items-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#8FA98F]/10">
                <Check className="h-6 w-6 text-[#5A8F6E]" />
              </div>
              <h3 className="mt-4 font-serif text-xl font-semibold text-[#3D3632]">Everything has been claimed</h3>
              <p className="mt-2 text-[#6B6058]">
                {list.owner?.name || 'The list owner'} may add more — check back.
              </p>
              <Button
                variant="outline"
                onClick={() => setShowClaimed(!showClaimed)}
                className="mt-4 border-[#E8E2DA] text-[#3D3632] hover:bg-[#F5F1EC]"
              >
                <Eye className="mr-2 h-4 w-4" />
                {showClaimed ? 'Hide claimed items' : 'See what\'s been claimed'}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {[...(list.items ?? [])].sort((a: any, b: any) => {
            const aMine = viewerEmail && a.claims?.some((c: any) => c.email === viewerEmail)
            const bMine = viewerEmail && b.claims?.some((c: any) => c.email === viewerEmail)
            if (aMine && !bMine) return -1
            if (!aMine && bMine) return 1
            return 0
          }).map((item: any) => {
            const claims = item.claims || []
            const contributions = item.contributions || []
            const isFullyClaimed = !item.isGroupGift && claims.length >= item.quantity
            const isPurchased = claims.some((c: any) => c.purchased)
            const isGroup = item.isGroupGift
            const isClaimedByMe = !!viewerEmail && claims.some((c: any) => c.email === viewerEmail)
            const totalContributed = contributions.reduce((acc: number, c: any) => acc + parseFloat(c.amount || 0), 0)
            const target = item.targetPrice ? parseFloat(item.targetPrice) : 0
            const progress = target > 0 ? Math.min((totalContributed / target) * 100, 100) : 0

            if (isFullyClaimed && !isClaimedByMe && !showClaimed && !isGroup) return null

            return (
              <Card key={item.id} className={`border-[#E8E2DA] overflow-hidden ${isFullyClaimed && !isClaimedByMe ? 'opacity-70' : ''}`}>
                <CardContent className="p-0">
                  <div className="flex">
                    {isClaimedByMe && <div className="w-1.5 bg-[#5A8F6E] flex-shrink-0" />}
                    <div className={`p-5 flex-1 ${isClaimedByMe ? 'bg-[#5A8F6E]/5' : 'bg-white'}`}>
                  <div className="flex gap-4">
                    <div className="h-24 w-24 rounded-lg bg-[#F5F1EC] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {item.imageUrl && isSafeUrl(item.imageUrl) ? (
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <Gift className="h-8 w-8 text-[#A39B92]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[#3D3632]">{item.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm text-[#6B6058]">
                          {item.price ? `$${item.price}` : 'No price set'}
                        </p>
                        {item.purchaseUrl && isSafeUrl(item.purchaseUrl) && (
                          <a
                            href={item.purchaseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-[#F5F1EC] border border-[#E8E2DA] px-2.5 py-0.5 text-xs font-medium text-[#6B6058] hover:bg-[#EDE9E2] transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Purchase
                          </a>
                        )}
                      </div>

                      {item.notes && (
                        <p className="mt-1 text-xs text-[#A39B92]">{item.notes}</p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {isClaimedByMe && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#5A8F6E] px-2.5 py-0.5 text-xs font-medium text-white">
                            <Check className="h-3 w-3" />
                            Claimed by you
                          </span>
                        )}
                        {isGroup && (
                          <span className="inline-flex items-center rounded-full bg-[#8FA98F]/10 px-2.5 py-0.5 text-xs font-medium text-[#5A8F6E]">
                            Group gift
                          </span>
                        )}
                        {isFullyClaimed && !isGroup && !isClaimedByMe && (
                          <span className="inline-flex items-center rounded-full bg-[#C67C5A]/10 px-2.5 py-0.5 text-xs font-medium text-[#C67C5A]">
                            Claimed
                          </span>
                        )}
                        {isPurchased && !isGroup && (
                          <span className="inline-flex items-center rounded-full bg-[#5A8F6E]/10 px-2.5 py-0.5 text-xs font-medium text-[#5A8F6E]">
                            Purchased
                          </span>
                        )}
                      </div>

                      {isGroup && (
                        <div className="mt-3">
                          <div className="h-2 w-full rounded-full bg-[#F5F1EC]">
                            <div
                              className="h-2 rounded-full bg-[#C67C5A] transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <p className="text-xs text-[#6B6058]">
                              ${totalContributed.toFixed(2)} of ${target.toFixed(2)} · {contributions.length} contributors
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => openContribute(item)}
                            className="mt-2 bg-[#C67C5A] text-white hover:bg-[#B56A48]"
                          >
                            Contribute
                          </Button>
                        </div>
                      )}

                      {!isGroup && !isFullyClaimed && !isClaimedByMe && (
                        <Button
                          size="sm"
                          onClick={() => openClaim(item)}
                          className="mt-3 bg-[#C67C5A] text-white hover:bg-[#B56A48]"
                        >
                          Claim this
                        </Button>
                      )}
                    </div>
                  </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>

      {/* Claim Modal */}
      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent className="bg-white border-[#E8E2DA] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#3D3632]">Claim this gift</DialogTitle>
          </DialogHeader>
          {!claimSuccess ? (
            <div className="space-y-4 py-2">
              {selectedItem && (
                <p className="text-sm text-[#6B6058]">
                  <strong className="text-[#3D3632]">{selectedItem.name}</strong>
                  {selectedItem.price && ` — $${selectedItem.price}`}
                </p>
              )}
              <div className="rounded-lg bg-[#D4A574]/10 p-3 border border-[#D4A574]/20">
                <p className="text-xs text-[#6B6058]">
                  <strong>Privacy note:</strong> Your name and email are visible to the list owner. Other viewers only see that this item has been claimed — not by whom.
                </p>
              </div>
              <div>
                <Label className="text-[#3D3632]">Your name <span className="text-[#B85450]">*</span></Label>
                <Input
                  value={claimerName}
                  onChange={(e) => setClaimerName(e.target.value)}
                  className="mt-1 border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
                />
              </div>
              <div>
                <Label className="text-[#3D3632]">Your email <span className="text-[#B85450]">*</span></Label>
                <Input
                  type="email"
                  value={claimerEmail}
                  onChange={(e) => setClaimerEmail(e.target.value)}
                  className="mt-1 border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={createAccount}
                  onCheckedChange={setCreateAccount}
                  className="data-[state=checked]:bg-[#C67C5A]"
                />
                <Label className="text-sm text-[#6B6058] cursor-pointer">Create an account to track my claims across all lists</Label>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setClaimOpen(false)}
                  className="flex-1 border-[#E8E2DA] text-[#3D3632] hover:bg-[#F5F1EC]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleClaim}
                  disabled={!claimerName.trim() || !claimerEmail.trim() || claimItem.isPending}
                  className="flex-1 bg-[#C67C5A] text-white hover:bg-[#B56A48]"
                >
                  {claimItem.isPending ? 'Claiming...' : 'Claim it'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#5A8F6E]/10">
                <Check className="h-6 w-6 text-[#5A8F6E]" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-[#3D3632]">
                You've claimed {selectedItem?.name}
              </h3>
              {claimResult?.token ? (
                <div className="mt-3 rounded-lg bg-[#F5F1EC] p-3 text-left text-xs text-[#6B6058]">
                  <p className="font-medium text-[#3D3632] mb-2">Save these links to manage your claim:</p>
                  <a
                    href={`/claim/${claimResult.id}?token=${claimResult.token}`}
                    className="block text-[#C67C5A] hover:underline mb-1"
                  >
                    → Unclaim this gift
                  </a>
                  <a
                    href={`/purchased/${claimResult.id}?token=${claimResult.token}`}
                    className="block text-[#C67C5A] hover:underline"
                  >
                    → Mark as purchased
                  </a>
                </div>
              ) : (
                <p className="mt-2 text-sm text-[#6B6058]">
                  A confirmation email was sent with links to manage your claim.
                </p>
              )}
              <Button
                onClick={() => setClaimOpen(false)}
                className="mt-4 bg-[#C67C5A] text-white hover:bg-[#B56A48]"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contribute Modal */}
      <Dialog open={contributeOpen} onOpenChange={setContributeOpen}>
        <DialogContent className="bg-white border-[#E8E2DA] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#3D3632]">
              Contribute to {selectedItem?.name}
            </DialogTitle>
          </DialogHeader>
          {!contributeSuccess ? (
            <div className="space-y-4 py-2">
              {selectedItem && (
                <div>
                  <div className="h-2 w-full rounded-full bg-[#F5F1EC]">
                    <div
                      className="h-2 rounded-full bg-[#C67C5A]"
                      style={{
                        width: `${selectedItem.targetPrice
                          ? Math.min(
                              ((selectedItem.contributions?.reduce((acc: number, c: any) => acc + parseFloat(c.amount || 0), 0) || 0) / parseFloat(selectedItem.targetPrice)) * 100,
                              100
                            )
                          : 0}%`
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-[#6B6058]">
                    ${(selectedItem.contributions?.reduce((acc: number, c: any) => acc + parseFloat(c.amount || 0), 0) || 0).toFixed(2)} of ${selectedItem.targetPrice ? parseFloat(selectedItem.targetPrice).toFixed(2) : '0.00'} · {selectedItem.contributions?.length || 0} contributors
                  </p>
                </div>
              )}
              <div>
                <Label className="text-[#3D3632]">Your name <span className="text-[#B85450]">*</span></Label>
                <Input
                  value={contributorName}
                  onChange={(e) => setContributorName(e.target.value)}
                  className="mt-1 border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
                />
              </div>
              <div>
                <Label className="text-[#3D3632]">Your email <span className="text-[#B85450]">*</span></Label>
                <Input
                  type="email"
                  value={contributorEmail}
                  onChange={(e) => setContributorEmail(e.target.value)}
                  className="mt-1 border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
                />
              </div>
              <div>
                <Label className="text-[#3D3632]">Amount</Label>
                <div className="mt-1 flex gap-2">
                  {[25, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => selectQuickAmount(amt)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        quickAmount === amt
                          ? 'border-[#C67C5A] bg-[#C67C5A]/10 text-[#C67C5A]'
                          : 'border-[#E8E2DA] text-[#3D3632] hover:bg-[#F5F1EC]'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Custom amount"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    setQuickAmount(null)
                  }}
                  className="mt-2 border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
                />
              </div>
              {list && (list.zelle || list.venmo || list.paypal) && (
                <div className="rounded-lg bg-[#D4A574]/10 p-3 border border-[#D4A574]/20">
                  <p className="text-xs font-medium text-[#3D3632] mb-1">Payment instructions</p>
                  <p className="text-xs text-[#6B6058] mb-2">This app doesn't process payments. Send your amount directly, then confirm below.</p>
                  {list.zelle && <p className="text-xs font-mono text-[#3D3632]">Zelle: {list.zelle}</p>}
                  {list.venmo && <p className="text-xs font-mono text-[#3D3632]">Venmo: {list.venmo}</p>}
                  {list.paypal && <p className="text-xs font-mono text-[#3D3632]">PayPal: {list.paypal}</p>}
                </div>
              )}
              <div className="flex items-center gap-3">
                <Switch
                  checked={hasPaid}
                  onCheckedChange={setHasPaid}
                  className="data-[state=checked]:bg-[#C67C5A]"
                />
                <Label className="text-sm text-[#6B6058] cursor-pointer">I've already sent this payment</Label>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setContributeOpen(false)}
                  className="flex-1 border-[#E8E2DA] text-[#3D3632] hover:bg-[#F5F1EC]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleContribute}
                  disabled={!contributorName.trim() || !contributorEmail.trim() || !amount || contributeItem.isPending}
                  className="flex-1 bg-[#C67C5A] text-white hover:bg-[#B56A48]"
                >
                  {contributeItem.isPending ? 'Saving...' : hasPaid ? 'Confirm contribution (paid)' : `Pledge $${amount || '0'}`}
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#5A8F6E]/10">
                <Check className="h-6 w-6 text-[#5A8F6E]" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-[#3D3632]">
                Contribution recorded
              </h3>
              <p className="mt-2 text-sm text-[#6B6058]">
                Thank you for contributing ${amount} toward {selectedItem?.name}.
              </p>
              {contributeResult?.token && (
                <div className="mt-3 rounded-lg bg-[#F5F1EC] p-3 text-left text-xs text-[#6B6058]">
                  <p className="font-medium text-[#3D3632] mb-2">Save this link to manage your contribution:</p>
                  <a
                    href={`/contribution/${contributeResult.id}?token=${contributeResult.token}`}
                    className="block text-[#C67C5A] hover:underline"
                  >
                    → Update or delete contribution
                  </a>
                </div>
              )}
              <Button
                onClick={() => setContributeOpen(false)}
                className="mt-4 bg-[#C67C5A] text-white hover:bg-[#B56A48]"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
