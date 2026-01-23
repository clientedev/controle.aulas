import { useQuery } from "@tanstack/react-query";
import { LayoutShell } from "@/components/layout-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Frequencia, Aluno, Turma } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, History } from "lucide-react";

export default function AttendanceHistory() {
  const { data: presenceHistory, isLoading } = useQuery<(Frequencia & { aluno: Aluno; turma: Turma })[]>({
    queryKey: ["/api/attendance-history"],
  });

  return (
    <LayoutShell>
      <div className="max-w-6xl mx-auto space-y-6 px-4 md:px-0 pt-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold font-display text-primary flex items-center gap-2">
            <History className="h-8 w-8" />
            Relatório Geral de Frequência
          </h1>
          <p className="text-muted-foreground">Relação completa de todos os registros de presença realizados no sistema.</p>
        </header>

        <Card className="border-2 border-primary/10 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle>Histórico Completo</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Turma</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {presenceHistory?.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {format(parseISO(entry.data), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{entry.aluno.nome}</TableCell>
                        <TableCell>{entry.turma.nome}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={entry.status === "presente" ? "default" : "destructive"}
                            className="capitalize"
                          >
                            {entry.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {presenceHistory?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          Nenhum registro encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}
