import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useCreateReservation } from "@workspace/api-client-react";
import CustomerLayout from "@/components/layout/customer-layout";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Clock, Users, User, Phone } from "lucide-react";

const reservationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Valid phone number required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  partySize: z.coerce.number().min(1).max(10),
});

type ReservationFormValues = z.infer<typeof reservationSchema>;

export default function Reservation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      name: "",
      phone: "",
      date: new Date().toISOString().split('T')[0],
      time: "12:00",
      partySize: 1,
    },
  });

  const createReservation = useCreateReservation({
    mutation: {
      onSuccess: (data) => {
        setLocation(`/success?code=${data.code}`);
      },
      onError: (error: any) => {
        toast({
          title: "Failed to create reservation",
          description: error.message || "Please try again later",
          variant: "destructive",
        });
      }
    }
  });

  const onSubmit = (data: ReservationFormValues) => {
    // Combine date and time into dateTime ISO string
    const dateTimeStr = `${data.date}T${data.time}:00.000Z`;
    
    createReservation.mutate({
      data: {
        name: data.name,
        phone: data.phone,
        dateTime: dateTimeStr,
        partySize: data.partySize,
      }
    });
  };

  return (
    <CustomerLayout>
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-lg border-2 border-primary/20 shadow-lg">
          <CardHeader className="text-center pb-8 border-b border-border/50 bg-secondary/20">
            <CardTitle className="text-3xl font-bold text-primary">Book a Table</CardTitle>
            <CardDescription className="text-base mt-2">
              Reserve a spot at MyHUB Internet Café
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="John Doe" className="pl-9" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="(555) 123-4567" type="tel" className="pl-9" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input type="date" className="pl-9" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input type="time" className="pl-9" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="partySize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Party Size</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input type="number" min={1} max={10} className="pl-9" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg mt-8"
                  disabled={createReservation.isPending}
                >
                  {createReservation.isPending ? "Processing..." : "Confirm Reservation"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}
