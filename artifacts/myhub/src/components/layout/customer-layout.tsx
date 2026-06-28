import { ReactNode, useState } from "react";
import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin, UserCircle, LogOut, CalendarCheck, Monitor, Menu } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface CustomerLayoutProps {
  children: ReactNode;
  minimal?: boolean;
}

export default function CustomerLayout({ children, minimal = false }: CustomerLayoutProps) {
  const { customer, isLoggedIn, customerLogout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <span className="text-2xl font-bold text-primary tracking-tight">MyHUB</span>
          </Link>
          {!minimal && (
            <>
              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-1">
                <Link href="/" className="text-sm font-medium px-3 py-2 rounded-md hover:bg-secondary hover:text-primary transition-colors whitespace-nowrap">الرئيسية</Link>
                <Link href="/reservation" className="text-sm font-medium px-3 py-2 rounded-md hover:bg-secondary hover:text-primary transition-colors whitespace-nowrap">احجز طاولة</Link>
                <a href="#contact" className="text-sm font-medium px-3 py-2 rounded-md hover:bg-secondary hover:text-primary transition-colors whitespace-nowrap">اتصل بنا</a>
                {isLoggedIn ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="ml-2 gap-2 h-9">
                        <UserCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">{customer?.name?.split(" ")[0]}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">{customer?.email}</div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/my-reservations" className="flex items-center gap-2 cursor-pointer">
                          <CalendarCheck className="w-4 h-4" /> حجوزاتي
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={customerLogout} className="text-destructive gap-2 cursor-pointer">
                        <LogOut className="w-4 h-4" /> تسجيل الخروج
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link href="/login">
                    <Button size="sm" className="ml-2 h-9 gap-2 whitespace-nowrap">
                      <UserCircle className="w-4 h-4" />
                      <span className="hidden xs:inline">تسجيل الدخول</span>
                      <span className="xs:hidden">تسجيل الدخول</span>
                    </Button>
                  </Link>
                )}
              </nav>

              {/* Mobile Navigation */}
              <div className="md:hidden flex items-center gap-2">
                {/* Login Button - Always Visible on Mobile */}
                {isLoggedIn ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 h-9">
                        <UserCircle className="w-4 h-4" />
                        <span className="hidden xs:inline">{customer?.name?.split(" ")[0]}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">{customer?.email}</div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/my-reservations" className="flex items-center gap-2 cursor-pointer">
                          <CalendarCheck className="w-4 h-4" /> حجوزاتي
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={customerLogout} className="text-destructive gap-2 cursor-pointer">
                        <LogOut className="w-4 h-4" /> تسجيل الخروج
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link href="/login">
                    <Button size="sm" className="h-9 gap-2">
                      <UserCircle className="w-4 h-4" />
                      <span className="hidden xs:inline">تسجيل الدخول</span>
                      <span className="xs:hidden">دخول</span>
                    </Button>
                  </Link>
                )}

                {/* Hamburger Menu */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-64">
                    <nav className="flex flex-col gap-4 mt-8">
                      <Link href="/" className="text-base font-medium px-3 py-2 rounded-md hover:bg-secondary hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>الرئيسية</Link>
                      <Link href="/reservation" className="text-base font-medium px-3 py-2 rounded-md hover:bg-secondary hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>احجز طاولة</Link>
                      <a href="#contact" className="text-base font-medium px-3 py-2 rounded-md hover:bg-secondary hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>اتصل بنا</a>
                    </nav>
                  </SheetContent>
                </Sheet>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border bg-foreground text-background mt-auto">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary/20 p-1.5 rounded-lg">
                  <Monitor className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xl font-bold text-primary">MyHUB</span>
              </div>
              <p className="text-background/60 text-sm leading-relaxed">
                افضل كافي متوفر. اتصالات سريعة، مقاعد مريحة، كهرباء متوفرة. احجز عبر الإنترنت وتجاوز الانتظار.
              </p>
            </div>

            <div id="contact">
              <h3 className="font-semibold text-background mb-4 uppercase tracking-wider text-xs">اتصل بنا</h3>
              <ul className="space-y-3 text-sm text-background/70">
                <li className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span>شارع النص 123، خانيونس</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <span>+966 55 123-4567</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <span>hello@myhub.cafe</span>
                </li>
              </ul>
            </div>

            <div id="about">
              <h3 className="font-semibold text-background mb-4 uppercase tracking-wider text-xs">تابعنا</h3>
              <div className="flex gap-3">
                <a href="#" aria-label="Facebook" className="bg-background/10 hover:bg-primary/20 p-2.5 rounded-lg transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
                <a href="#" aria-label="Twitter" className="bg-background/10 hover:bg-primary/20 p-2.5 rounded-lg transition-colors">
                  <Twitter className="w-4 h-4" />
                </a>
                <a href="#" aria-label="Instagram" className="bg-background/10 hover:bg-primary/20 p-2.5 rounded-lg transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
              </div>
              <p className="text-background/50 text-xs mt-6">
                مفتوح يومياً · 9:00 صباحاً – 08:00 مساءً
              </p>
            </div>
          </div>
          <div className="border-t border-background/10 mt-10 pt-6 text-center text-background/40 text-xs">
© {new Date().getFullYear()} MyHUB جميع الحقوق محفوظة
          </div>
        </div>
      </footer>
    </div>
  );
}
