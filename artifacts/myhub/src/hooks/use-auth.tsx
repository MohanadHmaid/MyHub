import { createContext, useContext, ReactNode } from "react";
import { useLocation } from "wouter";
import { useGetAdminMe, useAdminLogout } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { QueryClient, useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: session, isLoading, error } = useGetAdminMe({
    query: {
      retry: false,
    }
  });

  const logoutMutation = useAdminLogout({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
        setLocation("/admin/login");
        toast({ title: "Logged out successfully" });
      }
    }
  });

  const isAdmin = !!session?.authenticated;

  return (
    <AuthContext.Provider value={{ isAdmin, isLoading, logout: () => logoutMutation.mutate({}) }}>
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
