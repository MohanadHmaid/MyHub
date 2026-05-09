import { useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function AuthCallbackPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Get the code from the URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const next = params.get("next") || "/";

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          toast({
            title: "Authentication error",
            description: error.message,
            variant: "destructive",
          });
          setLocation("/login");
        } else {
          toast({ title: "Email verified successfully!" });
          setLocation(next);
        }
      } else {
        // If no code, check if we already have a session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          // Check for error in hash (common in older Supabase flows)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const errorMsg = hashParams.get("error_description");
          if (errorMsg) {
            toast({
              title: "Authentication error",
              description: errorMsg.replace(/\+/g, ' '),
              variant: "destructive",
            });
          }
          setLocation("/login");
        } else {
          setLocation("/");
        }
      }
    };

    handleAuthCallback();
  }, [setLocation, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground font-medium">Verifying your account...</p>
      </div>
    </div>
  );
}
