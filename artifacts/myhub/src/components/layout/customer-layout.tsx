import { ReactNode } from "react";
import { Link } from "wouter";
import { Monitor, Facebook, Twitter, Instagram, Mail, Phone, MapPin } from "lucide-react";

interface CustomerLayoutProps {
  children: ReactNode;
  minimal?: boolean;
}

export default function CustomerLayout({ children, minimal = false }: CustomerLayoutProps) {
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
            <nav className="flex items-center gap-1">
              <Link href="/" className="text-sm font-medium px-3 py-2 rounded-md hover:bg-secondary hover:text-primary transition-colors">Home</Link>
              <Link href="/reservation" className="text-sm font-medium px-3 py-2 rounded-md hover:bg-secondary hover:text-primary transition-colors">Reserve a Table</Link>
              <a href="#contact" className="text-sm font-medium px-3 py-2 rounded-md hover:bg-secondary hover:text-primary transition-colors">Contact</a>
              <a href="#about" className="text-sm font-medium px-3 py-2 rounded-md hover:bg-secondary hover:text-primary transition-colors">About</a>
            </nav>
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
                Your neighbourhood internet café. Fast connections, comfortable seating, great drinks. Book online and skip the wait.
              </p>
            </div>

            <div id="contact">
              <h3 className="font-semibold text-background mb-4 uppercase tracking-wider text-xs">Contact</h3>
              <ul className="space-y-3 text-sm text-background/70">
                <li className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span>123 Cyber Street, Tech District</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <span>+1 (555) 123-4567</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <span>hello@myhub.café</span>
                </li>
              </ul>
            </div>

            <div id="about">
              <h3 className="font-semibold text-background mb-4 uppercase tracking-wider text-xs">Follow Us</h3>
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
                Open daily · 9:00 AM – 10:00 PM
              </p>
            </div>
          </div>
          <div className="border-t border-background/10 mt-10 pt-6 text-center text-background/40 text-xs">
            © {new Date().getFullYear()} MyHUB Internet Café. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
