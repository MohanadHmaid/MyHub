import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, UtensilsCrossed, Calendar, Receipt, LogOut, Monitor, CreditCard } from "lucide-react";


import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { isAdmin, isAdminLoading, logout } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isAdminLoading) return;
    // Only redirect if we are sure the user is not an admin
    // We add a small delay or check if the query is actually finished
    if (!isAdmin) {
      const timer = setTimeout(() => {
        if (!isAdmin) {
          setLocation("/login");
        }
      }, 500); // 500ms grace period for state sync
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isAdmin, isAdminLoading, setLocation]);

  if (isAdminLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">جاري التحميل...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  const navItems = [
    { label: "لوحة التحكم", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "الطاولات", href: "/admin/tables", icon: Monitor },
    { label: "الطلبات", href: "/admin/orders", icon: Receipt },
    { label: "القائمة", href: "/admin/menu", icon: UtensilsCrossed },
    { label: "الحجوزات", href: "/admin/reservations", icon: Calendar },
    { label: "Pay for Table", href: "/admin/pay-table", icon: CreditCard },
  ];

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-16 md:w-64 border-r border-sidebar-border bg-sidebar flex flex-col shrink-0 transition-all duration-200">

        {/* Logo */}
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-sidebar-border">
          <Monitor className="w-6 h-6 text-sidebar-primary md:hidden" />
          <span className="hidden md:block text-xl font-bold text-sidebar-primary tracking-tight">
            MyHUB<span className="text-sidebar-foreground">المسؤول</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col items-center md:items-stretch px-2 md:px-4 py-6 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.startsWith(item.href);
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={`flex items-center justify-center md:justify-start gap-3 w-12 h-12 md:w-auto md:h-auto md:px-3 md:py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Icon className="w-6 h-6 shrink-0" />
                    <span className="hidden md:block">{item.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="md:hidden">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* تسجيل الخروج */}
        <div className="p-2 md:p-4 border-t border-sidebar-border flex justify-center md:justify-start">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={logout}
                className="flex items-center justify-center md:justify-start gap-3 w-12 h-12 md:w-full md:h-auto md:px-3 md:py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <LogOut className="w-6 h-6 shrink-0" />
                <span className="hidden md:block">تسجيل الخروج</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="md:hidden">
              تسجيل الخروج
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
    </TooltipProvider>
  );
}
