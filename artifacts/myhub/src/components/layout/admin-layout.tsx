import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, UtensilsCrossed, Calendar, Receipt, Monitor, LogOut } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { isAdmin, isAdminLoading, logout } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Only redirect if we are sure the user is not an admin
    // We add a small delay or check if the query is actually finished
    if (!isAdminLoading && !isAdmin) {
      const timer = setTimeout(() => {
        if (!isAdmin) {
          setLocation("/login");
        }
      }, 500); // 500ms grace period for state sync
      return () => clearTimeout(timer);
    }
  }, [isAdmin, isAdminLoading, setLocation]);

  if (isAdminLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  const navItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Tables", href: "/admin/tables", icon: Monitor },
    { label: "Orders", href: "/admin/orders", icon: Receipt },
    { label: "Menu", href: "/admin/menu", icon: UtensilsCrossed },
    { label: "Reservations", href: "/admin/reservations", icon: Calendar },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-16 md:w-64 border-r border-sidebar-border bg-sidebar flex flex-col shrink-0 transition-all duration-200">

        {/* Logo */}
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-sidebar-border">
          <Monitor className="w-6 h-6 text-sidebar-primary md:hidden" />
          <span className="hidden md:block text-xl font-bold text-sidebar-primary tracking-tight">
            MyHUB<span className="text-sidebar-foreground">Admin</span>
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

        {/* Logout */}
        <div className="p-2 md:p-4 border-t border-sidebar-border flex justify-center md:justify-start">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={logout}
                className="flex items-center justify-center md:justify-start gap-3 w-12 h-12 md:w-full md:h-auto md:px-3 md:py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <LogOut className="w-6 h-6 shrink-0" />
                <span className="hidden md:block">Logout</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="md:hidden">
              Logout
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
  );
}
