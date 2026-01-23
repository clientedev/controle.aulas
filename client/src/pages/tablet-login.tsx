import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Keyboard } from "lucide-react";

export default function TabletLogin() {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pin.length < 4) return;

    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login-pin", { pin });
      if (res.ok) {
        toast({
          title: "Acesso Liberado",
          description: "Bem-vindo ao Totem de Frequência.",
        });
        setLocation("/frequency");
      } else {
        toast({
          title: "Erro de Acesso",
          description: "PIN de terminal incorreto.",
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

  const addDigit = (digit: string) => {
    if (pin.length < 6) setPin(prev => prev + digit);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <Card className="w-full max-w-md shadow-2xl border-2 border-primary/10 rounded-3xl overflow-hidden">
        <CardHeader className="bg-primary text-white p-8 text-center">
          <CardTitle className="text-3xl font-bold font-display">Totem SENAI</CardTitle>
          <p className="text-primary-foreground/80 mt-2">Acesso Restrito ao Terminal</p>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="flex justify-center gap-3">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-10 h-14 border-2 rounded-xl flex items-center justify-center text-2xl font-bold transition-all ${
                    pin.length > i ? "border-primary bg-primary/5" : "border-muted bg-muted/20"
                  }`}
                >
                  {pin.length > i ? "•" : ""}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"].map((btn) => (
                <Button
                  key={btn}
                  type="button"
                  variant={btn === "OK" ? "default" : "outline"}
                  className={`h-16 text-xl font-bold rounded-2xl ${
                    btn === "OK" ? "bg-primary" : "hover:bg-primary/10"
                  }`}
                  onClick={() => {
                    if (btn === "C") setPin("");
                    else if (btn === "OK") handleLogin();
                    else addDigit(btn);
                  }}
                  disabled={isLoading}
                >
                  {btn === "OK" ? <Keyboard className="h-6 w-6" /> : btn}
                </Button>
              ))}
            </div>

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
