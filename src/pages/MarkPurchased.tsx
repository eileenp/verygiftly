import { useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Gift, Check, AlertTriangle } from 'lucide-react'
import { Logo } from '@/components/Logo'

export default function MarkPurchased() {
  const { claimId } = useParams<{ claimId: string }>()
  const [searchParams] = useSearchParams()
  const id = Number(claimId)
  const token = searchParams.get('token') ?? ''
  const [success, setSuccess] = useState(false)

  const markPurchased = trpc.viewer.markPurchased.useMutation({
    onSuccess: () => setSuccess(true),
  })

  function handleMarkPurchased() {
    markPurchased.mutate({ claimId: id, token })
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

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Logo className="h-14" />
        </div>
        <Card className="bg-white border-[#E8E2DA] shadow-lg">
          <CardContent className="p-8">
            {!success ? (
              <>
                <h2 className="font-serif text-2xl font-semibold text-[#3D3632] text-center">
                  Mark as purchased?
                </h2>
                <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#F5F1EC] p-3">
                  <div className="h-12 w-12 rounded-lg bg-[#E8E2DA] flex items-center justify-center flex-shrink-0">
                    <Gift className="h-6 w-6 text-[#A39B92]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#3D3632]">Gift item</p>
                    <p className="text-xs text-[#6B6058]">Claim #{id}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-[#6B6058] text-center">
                  Confirm that you've purchased this gift. The list owner will be notified.
                </p>
                <div className="mt-6 flex gap-3">
                  <Button
                    variant="outline"
                    asChild
                    className="flex-1 border-[#E8E2DA] text-[#3D3632] hover:bg-[#F5F1EC]"
                  >
                    <Link to="/">Not yet</Link>
                  </Button>
                  <Button
                    onClick={handleMarkPurchased}
                    disabled={markPurchased.isPending}
                    className="flex-1 bg-[#5A8F6E] text-white hover:bg-[#4A7F5E]"
                  >
                    {markPurchased.isPending ? 'Processing...' : 'Yes, purchased'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#5A8F6E]/10">
                  <Check className="h-6 w-6 text-[#5A8F6E]" />
                </div>
                <h2 className="mt-4 font-serif text-xl font-semibold text-[#3D3632]">Thank you!</h2>
                <p className="mt-2 text-sm text-[#6B6058]">
                  The list owner has been notified that you purchased this gift.
                </p>
                <Button asChild className="mt-6 bg-[#C67C5A] text-white hover:bg-[#B56A48]">
                  <Link to="/">Go to homepage</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
