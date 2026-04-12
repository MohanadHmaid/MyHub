import { useGetTables } from "@workspace/api-client-react";
import CustomerLayout from "@/components/layout/customer-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Monitor, Users, Wifi, Clock, QrCode, CalendarCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: tables, isLoading } = useGetTables();

  return (
    <CustomerLayout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/5 via-background to-accent/5 border-b border-border">
        <div className="container mx-auto px-4 py-24 flex flex-col items-center text-center gap-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full border border-primary/20">
            <Wifi className="w-3.5 h-3.5" />
            High-speed internet · Comfortable seating · Great drinks
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground max-w-2xl leading-tight">
            Your Ultimate<br />
            <span className="text-primary">Internet Café</span> Experience
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            Book your table instantly, order via QR, and enjoy a seamless café experience. No waiting, no hassle — just fast Wi-Fi and great vibes.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            <Link href="/reservation">
              <Button size="lg" className="h-12 px-8 text-base font-semibold shadow-md">
                <CalendarCheck className="w-4 h-4 mr-2" />
                Reserve a Table
              </Button>
            </Link>
            <a href="#tables">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold">
                View Tables
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <CalendarCheck className="w-6 h-6 text-primary" />,
              title: "Instant Booking",
              desc: "Reserve your table online in seconds. Pick your date, time, and party size.",
            },
            {
              icon: <QrCode className="w-6 h-6 text-primary" />,
              title: "QR Code Ordering",
              desc: "Scan the QR code at your table to browse the menu and order without leaving your seat.",
            },
            {
              icon: <Clock className="w-6 h-6 text-primary" />,
              title: "Open Daily",
              desc: "We're open every day from 9 AM to 10 PM. Walk in or book ahead for guaranteed seating.",
            },
          ].map((f) => (
            <div key={f.title} className="flex flex-col gap-3 p-6 rounded-2xl border border-border bg-card hover:shadow-md transition-shadow">
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="font-bold text-lg">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Table Grid Section */}
      <section id="tables" className="container mx-auto px-4 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-1">Live Table Status</h2>
            <p className="text-muted-foreground">Click an available table to view the menu and place your order.</p>
          </div>
          <Link href="/reservation">
            <Button variant="outline" className="shrink-0">
              <CalendarCheck className="w-4 h-4 mr-2" />
              Make a Reservation
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[160px] w-full rounded-2xl" />
            ))
          ) : tables?.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <p className="text-muted-foreground">No tables available at the moment.</p>
            </div>
          ) : (
            tables?.map((table) => (
              <Link key={table.id} href={`/table/${table.id}`} className={table.status === 'occupied' ? 'pointer-events-none' : ''}>
                <Card className={`h-full transition-all duration-200 rounded-2xl border-2 ${
                  table.status === 'available'
                    ? 'hover:border-primary hover:shadow-lg cursor-pointer border-border bg-card'
                    : 'opacity-60 border-destructive/20 bg-destructive/5 cursor-not-allowed'
                }`}>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-lg font-bold">{table.name}</CardTitle>
                    <div className={`w-3 h-3 rounded-full ${table.status === 'available' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1 mb-4">
                      <Monitor className={`w-4 h-4 ${table.status === 'available' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span>PC Terminal</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-muted-foreground text-xs">
                        <Users className="w-3.5 h-3.5 mr-1" />
                        <span>Up to {table.capacity}</span>
                      </div>
                      <Badge
                        className={
                          table.status === 'available'
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200'
                        }
                        variant="outline"
                      >
                        {table.status === 'available' ? 'Available' : 'Occupied'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>
    </CustomerLayout>
  );
}
