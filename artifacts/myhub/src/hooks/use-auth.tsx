import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useGetAdminMe, useAdminLogout, useGetCustomerMe } from "@workspace/api-client-react";

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
  user: User | null;
  logout: () => void;
  customerLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isSupabaseLoading, setIsSupabaseLoading] = useState(true);

  const { data: adminSession, isLoading: isAdminLoading } = useGetAdminMe();

  const { data: customerSession, isLoading: isCustomerLoading } = useGetCustomerMe({
    query: { 
      queryKey: ["getCustomerMe", user?.id],
      enabled: !!user 
    },
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsSupabaseLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (_event === 'SIGNED_OUT') {
        queryClient.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const adminLogoutMutation = useAdminLogout({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
        setLocation("/login");
        toast({ title: "Logged out successfully" });
      },
    },
  });

  const customerLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Error signing out", description: error.message, variant: "destructive" });
    } else {
      queryClient.clear();
      setLocation("/");
      toast({ title: "Signed out" });
    }
  };

  const isAdmin = !!adminSession?.authenticated;
  const customer = customerSession?.authenticated ? (customerSession.customer as CustomerProfile ?? null) : null;
  const isLoggedIn = !!user;

  return (
    <AuthContext.Provider
      value={{
        isAdmin,
        isAdminLoading,
        customer,
        isCustomerLoading: isCustomerLoading || isSupabaseLoading,
        isLoggedIn,
        user,
        logout: () => adminLogoutMutation.mutate(),
        customerLogout,
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
