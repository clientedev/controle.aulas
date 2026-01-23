import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Monitor, Lock } from "lucide-react";

export default function TabletLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { 
        email, 
        senha: password 
      });
      
      if (res.ok) {
        toast({
          title: "Acesso Liberado",
          description: "Bem-vindo ao Totem de Frequência.",
        });
        setLocation("/frequency");
      } else {
        toast({
          title: "Erro de Acesso",
          description: "Credenciais de totem incorretas.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Erro no Sistema",
        description: "Não foi possível conectar ao servidor.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <Card className="w-full max-w-md shadow-2xl border-2 border-primary/10 rounded-3xl overflow-hidden">
        <CardHeader className="bg-primary text-white p-8 text-center">
          <Monitor className="h-12 w-12 mx-auto mb-4 opacity-80" />
          <CardTitle className="text-3xl font-bold font-display">Totem SENAI</CardTitle>
          <p className="text-primary-foreground/80 mt-2">Login de Terminal</p>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  E-mail do Totem
                </label>
                <Input 
                  type="email"
                  placeholder="ex: totem@senai.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl border-2"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Senha do Totem
                </label>
                <Input 
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-2"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-14 text-lg font-bold rounded-xl shadow-lg hover:scale-[1.02] transition-transform"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Acessar Terminal
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


            {isLoading && (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
