import { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Gift, UserPlus } from 'lucide-react'

const PENDING_INVITE_KEY = 'pending-invite'

export default function Invite() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()

  const inviteQuery = trpc.list.getInvite.useQuery(
    { token: token ?? '' },
    { enabled: !!token && !!user, retry: false },
  )

  const accept = trpc.list.acceptInvite.useMutation({
    onSuccess: (data) => {
      localStorage.removeItem(PENDING_INVITE_KEY)
      navigate(`/lists/${data.listId}`)
    },
  })

  // If the visitor isn't signed in, remember the invite so we can bring them
  // back here after they authenticate (see Dashboard's post-login redirect).
  useEffect(() => {
    if (!authLoading && !user && token) {
      localStorage.setItem(PENDING_INVITE_KEY, token)
    }
  }, [authLoading, user, token])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C67C5A] border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
        <Card className="w-full max-w-sm bg-white border-[#E8E2DA]">
          <CardContent className="p-8 text-center">
            <UserPlus className="mx-auto h-8 w-8 text-[#C67C5A]" />
            <h2 className="mt-4 font-serif text-xl font-semibold text-[#3D3632]">You've been invited</h2>
            <p className="mt-2 text-sm text-[#6B6058]">
              Sign in to accept this co-owner invitation.
            </p>
            <Button asChild className="mt-4 bg-[#C67C5A] text-white hover:bg-[#B56A48]">
              <Link to="/login">Sign in to continue</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (inviteQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C67C5A] border-t-transparent" />
      </div>
    )
  }

  if (inviteQuery.error || !inviteQuery.data) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
        <Card className="w-full max-w-sm bg-white border-[#E8E2DA]">
          <CardContent className="p-8 text-center">
            <h2 className="font-serif text-xl font-semibold text-[#3D3632]">Invitation unavailable</h2>
            <p className="mt-2 text-sm text-[#6B6058]">
              {inviteQuery.error?.message ?? 'This invitation is no longer valid.'}
            </p>
            <Button asChild className="mt-4 bg-[#C67C5A] text-white hover:bg-[#B56A48]">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const invite = inviteQuery.data

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
      <Card className="w-full max-w-sm bg-white border-[#E8E2DA]">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#C67C5A]/10">
            <Gift className="h-6 w-6 text-[#C67C5A]" />
          </div>
          <h2 className="mt-4 font-serif text-xl font-semibold text-[#3D3632]">
            Co-own “{invite.listTitle}”
          </h2>
          <p className="mt-2 text-sm text-[#6B6058]">
            {invite.invitedByName ? `${invite.invitedByName} invited you` : 'You were invited'} to
            help manage this gift list. You'll be able to add, edit, and organize its items.
          </p>
          {accept.error && (
            <p className="mt-3 text-sm text-[#B85450]">{accept.error.message}</p>
          )}
          <div className="mt-5 flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="flex-1 border-[#E8E2DA] text-[#3D3632] hover:bg-[#F5F1EC]"
            >
              Not now
            </Button>
            <Button
              onClick={() => token && accept.mutate({ token })}
              disabled={accept.isPending}
              className="flex-1 bg-[#C67C5A] text-white hover:bg-[#B56A48]"
            >
              {accept.isPending ? 'Accepting…' : 'Accept invite'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
