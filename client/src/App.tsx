import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

import Dashboard from "@/pages/dashboard";
import ClassDetails from "@/pages/class-details";
import StudentsList from "@/pages/students-list";
import StudentProfile from "@/pages/student-profile";
import FrequencyRegistration from "@/pages/frequency-registration";
import AttendanceHistory from "@/pages/attendance-history";
import TabletLogin from "@/pages/tablet-login";
import UsersPage from "@/pages/usuarios";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation("/login");
      } else if (user.perfil === "totem") {
        if (window.location.pathname !== "/frequency") {
          setLocation("/frequency");
        }
      }
    }
  }, [isLoading, user, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Totem restriction: ONLY /frequency
  if (user.perfil === "totem") {
    if (window.location.pathname !== "/frequency") {
      return null;
    }
    // Render without shell for totem
    return <Component {...rest} />;
  }

  // Admin access control for specific paths
  const path = rest.path;
  if (path === "/usuarios" && user.perfil !== "admin") {
    setLocation("/");
    return null;
  }

  return <Component {...rest} />;
}

function Router() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se o usuário for totem, ele fica preso no Router específico
  if (user?.perfil === "totem") {
    return (
      <Switch>
        <Route path="/frequency" component={FrequencyRegistration} />
        <Route>
          {() => {
            useEffect(() => {
              if (window.location.pathname !== "/frequency") {
                window.location.replace("/frequency");
              }
            }, []);
            return (
              <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            );
          }}
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/tablet-login" component={TabletLogin} />
      
      {/* Protected Routes */}
      <Route path="/">
        {(params) => <ProtectedRoute component={Dashboard} path="/" {...params} />}
      </Route>
      <Route path="/classes/:id">
        {(params) => <ProtectedRoute component={ClassDetails} path="/classes/:id" {...params} />}
      </Route>
      <Route path="/students">
        {(params) => <ProtectedRoute component={StudentsList} path="/students" {...params} />}
      </Route>
      <Route path="/student/:id">
        {(params) => <ProtectedRoute component={StudentProfile} path="/student/:id" {...params} />}
      </Route>
      <Route path="/frequency">
        {(params) => <ProtectedRoute component={FrequencyRegistration} path="/frequency" {...params} />}
      </Route>
      <Route path="/frequency/:turmaId">
        {(params) => <ProtectedRoute component={FrequencyRegistration} path="/frequency/:turmaId" {...params} />}
      </Route>
      <Route path="/historico-presenca">
        {(params) => <ProtectedRoute component={AttendanceHistory} path="/historico-presenca" {...params} />}
      </Route>
      <Route path="/usuarios">
        {(params) => <ProtectedRoute component={UsersPage} path="/usuarios" {...params} />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
