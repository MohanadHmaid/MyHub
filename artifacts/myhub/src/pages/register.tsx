import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Mail, Lock, Phone, Monitor } from "lucide-react";
import { useState } from "react";

const registerSchema = z.object({
  name: z.string().min(2, "يجب أن يكون الاسم حرفين على الأقل"),
  email: z.string().email("بريد إلكتروني غير صحيح"),
  password: z.string().min(6, "يجب أن تكون كلمة المرور 6 أحرف على الأقل"),
  phone: z.string().optional(),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", phone: "" },
  });

  // Check if email already exists
  const checkEmailExists = async (email: string) => {
    try {
      setEmailCheckLoading(true);
      const response = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        console.error("فشل التحقق من البريد الإلكتروني");
        return false;
      }

      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error("خطأ أثناء التحقق من البريد الإلكتروني:", error);
      return false;
    } finally {
      setEmailCheckLoading(false);
    }
  };

  const onSubmit = async (data: RegisterValues) => {
    setIsLoading(true);
    try {
      // First, check if email already exists in our database
      const emailExists = await checkEmailExists(data.email);
      if (emailExists) {
        toast({
          title: "البريد الإلكتروني مسجل بالفعل",
          description: "هذا البريد الإلكتروني مرتبط بحساب بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Proceed with Supabase sign-up
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
            phone: data.phone,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("Supabase signUp error:", error);
        // Supabase returns this message when the email is already registered
        if (
          error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("already exists") ||
          error.message.toLowerCase().includes("user already")
        ) {
          toast({
            title: "البريد الإلكتروني مسجل بالفعل",
            description: "هذا البريد الإلكتروني مرتبط بحساب بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      // Supabase may return a user with identities = [] when email is already registered
      // (when email confirmation is enabled and the email is taken)
      if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
        toast({
          title: "البريد الإلكتروني مسجل بالفعل",
          description: "هذا البريد الإلكتروني مرتبط بحساب بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.",
          variant: "destructive",
        });
        return;
      }

      setIsEmailSent(true);
      toast({
        title: "تم التسجيل بنجاح",
        description: "يرجى التحقق من بريدك الإلكتروني للحصول على رابط التحقق.",
      });
    } catch (error: any) {
      toast({
        title: "فشل التسجيل",
        description: error.message || "حدث خطأ أثناء التسجيل",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold mb-2">تحقق من بريدك الإلكتروني</CardTitle>
          <CardDescription className="text-base">
            لقد أرسلنا رابط تحقق إلى <span className="font-semibold text-foreground">{form.getValues("email")}</span>.
            يرجى النقر على الرابط لتفعيل حسابك.
          </CardDescription>
          <Button asChild className="mt-8 w-full">
            <Link href="/login">العودة لتسجيل الدخول</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8 group">
        <div className="bg-primary/10 p-2 rounded-xl group-hover:bg-primary/20 transition-colors">
          <Monitor className="w-6 h-6 text-primary" />
        </div>
        <span className="text-2xl font-bold text-primary tracking-tight">MyHUB</span>
      </Link>

      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">إنشاء حساب</CardTitle>
          <CardDescription>أدخل بياناتك للتسجيل في MyHUB</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="name">الاسم الكامل</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="name" placeholder="John Doe" className="pl-9 h-11" autoComplete="name" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="email">البريد الإلكتروني</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="john@example.com" className="pl-9 h-11" autoComplete="email" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="phone">الهاتف (اختياري)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" className="pl-9 h-11" autoComplete="tel" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="password">كلمة المرور</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="password" type="password" placeholder="••••••••" className="pl-9 h-11" autoComplete="new-password" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full h-11 font-semibold mt-2" disabled={isLoading || emailCheckLoading}>
                {isLoading ? "جاري إنشاء الحساب..." : emailCheckLoading ? "جاري التحقق من البريد..." : "تسجيل الحساب"}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              تسجيل الدخول
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
