import { createContext, useContext, ReactNode } from "react";
import { useLocation } from "wouter";
import {
  useGetAdminMe,
  useAdminLogout,
  useGetCustomerMe,
  useCustomerLogout,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface CustomerProfile {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
}

interface AuthContextType {
  isAdmin: boolean;
  isAdminLoading: boolean;
  customer: CustomerProfile | null;
  isCustomerLoading: boolean;
  isLoggedIn: boolean;
  logout: () => void;
  customerLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: adminSession, isLoading: isAdminLoading } = useGetAdminMe({
    query: { retry: false },
  });

  const { data: customerSession, isLoading: isCustomerLoading } = useGetCustomerMe({
    query: { retry: false },
  });

  const adminLogoutMutation = useAdminLogout({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
        setLocation("/login");
        toast({ title: "Logged out successfully" });
      },
    },
  });

  const customerLogoutMutation = useCustomerLogout({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries();
        setLocation("/");
        toast({ title: "Signed out" });
      },
    },
  });

  const isAdmin = !!adminSession?.authenticated;
  const customer = customerSession?.authenticated ? (customerSession.customer as CustomerProfile ?? null) : null;
  const isLoggedIn = !!customer;

  return (
    <AuthContext.Provider
      value={{
        isAdmin,
        isAdminLoading,
        customer,
        isCustomerLoading,
        isLoggedIn,
        logout: () => adminLogoutMutation.mutate({}),
        customerLogout: () => customerLogoutMutation.mutate({}),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
