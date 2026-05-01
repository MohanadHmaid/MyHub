import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { useAdminLogin, useCustomerLogin } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Monitor, Lock, User, Mail, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const customerSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const adminSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

function CustomerLoginForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useCustomerLogin({
    mutation: {
      onSuccess: (data) => {
        if (data.success) {
          queryClient.invalidateQueries();
          toast({ title: `Welcome back, ${data.customer.name}!` });
          setLocation("/my-reservations");
        }
      },
      onError: () => {
        toast({ title: "Login failed", description: "Invalid email or password", variant: "destructive" });
      },
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => loginMutation.mutate({ data: d }))} className="space-y-5">
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="you@example.com" className="pl-9 h-11" {...field} />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="password" placeholder="••••••••" className="pl-9 h-11" {...field} />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full h-11 font-semibold" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Signing in…" : "Sign In"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Register here
          </Link>
        </p>
      </form>
    </Form>
  );
}

function AdminLoginForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof adminSchema>>({
    resolver: zodResolver(adminSchema),
    defaultValues: { username: "", password: "" },
  });

  const loginMutation = useAdminLogin({
    mutation: {
      onSuccess: (data) => {
        if (data.success) {
          queryClient.invalidateQueries();
          toast({ title: "Admin access granted" });
          setLocation("/admin/dashboard");
        }
      },
      onError: () => {
        toast({ title: "Login failed", description: "Invalid credentials", variant: "destructive" });
      },
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => loginMutation.mutate({ data: d }))} className="space-y-5">
        <FormField control={form.control} name="username" render={({ field }) => (
          <FormItem>
            <FormLabel>Username</FormLabel>
            <FormControl>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="admin" className="pl-9 h-11" {...field} />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="password" placeholder="••••••••" className="pl-9 h-11" {...field} />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full h-11 font-semibold" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Authenticating…" : "Sign In as Admin"}
        </Button>
      </form>
    </Form>
  );
}

export default function LoginPage() {
  const [tab, setTab] = useState<string>("customer");

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="bg-primary/10 p-2 rounded-xl">
          <Monitor className="w-6 h-6 text-primary" />
        </div>
        <span className="text-2xl font-bold text-primary tracking-tight">MyHUB</span>
      </Link>

      <div className="w-full max-w-md bg-card border border-border/50 rounded-2xl shadow-xl p-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full mb-6">
            <TabsTrigger value="customer" className="flex-1 gap-2">
              <User className="w-4 h-4" /> Customer
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex-1 gap-2">
              <ShieldCheck className="w-4 h-4" /> Admin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customer">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="text-muted-foreground text-sm mt-1">Sign in to view your reservations</p>
            </div>
            <CustomerLoginForm />
          </TabsContent>

          <TabsContent value="admin">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">Admin Access</h1>
              <p className="text-muted-foreground text-sm mt-1">MyHUB Management System</p>
            </div>
            <AdminLoginForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
