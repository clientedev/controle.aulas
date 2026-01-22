import { queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useParams, Link } from "wouter";
import { useClass, useDeleteClass } from "@/hooks/use-classes";
import { useStudents, useEnrollStudent, useCreateManyStudents } from "@/hooks/use-students";
import { useCreateEvaluation } from "@/hooks/use-evaluations";
import { useClassGrades, useUpdateGrade } from "@/hooks/use-grades";
import { useUnidadesCurriculares, useCreateUnidadeCurricular } from "@/hooks/use-unidades-curriculares";
import { LayoutShell } from "@/components/layout-shell";
import {
  ArrowLeft,
  Plus,
  Trash2,
  UserPlus,
  FileText,
  AlertCircle,
  Users,
  MoreHorizontal,
  Upload,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const createEvaluationSchema = z.object({
  unidadeCurricularId: z.string().min(1, "Selecione a unidade"),
  nome: z.string().min(2, "Nome obrigatório"),
  notaMaxima: z.string().transform(val => parseFloat(val) || 10),
  peso: z.string().transform(val => parseFloat(val) || 1),
});

export default function ClassDetails() {
  const { id } = useParams<{ id: string }>();
  const classId = Number(id);
  
  const { data: classData, isLoading } = useClass(classId);
  const deleteClassMutation = useDeleteClass();
  
  if (isLoading) return <DetailsSkeleton />;
  if (!classData) return <NotFoundState />;

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-2xl font-bold md:text-3xl">{classData.nome}</h1>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  {classData.ano} • {classData.semestre}º Sem.
                </Badge>
              </div>
              <p className="text-muted-foreground font-medium">Turma</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Turma
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente a turma,
                    todas as matrículas, avaliações e notas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => deleteClassMutation.mutate(classId)}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Tabs defaultValue="students" className="w-full space-y-6">
          <TabsList className="w-full justify-start border-b bg-transparent p-0">
            <TabsTrigger 
              value="students" 
              className="rounded-none border-b-2 border-transparent px-4 py-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              Alunos
            </TabsTrigger>
            <TabsTrigger 
              value="unidades" 
              className="rounded-none border-b-2 border-transparent px-4 py-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              Unidades Curriculares
            </TabsTrigger>
            <TabsTrigger 
              value="evaluations" 
              className="rounded-none border-b-2 border-transparent px-4 py-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              Avaliações
            </TabsTrigger>
            <TabsTrigger 
              value="grades" 
              className="rounded-none border-b-2 border-transparent px-4 py-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              Notas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <StudentsTab enrolledStudents={classData.alunos || []} classId={classId} />
          </TabsContent>

          <TabsContent value="unidades" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <UnidadesTab classId={classId} unidades={classData.unidadesCurriculares || []} />
          </TabsContent>

          <TabsContent value="evaluations" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <EvaluationsTab 
              evaluations={classData.avaliacoes || []} 
              unidades={classData.unidadesCurriculares || []} 
            />
          </TabsContent>

          <TabsContent value="grades" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <GradesTab 
              classId={classId} 
              students={classData.alunos || []} 
              evaluations={classData.avaliacoes || []} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </LayoutShell>
  );
}

function StudentsTab({ classId, enrolledStudents }: { classId: number, enrolledStudents: any[] }) {
  const { data: allStudents } = useStudents();
  const enrollMutation = useEnrollStudent(classId);
  const createManyMutation = useCreateManyStudents();
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const { toast } = useToast();

  const availableStudents = allStudents?.filter(
    s => !enrolledStudents.find(es => es.id === s.id)
  ) || [];

  const handleEnroll = () => {
    if (selectedStudentId) {
      enrollMutation.mutate(Number(selectedStudentId), {
        onSuccess: () => {
          setEnrollDialogOpen(false);
          setSelectedStudentId("");
        }
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const formattedStudents = data.map((row: any) => ({
          nome: row.Nome || row.nome,
          matricula: String(row.Matricula || row.matricula || row.RA || row.ra),
          email: row.Email || row.email || null,
        })).filter(s => s.nome && s.matricula);

        if (formattedStudents.length === 0) {
          toast({ title: "Erro", description: "Nenhum aluno válido encontrado no arquivo. Certifique-se de que as colunas 'Nome' e 'Matricula' existem.", variant: "destructive" });
          return;
        }

        createManyMutation.mutate(formattedStudents, {
          onSuccess: async (createdStudents) => {
            // After creating, enroll them all in the class
            for (const student of createdStudents) {
              await enrollMutation.mutateAsync(student.id);
            }
            toast({ title: "Sucesso", description: `${formattedStudents.length} alunos importados e matriculados` });
            setEnrollDialogOpen(false);
          }
        });
      } catch (err) {
        toast({ title: "Erro", description: "Falha ao processar arquivo Excel", variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Alunos Matriculados</CardTitle>
          <CardDescription>Gerencie os alunos desta turma</CardDescription>
        </div>
        <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Matricular Aluno
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Matricular Aluno</DialogTitle>
              <DialogDescription>Selecione um aluno ou suba uma lista Excel (Colunas: Nome, Matricula, Email)</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="student-select">Selecionar Aluno Existente</Label>
                <select
                  id="student-select"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-2"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                >
                  <option value="">Selecione um aluno...</option>
                  {availableStudents.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.nome} ({student.matricula})
                    </option>
                  ))}
                </select>
                <Button 
                  className="w-full mt-2" 
                  onClick={handleEnroll} 
                  disabled={!selectedStudentId || enrollMutation.isPending}
                >
                  {enrollMutation.isPending ? "Matriculando..." : "Matricular Selecionado"}
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Ou importar lista</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excel-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors">
                    <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                    <span className="text-sm font-medium">Clique para subir arquivo Excel</span>
                    <span className="text-xs text-muted-foreground mt-1">Colunas: Nome, Matricula, Email (opcional)</span>
                  </div>
                  <Input 
                    id="excel-upload" 
                    type="file" 
                    accept=".xlsx, .xls" 
                    className="hidden" 
                    onChange={handleFileUpload}
                    disabled={createManyMutation.isPending}
                  />
                </Label>
                {createManyMutation.isPending && (
                  <p className="text-xs text-center text-primary animate-pulse font-medium">Processando lista de alunos...</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEnrollDialogOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {enrolledStudents.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-xl">
            <Users className="h-8 w-8 mb-2 opacity-50" />
            <p>Nenhum aluno matriculado ainda</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matrícula</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrolledStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono text-xs">{student.matricula}</TableCell>
                  <TableCell className="font-medium">{student.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{student.email || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function UnidadesTab({ classId, unidades }: { classId: number, unidades: any[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState("");
  const createMutation = useCreateUnidadeCurricular(classId);

  const handleCreate = () => {
    if (nome) {
      createMutation.mutate(nome, {
        onSuccess: () => {
          setDialogOpen(false);
          setNome("");
        }
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Unidades Curriculares</CardTitle>
          <CardDescription>Matérias associadas a esta turma</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Unidade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Unidade Curricular</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="uc-nome">Nome da Unidade</Label>
                <Input 
                  id="uc-nome" 
                  placeholder="ex: Lógica de Programação" 
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!nome || createMutation.isPending}>
                  {createMutation.isPending ? "Criando..." : "Criar"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {unidades.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-xl">
            <BookOpen className="h-8 w-8 mb-2 opacity-50" />
            <p>Nenhuma unidade curricular criada ainda</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unidades.map((uc) => (
                <TableRow key={uc.id}>
                  <TableCell className="font-medium">{uc.nome}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function EvaluationsTab({ evaluations, unidades }: { evaluations: any[], unidades: any[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUcId, setSelectedUcId] = useState<number | null>(null);
  
  // Custom hook for create evaluation needs to handle selectedUcId
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { unidadeCurricularId, ...rest } = data;
      const res = await fetch(`/api/unidades-curriculares/${unidadeCurricularId}/avaliacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
      });
      if (!res.ok) throw new Error("Erro ao criar avaliação");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.turmas.obter.path] });
    }
  });
  
  const form = useForm({
    resolver: zodResolver(createEvaluationSchema),
    defaultValues: { nome: "", notaMaxima: "10", peso: "1", unidadeCurricularId: "" }
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setDialogOpen(false);
        form.reset();
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Avaliações</CardTitle>
          <CardDescription>Provas, trabalhos e projetos</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={unidades.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Avaliação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Avaliação</DialogTitle>
              {unidades.length === 0 && (
                <DialogDescription className="text-destructive font-medium">
                  Crie uma unidade curricular primeiro!
                </DialogDescription>
              )}
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="unidadeCurricularId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade Curricular</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a unidade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {unidades.map(uc => (
                            <SelectItem key={uc.id} value={uc.id.toString()}>{uc.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Avaliação</FormLabel>
                      <FormControl><Input placeholder="Prova 1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="notaMaxima"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nota Máxima</FormLabel>
                        <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="peso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Peso</FormLabel>
                        <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>Criar</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {evaluations.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-xl">
            <FileText className="h-8 w-8 mb-2 opacity-50" />
            <p>Nenhuma avaliação criada ainda</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Nota Máxima</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluations.map((evalItem) => {
                const uc = unidades.find(u => u.id === evalItem.unidadeCurricularId);
                return (
                  <TableRow key={evalItem.id}>
                    <TableCell className="font-medium">{evalItem.nome}</TableCell>
                    <TableCell>{uc?.nome || "-"}</TableCell>
                    <TableCell>{evalItem.notaMaxima}</TableCell>
                    <TableCell>{evalItem.peso}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function GradesTab({ classId, students, evaluations }: { classId: number, students: any[], evaluations: any[] }) {
  const { data: grades, isLoading } = useClassGrades(classId);
  const updateGradeMutation = useUpdateGrade(classId);

  const getGrade = (studentId: number, evalId: number) => {
    return grades?.find(g => g.alunoId === studentId && g.avaliacaoId === evalId)?.valor ?? "";
  };

  const handleGradeChange = (studentId: number, evalId: number, value: string) => {
    if (value === "") return;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    updateGradeMutation.mutate({
      alunoId: studentId,
      avaliacaoId: evalId,
      valor: numValue
    });
  };

  if (isLoading) return <div className="p-8 text-center">Carregando notas...</div>;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Planilha de Notas</CardTitle>
        <CardDescription>Insira as notas para cada aluno e avaliação</CardDescription>
      </CardHeader>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px] sticky left-0 bg-card z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Aluno</TableHead>
              {evaluations.map(e => (
                <TableHead key={e.id} className="text-center min-w-[100px]">
                  <div className="flex flex-col">
                    <span>{e.nome}</span>
                    <span className="text-xs text-muted-foreground font-normal">Máx: {e.notaMaxima}</span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center font-bold bg-muted/20">Média</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map(student => {
              let totalWeight = 0;
              let weightedSum = 0;
              
              evaluations.forEach(e => {
                const grade = grades?.find(g => g.alunoId === student.id && g.avaliacaoId === e.id);
                if (grade) {
                  const normalizedScore = (grade.valor / e.notaMaxima) * 10;
                  weightedSum += normalizedScore * e.peso;
                  totalWeight += e.peso;
                }
              });

              const finalAverage = totalWeight > 0 ? (weightedSum / totalWeight).toFixed(1) : "-";

              return (
                <TableRow key={student.id}>
                  <TableCell className="sticky left-0 bg-card z-10 font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div className="flex flex-col">
                      <span>{student.nome}</span>
                      <span className="text-xs text-muted-foreground font-mono">{student.matricula}</span>
                    </div>
                  </TableCell>
                  {evaluations.map(e => (
                    <TableCell key={e.id} className="p-2 text-center">
                      <Input 
                        className="w-16 h-9 mx-auto text-center tabular-nums" 
                        defaultValue={getGrade(student.id, e.id)}
                        onBlur={(ev) => handleGradeChange(student.id, e.id, ev.target.value)}
                        placeholder="-"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold bg-muted/20">
                    <span className={Number(finalAverage) >= 6 ? "text-green-600" : "text-destructive"}>
                      {finalAverage}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function DetailsSkeleton() {
  return (
    <LayoutShell>
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </LayoutShell>
  );
}

function NotFoundState() {
  return (
    <LayoutShell>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Turma Não Encontrada</h2>
        <p className="text-muted-foreground mt-2 mb-6">A turma que você está procurando não existe ou foi excluída.</p>
        <Link href="/">
          <Button>Voltar ao Painel</Button>
        </Link>
      </div>
    </LayoutShell>
  );
}
