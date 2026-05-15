import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { User, Lock, Mail, Monitor } from "lucide-react";

const unifiedLoginSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

function UnifiedLoginForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState<"customer" | "admin">("customer");
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof unifiedLoginSchema>>({
    resolver: zodResolver(unifiedLoginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const loginMutation = useAdminLogin({
    mutation: {
      onSuccess: async (data) => {
        if (data.success) {
          await queryClient.invalidateQueries({ queryKey: ["/api/admin/me"] });
          toast({ title: "Admin access granted" });
          setLocation("/admin/dashboard");
        }
      },
      onError: () => {
        toast({ title: "Login failed", description: "Invalid credentials", variant: "destructive" });
      },
    },
  });

  const onSubmit = async (data: z.infer<typeof unifiedLoginSchema>) => {
    setIsLoading(true);
    try {
      if (loginType === "customer") {
        // Customer login with email
        const { error } = await supabase.auth.signInWithPassword({
          email: data.identifier,
          password: data.password,
        });

        if (error) throw error;

        await queryClient.invalidateQueries();
        toast({ title: "Welcome back!" });
        setLocation("/");
      } else {
        // Admin login with username
        loginMutation.mutate({
          data: {
            username: data.identifier,
            password: data.password,
          },
        });
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Login Type Toggle */}
      <div className="flex gap-2 mb-6 bg-secondary/50 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => {
            setLoginType("customer");
            form.reset();
          }}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            loginType === "customer"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="w-4 h-4 inline mr-2" />
          Customer
        </button>
        <button
          type="button"
          onClick={() => {
            setLoginType("admin");
            form.reset();
          }}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            loginType === "admin"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="w-4 h-4 inline mr-2" />
          Admin
        </button>
      </div>

      {/* Form Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">
          {loginType === "customer" ? "Welcome back" : "Admin Access"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {loginType === "customer"
            ? "Sign in to view your reservations"
            : "MyHUB Management System"}
        </p>
      </div>

      {/* Login Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField control={form.control} name="identifier" render={({ field }) => (
            <FormItem>
              <FormLabel>
                {loginType === "customer" ? "Email" : "Username"}
              </FormLabel>
              <FormControl>
                <div className="relative">
                  {loginType === "customer" ? (
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  ) : (
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  )}
                  <Input
                    placeholder={loginType === "customer" ? "john@example.com" : "admin"}
                    className="pl-9 h-11"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                {loginType === "customer" && (
                  <Link href="/forgot-password" title="Reset password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                )}
              </div>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="password" placeholder="••••••••" className="pl-9 h-11" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <Button
            type="submit"
            className="w-full h-11 font-semibold"
            disabled={isLoading || loginMutation.isPending}
          >
            {isLoading || loginMutation.isPending
              ? loginType === "customer"
                ? "Signing in..."
                : "Authenticating..."
              : "Sign In"}
          </Button>

          {loginType === "customer" && (
            <p className="text-center text-sm text-muted-foreground">
              No account?{" "}
              <Link href="/register" className="text-primary font-medium hover:underline">
                Register here
              </Link>
            </p>
          )}
        </form>
      </Form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="bg-primary/10 p-2 rounded-xl">
          <Monitor className="w-6 h-6 text-primary" />
        </div>
        <span className="text-2xl font-bold text-primary tracking-tight">MyHUB</span>
      </Link>
      <div className="w-full max-w-md bg-card border border-border/50 rounded-2xl shadow-xl p-8">
        <UnifiedLoginForm />
      </div>
    </div>
  );
}
