import { useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Gift, Check, Trash2, AlertTriangle } from 'lucide-react'
import { Logo } from '@/components/Logo'

export default function ContributionManage() {
  const { contributionId } = useParams<{ contributionId: string }>()
  const [searchParams] = useSearchParams()
  const id = Number(contributionId)
  const token = searchParams.get('token') ?? ''
  const [success, setSuccess] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [amount, setAmount] = useState('')
  const [hasPaid, setHasPaid] = useState(false)

  const updateContribution = trpc.viewer.updateContribution.useMutation({
    onSuccess: () => setSuccess(true),
  })

  const deleteContribution = trpc.viewer.deleteContribution.useMutation({
    onSuccess: () => setDeleted(true),
  })

  function handleSave() {
    if (!amount) return
    updateContribution.mutate({
      contributionId: id,
      token,
      amount: parseFloat(amount),
      paid: hasPaid,
    })
  }

  function handleDelete() {
    deleteContribution.mutate({ contributionId: id, token })
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-white border-[#E8E2DA] shadow-lg">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-[#D4A574]" />
            <h2 className="mt-4 font-serif text-xl font-semibold text-[#3D3632]">Invalid link</h2>
            <p className="mt-2 text-sm text-[#6B6058]">
              This link is missing a security token. Please use the link exactly as it was provided to you.
            </p>
            <Button asChild className="mt-6 bg-[#C67C5A] text-white hover:bg-[#B56A48]">
              <Link to="/">Go to homepage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-white border-[#E8E2DA] shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#5A8F6E]/10">
              <Check className="h-6 w-6 text-[#5A8F6E]" />
            </div>
            <h2 className="mt-4 font-serif text-xl font-semibold text-[#3D3632]">Changes saved</h2>
            <p className="mt-2 text-sm text-[#6B6058]">Your contribution has been updated.</p>
            <Button asChild className="mt-6 bg-[#C67C5A] text-white hover:bg-[#B56A48]">
              <Link to="/">Go to homepage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (deleted) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-white border-[#E8E2DA] shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#5A8F6E]/10">
              <Check className="h-6 w-6 text-[#5A8F6E]" />
            </div>
            <h2 className="mt-4 font-serif text-xl font-semibold text-[#3D3632]">Contribution deleted</h2>
            <p className="mt-2 text-sm text-[#6B6058]">Your contribution has been removed.</p>
            <Button asChild className="mt-6 bg-[#C67C5A] text-white hover:bg-[#B56A48]">
              <Link to="/">Go to homepage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Logo className="h-14" />
        </div>
        <Card className="bg-white border-[#E8E2DA] shadow-lg">
          <CardContent className="p-8">
            <h2 className="font-serif text-2xl font-semibold text-[#3D3632]">Your contribution</h2>
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#F5F1EC] p-3">
              <div className="h-12 w-12 rounded-lg bg-[#E8E2DA] flex items-center justify-center flex-shrink-0">
                <Gift className="h-6 w-6 text-[#A39B92]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#3D3632]">Group gift contribution</p>
                <p className="text-xs text-[#6B6058]">Contribution #{id}</p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <Label className="text-[#3D3632]">Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={hasPaid}
                  onCheckedChange={setHasPaid}
                  className="data-[state=checked]:bg-[#C67C5A]"
                />
                <Label className="text-sm text-[#6B6058] cursor-pointer">I've sent payment</Label>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  asChild
                  className="flex-1 border-[#E8E2DA] text-[#3D3632] hover:bg-[#F5F1EC]"
                >
                  <Link to="/">Cancel</Link>
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!amount || updateContribution.isPending}
                  className="flex-1 bg-[#C67C5A] text-white hover:bg-[#B56A48]"
                >
                  {updateContribution.isPending ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center w-full text-sm text-[#B85450] hover:underline mt-2"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete contribution
                </button>
              ) : (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-[#6B6058]">Are you sure you want to delete this contribution?</p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 border-[#E8E2DA]"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleteContribution.isPending}
                      className="flex-1"
                    >
                      {deleteContribution.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
