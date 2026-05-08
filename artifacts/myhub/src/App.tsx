import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import AuthCallbackPage from "@/pages/auth-callback";
import ReservationPage from "@/pages/reservation";
import ReservationSuccessPage from "@/pages/reservation-success";
import MyReservationsPage from "@/pages/my-reservations";
import TableOrderPage from "@/pages/table-order";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminTables from "@/pages/admin/tables";
import AdminOrders from "@/pages/admin/orders";
import AdminMenu from "@/pages/admin/menu";
import AdminReservations from "@/pages/admin/reservations";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/auth/callback" component={AuthCallbackPage} />
      <Route path="/reservation" component={ReservationPage} />
      <Route path="/reservation-success/:id" component={ReservationSuccessPage} />
      <Route path="/my-reservations" component={MyReservationsPage} />
      <Route path="/table/:id" component={TableOrderPage} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/tables" component={AdminTables} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/menu" component={AdminMenu} />
      <Route path="/admin/reservations" component={AdminReservations} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
