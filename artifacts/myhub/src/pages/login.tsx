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
import { Lock, User, Monitor } from "lucide-react";

const unifiedLoginSchema = z.object({
  identifier: z.string().min(1, "البريد الإلكتروني أو اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

function UnifiedLoginForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
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
          toast({ title: "تم تسجيل دخول المسؤول" });
          setLocation("/admin/dashboard");
        }
      },
      onError: () => {
        toast({ 
          title: "فشل تسجيل الدخول", 
          description: "اسم المستخدم أو كلمة المرور غير صحيحة.", 
          variant: "destructive" 
        });
      },
    },
  });

  const onSubmit = async (data: z.infer<typeof unifiedLoginSchema>) => {
    setIsLoading(true);
    try {
      // Try customer login first if it looks like an email
      if (data.identifier.includes("@")) {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.identifier,
          password: data.password,
        });

        if (!error) {
          await queryClient.invalidateQueries();
          toast({ title: "مرحباً بعودتك!" });
          setLocation("/");
          return;
        }
        
        // If email login fails, don't immediately throw, try admin login just in case
        // (though admins usually use usernames)
      }

      // Try admin login
      loginMutation.mutate({
        data: {
          username: data.identifier,
          password: data.password,
        },
      });
      
    } catch (error: any) {
      toast({
        title: "فشل تسجيل الدخول",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Form Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">مرحباً بكم في MyHUB</h1>
        <p className="text-muted-foreground text-sm mt-2">
          سجل الدخول للوصول إلى حسابك
        </p>
      </div>

      {/* دخول Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField control={form.control} name="identifier" render={({ field }) => (
            <FormItem>
              <FormLabel>البريد الإلكتروني أو اسم المستخدم</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="أدخل بريدك الإلكتروني أو اسم المستخدم"
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
                <FormLabel>كلمة المرور</FormLabel>
                <Link href="/forgot-password" title="Reset password" className="text-xs text-primary hover:underline">
                  هل نسيت كلمة المرور؟
                </Link>
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
            {isLoading || loginMutation.isPending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">جديد هنا؟</span>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            ليس لديك حساب؟{" "}
            <Link href="/register" className="text-primary font-medium hover:underline">
              سجل هنا
            </Link>
          </p>
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
