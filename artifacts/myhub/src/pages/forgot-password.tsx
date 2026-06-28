import { useState } from "react";
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
import { Mail, Monitor, ArrowLeft, CheckCircle2 } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صحيح"),
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: z.infer<typeof forgotPasswordSchema>) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: "تم إرسال رابط إعادة التعيين",
        description: "يرجى التحقق من بريدك الإلكتروني للحصول على رابط إعادة تعيين كلمة المرور.",
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="bg-primary/10 p-2 rounded-xl">
          <Monitor className="w-6 h-6 text-primary" />
        </div>
        <span className="text-2xl font-bold text-primary tracking-tight">MyHUB</span>
      </Link>

      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">إعادة تعيين كلمة المرور</CardTitle>
          <CardDescription>
            {isSubmitted 
              ? "يرجى التحقق من بريدك الإلكتروني للحصول على رابط إعادة التعيين" 
              : "أدخل بريدك الإلكتروني لتلقي رابط إعادة تعيين كلمة المرور"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSubmitted ? (
            <div className="text-center space-y-6 py-4">
              <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-muted-foreground">
                لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى <span className="font-semibold text-foreground">{form.getValues("email")}</span>.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">العودة لتسجيل الدخول</Link>
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="email">البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input id="email" placeholder="john@example.com" className="pl-9 h-11" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full h-11 font-semibold" disabled={isLoading}>
                  {isLoading ? "جاري إرسال الرابط..." : "إرسال رابط إعادة التعيين"}
                </Button>
                <Button asChild variant="ghost" className="w-full gap-2">
                  <Link href="/login">
                    <ArrowLeft className="w-4 h-4" /> العودة لتسجيل الدخول
                  </Link>
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
