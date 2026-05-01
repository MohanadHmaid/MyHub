import { useLocation, Link } from "wouter";
import { useGetMyReservations } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import CustomerLayout from "@/components/layout/customer-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Clock, Users, QrCode, LogOut, UserCircle } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-200",
  confirmed: "bg-green-500/10 text-green-600 border-green-200",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function MyReservationsPage() {
  const { customer, isCustomerLoading, customerLogout } = useAuth();
  const [, setLocation] = useLocation();

  const { data: reservations, isLoading } = useGetMyReservations({
    query: { enabled: !!customer },
  });

  if (isCustomerLoading) {
    return (
      <CustomerLayout>
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <Skeleton className="h-64 w-full max-w-lg rounded-2xl" />
        </div>
      </CustomerLayout>
    );
  }

  if (!customer) {
    return (
      <CustomerLayout>
        <div className="container mx-auto px-4 py-24 flex flex-col items-center text-center gap-6">
          <div className="bg-primary/10 p-5 rounded-2xl">
            <UserCircle className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Sign in to view your reservations</h1>
          <p className="text-muted-foreground max-w-sm">Create a free account or sign in to keep track of all your bookings.</p>
          <div className="flex gap-3 flex-wrap justify-center">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="h-12 px-8">Register</Button>
            </Link>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">My Reservations</h1>
            <p className="text-muted-foreground text-sm mt-1">Logged in as <span className="font-medium text-foreground">{customer.name}</span></p>
          </div>
          <div className="flex gap-2">
            <Link href="/reservation">
              <Button variant="outline" className="gap-2">
                <CalendarCheck className="w-4 h-4" /> New Reservation
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={customerLogout} title="Sign out">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
          </div>
        ) : reservations?.length === 0 ? (
          <div className="py-20 text-center border border-dashed rounded-2xl space-y-4">
            <CalendarCheck className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No reservations yet.</p>
            <Link href="/reservation">
              <Button className="mt-2">Book a Table</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reservations?.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-lg">{format(new Date(r.dateTime), "EEEE, MMM d, yyyy")}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{format(new Date(r.dateTime), "h:mm a")}</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{r.partySize} {r.partySize === 1 ? "person" : "people"}</span>
                    </div>
                  </div>
                  <Badge className={`capitalize border text-xs font-semibold ${statusColors[r.status] ?? ""}`} variant="outline">
                    {r.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <QrCode className="w-3.5 h-3.5" />
                    <span className="tracking-widest font-semibold text-foreground">{r.code}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Use this code to check in at your table</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
