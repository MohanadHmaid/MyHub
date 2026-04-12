import { useLocation } from "wouter";
import CustomerLayout from "@/components/layout/customer-layout";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, ArrowRight, Calendar, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGetReservationByCode, getGetReservationByCodeQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReservationSuccess() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Extract code from URL
  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get('code');

  if (!code) {
    setLocation("/reservation");
    return null;
  }

  const { data: reservation, isLoading } = useGetReservationByCode(code, {
    query: {
      enabled: !!code,
      queryKey: getGetReservationByCodeQueryKey(code),
    }
  });

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code copied",
      description: "Reservation code copied to clipboard",
    });
  };

  return (
    <CustomerLayout>
      <div className="container mx-auto px-4 py-16 flex justify-center items-center">
        <Card className="w-full max-w-md text-center border-none shadow-2xl bg-card overflow-hidden">
          <div className="bg-primary/10 py-12 flex flex-col items-center justify-center border-b border-border/50">
            <div className="bg-primary/20 p-4 rounded-full mb-6">
              <CheckCircle2 className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Reservation Confirmed</h1>
            <p className="text-muted-foreground px-8">We've saved your spot. Show this code to the staff when you arrive.</p>
          </div>
          
          <CardContent className="pt-10 pb-8 px-8">
            <p className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-widest">Your Reservation Code</p>
            <div className="flex items-center justify-center gap-3 bg-secondary/50 py-6 px-4 rounded-xl border border-border group relative mb-8">
              <span className="text-5xl font-mono font-bold tracking-widest text-primary">{code}</span>
              <Button 
                size="icon" 
                variant="ghost" 
                className="absolute right-4 text-muted-foreground hover:text-primary transition-opacity opacity-50 group-hover:opacity-100"
                onClick={copyCode}
              >
                <Copy className="w-5 h-5" />
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-3 text-left">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-40" />
              </div>
            ) : reservation ? (
              <div className="text-left space-y-3 bg-secondary/20 p-4 rounded-lg border border-border/50">
                <div className="flex items-center text-sm">
                  <Calendar className="w-4 h-4 mr-3 text-primary" />
                  <span className="font-medium">{format(new Date(reservation.dateTime), 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="w-4 h-4 mr-3 text-primary" />
                  <span className="font-medium">{format(new Date(reservation.dateTime), 'h:mm a')}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Users className="w-4 h-4 mr-3 text-primary" />
                  <span className="font-medium">Party of {reservation.partySize}</span>
                </div>
              </div>
            ) : null}
          </CardContent>
          
          <CardFooter className="bg-secondary/20 p-6 flex flex-col gap-3 border-t border-border/50">
            <Button className="w-full h-12" onClick={() => setLocation("/")}>
              Return to Home <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </CustomerLayout>
  );
}
