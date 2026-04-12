import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";

// Public Pages
import Home from "@/pages/home";
import TableOrder from "@/pages/table-order";
import Reservation from "@/pages/reservation";
import ReservationSuccess from "@/pages/reservation-success";
import NotFound from "@/pages/not-found";

// Admin Pages
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminTables from "@/pages/admin/tables";
import AdminOrders from "@/pages/admin/orders";
import AdminReservations from "@/pages/admin/reservations";
import AdminMenu from "@/pages/admin/menu";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/table/:id" component={TableOrder} />
      <Route path="/reservation" component={Reservation} />
      <Route path="/success" component={ReservationSuccess} />
      
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/tables" component={AdminTables} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/reservations" component={AdminReservations} />
      <Route path="/admin/menu" component={AdminMenu} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
