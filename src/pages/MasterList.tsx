import { useState } from 'react'

import { trpc } from '@/providers/trpc'
import { isSafeUrl } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/Navbar'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Gift, Search, ExternalLink, ArrowLeft } from 'lucide-react'

export default function MasterList() {
  useAuth({ redirectOnUnauthenticated: true })
  const [search, setSearch] = useState('')

  const { data: items = [], isLoading } = trpc.list.masterItems.useQuery()

  const filtered = items.filter((item: any) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.sourceListName ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // Group by source list
  const grouped = filtered.reduce((acc: Record<string, any[]>, item: any) => {
    const key = item.sourceListName ?? 'No list'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1 text-sm text-[#6B6058] hover:text-[#3D3632] mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="mb-6">
          <h1 className="font-serif text-3xl font-semibold text-[#3D3632]">Master List</h1>
          <p className="mt-1 text-sm text-[#A39B92]">
            Every gift ever added across all your lists — never deleted, never shared.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A39B92]" />
          <Input
            placeholder="Search gifts or lists…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-[#E8E2DA] focus-visible:ring-[#C67C5A] bg-white"
          />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C67C5A] border-t-transparent" />
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <Card className="border-[#E8E2DA] bg-white">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#C67C5A]/10">
                <Gift className="h-8 w-8 text-[#C67C5A]" />
              </div>
              <h3 className="mt-4 font-serif text-xl font-semibold text-[#3D3632]">No items yet</h3>
              <p className="mt-2 text-sm text-[#6B6058]">
                Items will appear here as you add them to any list.
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && items.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-[#A39B92] py-12">No items match your search.</p>
        )}

        <div className="space-y-8">
          {Object.entries(grouped).map(([listName, groupItems]) => (
            <div key={listName}>
              <h2 className="text-xs font-semibold text-[#A39B92] uppercase tracking-wider mb-3">
                {listName}
              </h2>
              <div className="space-y-3">
                {(groupItems as any[]).map((item: any) => (
                  <Card key={item.id} className="border-[#E8E2DA] bg-white">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <div className="h-16 w-16 rounded-lg bg-[#F5F1EC] flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.imageUrl && isSafeUrl(item.imageUrl) ? (
                            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <Gift className="h-6 w-6 text-[#A39B92]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-[#3D3632] truncate">{item.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-sm text-[#6B6058]">
                              {item.price ? `$${item.price}` : 'No price'}
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
                            <p className="mt-1 text-xs text-[#A39B92] truncate">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
