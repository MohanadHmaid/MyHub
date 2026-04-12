import { 
  useGetReservations, getGetReservationsQueryKey, 
  useUpdateReservationStatus 
} from "@workspace/api-client-react";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar, Phone, Users, Clock, Hash, Check, X } from "lucide-react";
import { format } from "date-fns";

export default function AdminReservations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reservations, isLoading } = useGetReservations({
    query: { queryKey: getGetReservationsQueryKey() }
  });

  const updateStatus = useUpdateReservationStatus({
    mutation: {
      onSuccess: () => {
        toast({ title: "Reservation updated" });
        queryClient.invalidateQueries({ queryKey: getGetReservationsQueryKey() });
      }
    }
  });

  const handleStatusChange = (id: number, status: string) => {
    updateStatus.mutate({ id, data: { status: status as any } });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge variant="outline" className="border-green-500 text-green-500 bg-green-500/10">Confirmed</Badge>;
      case 'cancelled': return <Badge variant="outline" className="border-destructive text-destructive bg-destructive/10">Cancelled</Badge>;
      default: return <Badge variant="outline" className="border-amber-500 text-amber-500 bg-amber-500/10">Pending</Badge>;
    }
  };

  // Sort by datetime, pending first
  const sortedReservations = reservations ? [...reservations].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
  }) : [];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Calendar className="w-8 h-8 text-primary" />
          Reservations
        </h1>
        <p className="text-muted-foreground mt-1">Manage table bookings and guest requests.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)
        ) : sortedReservations.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground border border-dashed rounded-xl">
            No reservations found.
          </div>
        ) : (
          sortedReservations.map((res) => (
            <Card key={res.id} className={`flex flex-col border-2 transition-all ${
              res.status === 'pending' ? 'border-amber-500/30 bg-amber-500/5' : 
              res.status === 'cancelled' ? 'border-border/50 opacity-60' : 'border-border'
            }`}>
              <CardHeader className="pb-4 border-b border-border/50">
                <div className="flex justify-between items-start mb-2">
                  <CardTitle className="text-xl">{res.name}</CardTitle>
                  {getStatusBadge(res.status)}
                </div>
                <div className="flex items-center text-sm font-mono bg-secondary px-2 py-1 rounded w-fit">
                  <Hash className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                  {res.code}
                </div>
              </CardHeader>
              <CardContent className="py-4 space-y-3 flex-1">
                <div className="flex items-center text-sm">
                  <Calendar className="w-4 h-4 mr-3 text-primary" />
                  <span className="font-medium">{format(new Date(res.dateTime), 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="w-4 h-4 mr-3 text-primary" />
                  <span className="font-medium text-lg">{format(new Date(res.dateTime), 'h:mm a')}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Users className="w-4 h-4 mr-3 text-primary" />
                  <span>Party of <strong className="text-base">{res.partySize}</strong></span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-4 pt-4 border-t border-border/50">
                  <Phone className="w-4 h-4 mr-3" />
                  {res.phone}
                </div>
              </CardContent>
              {res.status === 'pending' && (
                <CardFooter className="pt-0 gap-3 pb-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleStatusChange(res.id, 'cancelled')}
                    disabled={updateStatus.isPending}
                  >
                    <X className="w-4 h-4 mr-2" /> Decline
                  </Button>
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleStatusChange(res.id, 'confirmed')}
                    disabled={updateStatus.isPending}
                  >
                    <Check className="w-4 h-4 mr-2" /> Confirm
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
