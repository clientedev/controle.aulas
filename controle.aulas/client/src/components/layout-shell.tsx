import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LogOut, LayoutDashboard, Menu, School,
  GraduationCap, Users, History, ChevronRight, Shield, Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function LayoutShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const navGroups = [
    {
      label: "Principal",
      items: [
        { href: "/", label: "Painel", icon: LayoutDashboard, exact: true },
        { href: "/students", label: "Alunos", icon: GraduationCap, exact: false },
      ]
    },
    {
      label: "Frequência",
      items: [
        { href: "/frequency", label: "Registro por Câmera", icon: Camera, exact: false },
        { href: "/historico-presenca", label: "Histórico", icon: History, exact: true },
      ]
    },
    ...(user?.perfil === "admin" ? [{
      label: "Administração",
      items: [
        { href: "/usuarios", label: "Professores", icon: Shield, exact: true },
      ]
    }] : [])
  ];

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
          <School className="h-5 w-5" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-display font-bold text-[15px] text-foreground tracking-tight">SENAI</span>
          <span className="text-[11px] text-muted-foreground font-medium">Gestão Educacional</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {group.label}
            </p>
            <nav className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = item.exact ? location === item.href : location.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150
                      ${isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="border-t p-3 space-y-2">
        <div className="flex items-center gap-2.5 rounded-xl bg-muted/50 p-2.5">
          <Avatar className="h-8 w-8 shrink-0 border border-border">
            <AvatarImage src={(user as any)?.profileImageUrl} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
              {user?.nome?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden min-w-0">
            <span className="truncate text-sm font-semibold text-foreground leading-tight">{user?.nome}</span>
            <Badge
              variant="outline"
              className="w-fit mt-0.5 text-[10px] px-1.5 py-0 h-4 capitalize font-medium border-primary/30 text-primary"
            >
              {user?.perfil === "admin" ? "Admin" : "Professor"}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-sm font-medium"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOut className="h-4 w-4" />
          {logout.isPending ? "Saindo..." : "Sair"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed left-4 top-4 z-50 md:hidden bg-background/90 backdrop-blur-sm border shadow-sm h-9 w-9"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col md:border-r bg-card">
        <SidebarContent />
      </div>

      <main className="md:pl-64 min-h-screen flex flex-col">
        <div className="flex-1 p-5 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
