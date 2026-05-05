import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router'
import { trpc } from '@/providers/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, ArrowRight } from 'lucide-react'

export default function ListAccess() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const listId = Number(id)
  const navigate = useNavigate()
  const [password, setPassword] = useState(searchParams.get('p') ?? '')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)

  const verify = trpc.viewer.verifyPasswordMutation.useMutation({
    onSuccess: () => {
      sessionStorage.setItem(`list-password-${listId}`, password)
      navigate(`/lists/${listId}/view`)
    },
    onError: () => {
      setError('Incorrect password. Please try again.')
      setAttempts((a) => a + 1)
    },
  })

  // Auto-submit when password arrives via ?p= magic link
  useEffect(() => {
    const p = searchParams.get('p')
    if (p && listId) {
      verify.mutate({ id: listId, password: p })
    }
  }, [listId])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return
    verify.mutate({ id: listId, password: password.trim() })
  }

  if (attempts >= 5) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
        <Card className="w-full max-w-sm bg-white border-[#E8E2DA]">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#B85450]/10">
              <Lock className="h-6 w-6 text-[#B85450]" />
            </div>
            <h2 className="mt-4 font-serif text-xl font-semibold text-[#3D3632]">Too many attempts</h2>
            <p className="mt-2 text-sm text-[#6B6058]">
              Please wait a few minutes before trying again, or ask the person who shared this link for the correct password.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="font-serif text-2xl font-semibold text-[#3D3632]">Gifsto</span>
        </div>
        <Card className="bg-white border-[#E8E2DA] shadow-lg">
          <CardContent className="p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#C67C5A]/10">
              <Lock className="h-6 w-6 text-[#C67C5A]" />
            </div>
            <p className="mt-4 text-center text-xs text-[#A39B92] uppercase tracking-wider">
              You've been invited to view
            </p>
            <h2 className="mt-1 text-center font-serif text-2xl font-semibold text-[#3D3632]">
              Gift list
            </h2>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  className={`border-[#E8E2DA] focus-visible:ring-[#C67C5A] ${error ? 'border-[#B85450]' : ''}`}
                />
                {error && (
                  <p className="mt-1 text-xs text-[#B85450]">{error}</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={verify.isPending || !password.trim()}
                className="w-full bg-[#C67C5A] text-white hover:bg-[#B56A48]"
              >
                {verify.isPending ? 'Verifying...' : (
                  <>
                    View list
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-[#A39B92]">
              Don't have the password? Ask the person who shared this link.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
