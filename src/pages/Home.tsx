import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Navbar } from '@/components/Navbar'
import { ScatterBackground } from '@/components/ScatterBackground'
import { ListChecks, Share2, Gift, Eye, Users, ClipboardCheck } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/hooks/useAuth'

export default function Home() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  const steps = [
    {
      icon: <ClipboardCheck className="h-6 w-6" />,
      title: 'Create a list',
      description: 'Add items from any shop with a simple paste of the link.',
    },
    {
      icon: <Share2 className="h-6 w-6" />,
      title: 'Share the link',
      description: 'Send the private link and password to family and friends.',
    },
    {
      icon: <Gift className="h-6 w-6" />,
      title: 'They claim items',
      description: 'Everyone picks what they want to buy — no duplicates.',
    },
  ]

  const features = [
    {
      icon: <Eye className="h-8 w-8" />,
      title: 'No account needed',
      description: 'Gift-givers can browse and claim without creating an account. Just a name and email.',
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: 'Group gifts',
      description: 'Set a target price and let multiple people chip in. Track progress with a visual bar.',
    },
    {
      icon: <ListChecks className="h-8 w-8" />,
      title: 'See who claimed what',
      description: 'As the list owner, you see full names and emails. Others only see what is taken.',
    },
  ]

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Navbar />

      {/* Hero Section */}
      <ScatterBackground
        as="section"
        density="medium"
        surface="transparent"
        className="relative overflow-hidden px-6 py-20 md:py-28"
        style={{ backgroundColor: '#FDFBF7' }}
      >
        <div className="mx-auto max-w-5xl text-center relative z-10">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-[#3D3632] md:text-6xl">
            Make gifting effortless
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#6B6058] md:text-xl">
            Create beautiful wishlists, share them privately, and let everyone claim exactly what they want — no duplicates, no stress.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              onClick={() => navigate('/login')}
              className="bg-[#C67C5A] px-8 text-white hover:bg-[#B56A48]"
            >
              Get Started — It's Free
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-[#E8E2DA] text-[#3D3632] hover:bg-[#F5F1EC]"
            >
              See how it works
            </Button>
          </div>
        </div>
        <div className="mx-auto mt-16 max-w-4xl overflow-hidden rounded-2xl shadow-lg">
          <img
            src="/hero-gifts.jpg"
            alt="Beautifully wrapped gifts on warm linen"
            className="h-auto w-full object-cover"
          />
        </div>
      </ScatterBackground>

      {/* How It Works */}
      <section id="how-it-works" className="bg-[#F5F1EC] px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-serif text-3xl font-semibold text-[#3D3632]">
            How it works
          </h2>
          <div className="mt-16 grid gap-10 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={i} className="flex flex-col">
                <span className="font-serif text-8xl font-bold leading-none text-[#C67C5A]/15 select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#C67C5A]/10 text-[#C67C5A]">
                  {step.icon}
                </div>
                <h3 className="mt-4 font-serif text-xl font-semibold text-[#3D3632]">
                  {step.title}
                </h3>
                <p className="mt-2 text-[#6B6058]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-serif text-3xl font-semibold text-[#3D3632]">
            Everything you need
          </h2>
          <div className="mt-10 divide-y divide-[#E8E2DA]">
            {features.map((feat, i) => (
              <div key={i} className="flex items-start gap-6 py-8 md:items-center">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#8FA98F]/10 text-[#8FA98F]">
                  {feat.icon}
                </div>
                <div className="flex flex-1 flex-col md:flex-row md:items-center md:gap-10">
                  <h3 className="min-w-[200px] font-serif text-lg font-semibold text-[#3D3632]">
                    {feat.title}
                  </h3>
                  <p className="mt-1 text-[#6B6058] md:mt-0">{feat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <ScatterBackground
        as="section"
        density="sparse"
        surface="transparent"
        className="px-6 py-20"
        style={{ backgroundColor: '#F5F1EC' }}
      >
        <div className="mx-auto max-w-2xl text-center relative z-10">
          <h2 className="font-serif text-3xl font-semibold text-[#3D3632]">
            Ready to make your wishlist?
          </h2>
          <p className="mt-4 text-[#6B6058]">
            It takes less than a minute to create your first list and start sharing.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/login')}
            className="mt-8 bg-[#C67C5A] px-8 text-white hover:bg-[#B56A48]"
          >
            Create your first list
          </Button>
        </div>
      </ScatterBackground>

      {/* Footer */}
      <footer className="bg-[#2D2A26] px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex items-center">
              <Logo className="h-8" />
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-[#A39B92]">
              <Link to="/privacy" className="hover:text-[#FDFBF7]">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-[#FDFBF7]">Terms of Service</Link>
              <Link to="/accessibility" className="hover:text-[#FDFBF7]">Accessibility</Link>
              <Link to="/cookies" className="hover:text-[#FDFBF7]">Cookies</Link>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-[#6B6058]">
            VeryGiftly. Built for thoughtful gifting.
          </p>
        </div>
      </footer>
    </div>
  )
}
