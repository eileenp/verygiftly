import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Gift, Heart, Bookmark, UserPlus, Copy, X, Check } from 'lucide-react'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const avatarColors = ['bg-[#C67C5A]', 'bg-[#8FA98F]', 'bg-[#D4A574]', 'bg-[#5A8F6E]', 'bg-[#B85450]']

export default function PeopleAccess() {
  const { id } = useParams<{ id: string }>()
  const listId = Number(id)
  const navigate = useNavigate()
  const { user } = useAuth({ redirectOnUnauthenticated: true })

  const { data: list, isLoading } = trpc.list.get.useQuery(
    { id: listId },
    { enabled: !!user && !!listId }
  )

  const utils = trpc.useUtils()
  const isOwner = !!list && !!user && list.ownerId === user.id

  const invitesQuery = trpc.list.listInvites.useQuery(
    { listId },
    { enabled: isOwner }
  )

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createInvite = trpc.list.inviteCoOwner.useMutation({
    onSuccess: (data) => {
      setInviteLink(`${window.location.origin}/invite/${data.token}`)
      setInviteEmail('')
      invitesQuery.refetch()
    },
  })

  const revokeInvite = trpc.list.revokeInvite.useMutation({
    onSuccess: () => invitesQuery.refetch(),
  })

  const removeCoOwner = trpc.list.removeCoOwner.useMutation({
    onSuccess: () => utils.list.get.invalidate({ id: listId }),
  })

  function copyInviteLink() {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  const accessRecords = list.accessRecords || []
  const hasPeople = accessRecords.length > 0

  // Aggregate activities per person
  const peopleMap = new Map<string, any>()
  for (const record of accessRecords) {
    if (!record.email) continue
    const key = record.email
    if (!peopleMap.has(key)) {
      peopleMap.set(key, {
        name: record.name || record.email,
        email: record.email,
        claimed: 0,
        contributed: 0,
        saved: record.saved,
      })
    }
  }

  // Count claims per person
  for (const item of list.items || []) {
    for (const claim of item.claims || []) {
      const person = peopleMap.get(claim.email)
      if (person) {
        person.claimed += 1
      }
    }
    for (const contrib of item.contributions || []) {
      const person = peopleMap.get(contrib.email)
      if (person) {
        person.contributed += parseFloat(contrib.amount || '0')
      }
    }
  }

  const people = Array.from(peopleMap.values())

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-8">
        <button
          onClick={() => navigate(`/lists/${listId}`)}
          className="flex items-center gap-1 text-sm text-[#6B6058] hover:text-[#3D3632] mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {list.title}
        </button>

        <h1 className="font-serif text-3xl font-semibold text-[#3D3632]">People with access</h1>
        <p className="mt-1 text-sm text-[#6B6058]">{people.length} {people.length === 1 ? 'person' : 'people'}</p>

        <div className="mt-4 rounded-lg bg-[#D4A574]/10 p-4 border border-[#D4A574]/20">
          <p className="text-sm text-[#6B6058]">
            <strong className="text-[#3D3632]">Privacy note:</strong> Only identifiable people are shown here (those who gave their name and email when claiming or contributing). Anyone with the link and password can still view the list anonymously. To fully block someone, change the list password.
          </p>
        </div>

        {isOwner && (
          <Card className="border-[#E8E2DA] bg-white mt-6">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-[#C67C5A]" />
                <h2 className="font-serif text-lg font-semibold text-[#3D3632]">Co-owners</h2>
              </div>
              <p className="mt-1 text-sm text-[#6B6058]">
                Co-owners can add, edit, and organize items on this list. Share an invite link — they'll accept it while signed in.
              </p>

              {/* Current co-owners */}
              {(list.coOwners?.length ?? 0) > 0 && (
                <div className="mt-4 space-y-2">
                  {list.coOwners.map((co: any) => (
                    <div key={co.id} className="flex items-center justify-between rounded-lg border border-[#E8E2DA] px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#3D3632] truncate">{co.user?.name || co.user?.email || 'Co-owner'}</p>
                        {co.user?.email && <p className="text-xs text-[#A39B92] truncate">{co.user.email}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCoOwner.mutate({ listId, userId: co.userId })}
                        disabled={removeCoOwner.isPending}
                        className="inline-flex items-center gap-1 text-xs text-[#A39B92] hover:text-[#B85450]"
                      >
                        <X className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Create an invite */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  placeholder="Restrict to an email (optional)"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="border-[#E8E2DA] focus-visible:ring-[#C67C5A]"
                />
                <Button
                  onClick={() => createInvite.mutate(inviteEmail.trim() ? { listId, email: inviteEmail.trim() } : { listId })}
                  disabled={createInvite.isPending}
                  className="bg-[#C67C5A] text-white hover:bg-[#B56A48] shrink-0"
                >
                  {createInvite.isPending ? 'Creating…' : 'Create invite link'}
                </Button>
              </div>
              {createInvite.error && (
                <p className="mt-2 text-sm text-[#B85450]">{createInvite.error.message}</p>
              )}
              {inviteLink && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#F5F1EC] px-3 py-2">
                  <p className="flex-1 truncate text-xs text-[#6B6058]">{inviteLink}</p>
                  <button
                    type="button"
                    onClick={copyInviteLink}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#C67C5A] hover:text-[#B56A48] shrink-0"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              {/* Pending invites */}
              {(invitesQuery.data?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#A39B92]">Pending invites</p>
                  <div className="mt-2 space-y-2">
                    {invitesQuery.data!.map((inv: any) => (
                      <div key={inv.id} className="flex items-center justify-between rounded-lg border border-[#E8E2DA] px-3 py-2">
                        <p className="text-sm text-[#6B6058] truncate">
                          {inv.email || 'Anyone with the link'}
                        </p>
                        <button
                          type="button"
                          onClick={() => revokeInvite.mutate({ inviteId: inv.id })}
                          disabled={revokeInvite.isPending}
                          className="inline-flex items-center gap-1 text-xs text-[#A39B92] hover:text-[#B85450]"
                        >
                          <X className="h-3.5 w-3.5" />
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!hasPeople && (
          <Card className="border-[#E8E2DA] bg-white mt-6">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <p className="text-[#6B6058]">No one has accessed this list yet.</p>
              <Button
                onClick={() => {
                  const url = `${window.location.origin}/lists/${list.id}/access`
                  // Never copy the stored password: it's a one-way hash. Share the
                  // link and tell people the password you chose separately.
                  const isHashed = list.password?.startsWith('pbkdf2:') ?? true
                  navigator.clipboard.writeText(
                    isHashed ? url : `${url}\nPassword: ${list.password}`
                  )
                }}
                className="mt-4 bg-[#C67C5A] text-white hover:bg-[#B56A48]"
              >
                Copy your list link
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 space-y-3">
          {people.map((person: any, i: number) => (
            <Card key={person.email} className="border-[#E8E2DA] bg-white">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${avatarColors[i % avatarColors.length]} text-white text-sm font-medium`}>
                  {getInitials(person.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#3D3632]">{person.name}</p>
                  <p className="text-sm text-[#A39B92] truncate">{person.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {person.claimed > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#C67C5A]/10 px-2.5 py-0.5 text-xs font-medium text-[#C67C5A]">
                      <Gift className="h-3 w-3" />
                      Claimed {person.claimed}
                    </span>
                  )}
                  {person.contributed > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#8FA98F]/10 px-2.5 py-0.5 text-xs font-medium text-[#5A8F6E]">
                      <Heart className="h-3 w-3" />
                      Contributed ${person.contributed.toFixed(2)}
                    </span>
                  )}
                  {person.saved && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#D4A574]/10 px-2.5 py-0.5 text-xs font-medium text-[#D4A574]">
                      <Bookmark className="h-3 w-3" />
                      Saved list
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
