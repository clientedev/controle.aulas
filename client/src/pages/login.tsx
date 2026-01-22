import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { School, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Login() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  if (isLoading) return null;

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Column - Branding */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-primary/40"></div>
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-2xl font-bold font-display">
            <School className="h-8 w-8" />
            <span>EduSync</span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-extrabold font-display leading-tight mb-6">
            Empowering Educators, <br />
            Inspiring Students.
          </h1>
          <p className="text-xl text-primary-foreground/90 mb-8 leading-relaxed">
            A comprehensive platform designed for modern education management. 
            Simplify attendance, grades, and communication in one unified interface.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-white/20 p-1">
                <CheckCircle className="h-4 w-4" />
              </div>
              <span className="font-medium">Streamlined Class Management</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-white/20 p-1">
                <CheckCircle className="h-4 w-4" />
              </div>
              <span className="font-medium">Real-time Grade Tracking</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-white/20 p-1">
                <CheckCircle className="h-4 w-4" />
              </div>
              <span className="font-medium">Automated Reports & Insights</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-primary-foreground/60">
          © 2024 EduSync Systems. Built for Technical Education.
        </div>
      </div>

      {/* Right Column - Login */}
      <div className="flex flex-col items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4 lg:hidden">
              <School className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="mt-2 text-muted-foreground">
              Sign in to access your dashboard and manage your classes.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <Button 
              size="lg" 
              className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]" 
              onClick={() => window.location.href = "/api/login"}
            >
              Sign in with Replit
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Teacher Access Only
                </span>
              </div>
            </div>
            
            <p className="text-center text-sm text-muted-foreground">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
