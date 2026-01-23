import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Mail, Hash, BookOpen, GraduationCap, Calendar } from "lucide-react";
import type { Aluno, Turma, Nota, Avaliacao, UnidadeCurricular, Frequencia } from "@shared/schema";
import { LayoutShell } from "@/components/layout-shell";
import { PhotoGallery } from "@/components/photo-gallery";

type AlunoComDetalhes = Aluno & {
  turmas: Turma[];
  notas: (Nota & { avaliacao: Avaliacao; unidadeCurricular: UnidadeCurricular })[];
  frequencia: (Frequencia & { turma: Turma })[];
};

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();

  const { data: aluno, isLoading } = useQuery<AlunoComDetalhes>({
    queryKey: ["/api/alunos", id],
    queryFn: async () => {
      const res = await fetch(`/api/alunos/${id}`);
      if (!res.ok) throw new Error("Aluno não encontrado");
      return res.json();
    },
  });

  const calcularMediaGeral = () => {
    if (!aluno?.notas.length) return null;
    const soma = aluno.notas.reduce((acc, n) => acc + n.valor, 0);
    return (soma / aluno.notas.length).toFixed(1);
  };

  const calcularFrequencia = () => {
    if (!aluno?.frequencia.length) return null;
    const presencas = aluno.frequencia.filter(f => f.status === "presente").length;
    return ((presencas / aluno.frequencia.length) * 100).toFixed(0);
  };

  if (isLoading) {
    return (
      <LayoutShell>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </LayoutShell>
    );
  }

  if (!aluno) {
    return (
      <LayoutShell>
        <div className="space-y-6">
          <p className="text-muted-foreground">Aluno não encontrado.</p>
          <Link href="/students">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>
      </LayoutShell>
    );
  }

  const mediaGeral = calcularMediaGeral();
  const percentualFrequencia = calcularFrequencia();

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/students">
            <Button variant="outline" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold" data-testid="text-student-name">{aluno.nome}</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Informações</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm" data-testid="text-matricula">{aluno.matricula}</span>
              </div>
              {aluno.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm" data-testid="text-email">{aluno.email}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Turmas Matriculadas</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-turmas-count">{aluno.turmas.length}</div>
              <p className="text-xs text-muted-foreground">turma(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Média Geral</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-media-geral">
                {mediaGeral ?? "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">de 10.0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Frequência</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-frequencia">
                {percentualFrequencia ? `${percentualFrequencia}%` : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">presença</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Turmas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aluno.turmas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma turma matriculada.</p>
              ) : (
                <div className="space-y-2">
                  {aluno.turmas.map((turma) => (
                    <Link key={turma.id} href={`/classes/${turma.id}`}>
                      <div 
                        className="flex items-center justify-between p-3 rounded-md hover-elevate cursor-pointer border"
                        data-testid={`card-turma-${turma.id}`}
                      >
                        <span className="font-medium">{turma.nome}</span>
                        <Badge variant="secondary">{turma.ano}/{turma.semestre}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Notas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aluno.notas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma nota registrada.</p>
              ) : (
                <div className="space-y-2">
                  {aluno.notas.slice(0, 5).map((nota) => (
                    <div 
                      key={nota.id} 
                      className="flex items-center justify-between p-3 rounded-md border"
                      data-testid={`row-nota-${nota.id}`}
                    >
                      <div>
                        <p className="font-medium text-sm">{nota.avaliacao.nome}</p>
                        <p className="text-xs text-muted-foreground">{nota.unidadeCurricular.nome}</p>
                      </div>
                      <Badge 
                        variant={nota.valor >= 7 ? "default" : nota.valor >= 5 ? "secondary" : "destructive"}
                      >
                        {nota.valor.toFixed(1)}
                      </Badge>
                    </div>
                  ))}
                  {aluno.notas.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{aluno.notas.length - 5} mais notas
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Histórico de Frequência
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aluno.frequencia.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum registro de frequência.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {aluno.frequencia.slice(0, 12).map((freq) => (
                  <div 
                    key={freq.id} 
                    className="flex items-center justify-between p-3 rounded-md border"
                    data-testid={`row-frequencia-${freq.id}`}
                  >
                    <div>
                      <p className="font-medium text-sm">{freq.data}</p>
                      <p className="text-xs text-muted-foreground">{freq.turma.nome}</p>
                    </div>
                    <Badge 
                      variant={freq.status === "presente" ? "default" : freq.status === "atraso" ? "secondary" : "destructive"}
                    >
                      {freq.status === "presente" ? "Presente" : freq.status === "atraso" ? "Atraso" : "Falta"}
                    </Badge>
                  </div>
                ))}
                {aluno.frequencia.length > 12 && (
                  <p className="text-xs text-muted-foreground text-center pt-2 col-span-full">
                    +{aluno.frequencia.length - 12} mais registros
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <PhotoGallery alunoId={aluno.id} alunoNome={aluno.nome} />
      </div>
    </LayoutShell>
  );
}
