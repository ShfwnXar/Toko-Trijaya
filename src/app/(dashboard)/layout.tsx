"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  FileText,
  Warehouse,
  Truck,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: string[]
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} />, roles: ["ADMIN"] },
  { label: "Kasir", href: "/kasir", icon: <ShoppingCart size={20} />, roles: ["ADMIN", "KASIR"] },
  { label: "Produk", href: "/produk", icon: <Package size={20} />, roles: ["ADMIN"] },
  { label: "Transaksi", href: "/transaksi", icon: <Receipt size={20} />, roles: ["ADMIN", "KASIR"] },
  { label: "Laporan", href: "/laporan", icon: <FileText size={20} />, roles: ["ADMIN"] },
  { label: "Stok", href: "/stok", icon: <Warehouse size={20} />, roles: ["ADMIN", "GUDANG"] },
  { label: "Supplier", href: "/supplier", icon: <Truck size={20} />, roles: ["ADMIN", "GUDANG"] },
]

function getRoleBadgeColor(role: string) {
  switch (role) {
    case "ADMIN": return "bg-red-100 text-red-800"
    case "KASIR": return "bg-blue-100 text-blue-800"
    case "GUDANG": return "bg-green-100 text-green-800"
    default: return "bg-gray-100 text-gray-800"
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Memuat...</p>
      </div>
    )
  }

  if (!session) {
    router.push("/login")
    return null
  }

  const userRole = (session.user as any)?.role || "KASIR"
  const userName = session.user?.name || "User"

  const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole))

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 border-r bg-card fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="p-3 border-b flex items-center gap-2">
          <img src="/logo.png" alt="Logo" width={36} height={36} className="rounded" />
          <div>
            <p className="text-sm font-bold text-primary leading-tight">Toko Tri Jaya</p>
            <p className="text-[10px] text-muted-foreground">Point of Sale</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User Info + Logout */}
        <div className="p-4 border-t space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <Badge variant="secondary" className={`text-xs ${getRoleBadgeColor(userRole)}`}>
                {userRole}
              </Badge>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-card border-b px-4 py-2 flex items-center justify-between">
        <img src="/logo.png" alt="Toko Grosir Tri Jaya" width={40} height={40} />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="min-w-[44px] min-h-[44px]"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute top-0 right-0 bottom-0 w-64 bg-card shadow-xl flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{userName}</p>
                <Badge variant="secondary" className={`text-xs ${getRoleBadgeColor(userRole)}`}>
                  {userRole}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(false)}
                className="min-w-[44px] min-h-[44px]"
              >
                <X size={20} />
              </Button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {filteredNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 min-h-[44px]"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Keluar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-60 mt-14 md:mt-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
