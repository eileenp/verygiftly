import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, Settings, User, LayoutDashboard } from 'lucide-react'
import { Logo } from '@/components/Logo'

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[#E8E2DA]/50 bg-[#FDFBF7]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="h-9" />
        </Link>

        <div className="flex items-center gap-4">
          {isAuthenticated && user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="text-[#3D3632] hover:bg-[#F5F1EC] hidden sm:flex"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar || undefined} alt={user.name || ''} />
                      <AvatarFallback className="bg-[#C67C5A] text-white text-sm">
                        {(user.name || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white border-[#E8E2DA]">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-[#3D3632]">{user.name || 'User'}</p>
                    <p className="text-xs text-[#A39B92] truncate">{user.email || ''}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-[#E8E2DA]" />
                  <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer text-[#3D3632] hover:bg-[#F5F1EC]">
                    <Settings className="mr-2 h-4 w-4" />
                    Account settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/privacy')} className="cursor-pointer text-[#3D3632] hover:bg-[#F5F1EC]">
                    <User className="mr-2 h-4 w-4" />
                    Privacy settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#E8E2DA]" />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-[#B85450] hover:bg-[#F5F1EC]">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
                className="text-[#3D3632] hover:bg-[#F5F1EC]"
              >
                Sign in
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/login')}
                className="bg-[#C67C5A] text-white hover:bg-[#B56A48]"
              >
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
