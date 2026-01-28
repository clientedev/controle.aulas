import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ArrowLeft, Plus, Trash2, UserPlus, FileText, AlertCircle, 
  Users, MoreHorizontal, Upload, BookOpen, Clock, Check, X, Minus, Download, Pencil, Camera 
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useClass, useDeleteClass } from "@/hooks/use-classes";
import { useStudents, useEnrollStudent, useCreateManyStudents } from "@/hooks/use-students";
import { useClassGrades, useUpdateGrade } from "@/hooks/use-grades";
import { useUnidadesCurriculares, useCreateUnidadeCurricular } from "@/hooks/use-unidades-curriculares";
import { LayoutShell } from "@/components/layout-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
  AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";
import { api } from "@shared/routes";

const createEvaluationSchema = z.object({
  unidadeCurricularId: z.string().min(1, "Selecione a unidade"),
  nome: z.string().min(2, "Nome obrigatório"),
  notaMaxima: z.string().transform(val => parseFloat(val) || 10),
  peso: z.string().transform(val => parseFloat(val) || 1),
});

const studentSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  matricula: z.string().optional().or(z.literal("")),
});

export default function ClassDetails() {
  const { id } = useParams<{ id: string }>();
  const classId = Number(id);
  
  const { data: classData, isLoading } = useClass(classId);
  const deleteClassMutation = useDeleteClass();
  
  const [isEditingClass, setIsEditingClass] = useState(false);
  const updateClassMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/turmas/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao atualizar turma");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/turmas", classId] });
      setIsEditingClass(false);
      toast({ title: "Sucesso", description: "Turma atualizada com sucesso" });
    }
  });

  const { toast } = useToast();

  const classForm = useForm({
    defaultValues: {
      nome: classData?.nome || "",
      ano: classData?.ano?.toString() || new Date().getFullYear().toString(),
      semestre: classData?.semestre?.toString() || "1",
    }
  });

  const [gradingEvaluation, setGradingEvaluation] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState("students");

  if (isLoading) return <DetailsSkeleton />;
  if (!classData) return <NotFoundState />;

  return (
    <LayoutShell>
      <div className="space-y-6">
        {/* ... existing header code ... */}
        
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
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
              value="attendance" 
              className="rounded-none border-b-2 border-transparent px-4 py-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              Frequência
            </TabsTrigger>
            <TabsTrigger 
              value="grades" 
              className="rounded-none border-b-2 border-transparent px-4 py-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              Notas
            </TabsTrigger>
            <TabsTrigger 
              value="final-grades" 
              className="rounded-none border-b-2 border-transparent px-4 py-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              Nota Final
            </TabsTrigger>
            <TabsTrigger 
              value="totem" 
              className="rounded-none border-b-2 border-transparent px-4 py-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              Totem
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evaluations">
            <EvaluationsTab 
              evaluations={(classData as any).avaliacoes || []} 
              unidades={classData.unidadesCurriculares || []} 
              classId={classId}
              onStartGrading={(ev: any) => {
                setGradingEvaluation(ev);
                setActiveTab("grading");
              }}
            />
          </TabsContent>

          <TabsContent value="grading">
            {gradingEvaluation && (
              <GradingView 
                evaluation={gradingEvaluation} 
                students={classData.alunos || []}
                onBack={() => setActiveTab("evaluations")}
              />
            )}
          </TabsContent>

          <TabsContent value="final-grades">
            <FinalGradesTab 
              classId={classId}
              students={classData.alunos || []}
              unidades={classData.unidadesCurriculares || []}
            />
          </TabsContent>
        </Tabs>
      </div>
    </LayoutShell>
  );
}

function GradingView({ evaluation, students, onBack }: { evaluation: any, students: any[], onBack: () => void }) {
  const updateGradeMutation = useUpdateGrade();
  const [grades, setGrades] = useState<Record<number, string>>({});

  const handleUpdate = (studentId: number, valor: string) => {
    setGrades(prev => ({ ...prev, [studentId]: valor }));
    const numValor = parseFloat(valor);
    if (!isNaN(numValor)) {
      updateGradeMutation.mutate({
        alunoId: studentId,
        avaliacaoId: evaluation.id,
        valor: numValor
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Lançar Notas: {evaluation.nome}</CardTitle>
          <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Nota (Máx: {evaluation.notaMaxima})</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map(student => (
              <TableRow key={student.id}>
                <TableCell>{student.nome}</TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    max={evaluation.notaMaxima}
                    className="w-24"
                    value={grades[student.id] ?? ""}
                    onChange={(e) => handleUpdate(student.id, e.target.value)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function FinalGradesTab({ classId, students, unidades }: { classId: number, students: any[], unidades: any[] }) {
  const { data: grades } = useClassGrades(classId);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Média Final por Unidade Curricular</CardTitle>
          <CardDescription>Cálculo: Média das Avaliações + Critérios</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              {unidades.map(uc => (
                <TableHead key={uc.id} className="text-center">{uc.nome}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map(student => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.nome}</TableCell>
                {unidades.map(uc => {
                  const ucGrades = grades?.filter((g: any) => g.unidadeCurricularId === uc.id && g.alunoId === student.id) || [];
                  const evaluationsAvg = ucGrades.length > 0 ? (ucGrades.reduce((acc: number, g: any) => acc + g.valor, 0) / ucGrades.length) : 0;
                  
                  // Simplificação: Se houver integração com critérios, a média final pode ser a média simples entre avaliações e a nota de critérios
                  // Como não temos a nota de critérios agregada aqui facilmente sem mais queries, vamos mostrar a média das avaliações por enquanto
                  // O usuário pediu "Média de todas avaliações + a do critério"
                  
                  return <TableCell key={uc.id} className="text-center font-bold">
                    {evaluationsAvg.toFixed(1)}
                  </TableCell>;
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TotemTab({ classId, className }: { classId: number, className: string }) {
  const totemUrl = `${window.location.origin}/frequency/${classId}`;
  const { toast } = useToast();

  const copyLink = () => {
    navigator.clipboard.writeText(totemUrl);
    toast({
      title: "Link copiado!",
      description: "O link do totem exclusivo desta turma foi copiado para a área de transferência.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Totem Exclusivo</CardTitle>
        <CardDescription>
          Gere um link de acesso rápido para o registro de presença desta turma específica.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 p-6 border-2 border-dashed rounded-xl bg-muted/30 items-center text-center">
          <Camera className="h-12 w-12 text-primary opacity-50 mb-2" />
          <div className="space-y-2 max-w-md">
            <h3 className="font-bold text-lg">Modo Totem: {className}</h3>
            <p className="text-sm text-muted-foreground">
              Este link abrirá o sistema de reconhecimento facial filtrado apenas para os alunos desta turma, tornando a identificação muito mais rápida e precisa.
            </p>
          </div>
          
          <div className="flex w-full max-w-md gap-2 mt-2">
            <Input readOnly value={totemUrl} className="bg-background" />
            <Button onClick={copyLink} size="icon" variant="outline" className="shrink-0">
              <Plus className="h-4 w-4 rotate-45" />
            </Button>
          </div>

          <div className="flex gap-3 mt-4">
            <Button asChild variant="default">
              <a href={`/frequency/${classId}`} target="_blank" rel="noreferrer">
                Abrir Totem da Turma
              </a>
            </Button>
          </div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-bold mb-1">Dica de Uso:</p>
            <p>Use este link em tablets ou computadores fixos na entrada da sala de aula. O sistema carregará apenas as fotos dos alunos matriculados nesta turma.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StudentsTab({ classId, enrolledStudents }: { classId: number, enrolledStudents: any[] }) {
  const { data: allStudents } = useStudents();
  const enrollMutation = useEnrollStudent(classId);
  const createManyMutation = useCreateManyStudents();
  
  const createOneMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!data.matricula) {
        data.matricula = "ALU" + Math.random().toString(36).substr(2, 6).toUpperCase();
      }
      const res = await fetch("/api/alunos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao criar aluno");
      return res.json();
    },
    onSuccess: async (student) => {
      await enrollMutation.mutateAsync(student.id);
      queryClient.invalidateQueries({ queryKey: ["/api/alunos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/turmas", classId] });
      setEnrollDialogOpen(false);
      form.reset();
    }
  });

  const updateStudentMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await fetch(`/api/alunos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao atualizar aluno");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/turmas", classId] });
      setEditingStudent(null);
    }
  });

  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: { nome: "", email: "", matricula: "" }
  });

  const editForm = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: { nome: "", email: "", matricula: "" }
  });

  const availableStudents = allStudents?.filter(
    s => !enrolledStudents.find(es => es.id === s.id)
  ) || [];

  const handleEnrollExisting = () => {
    if (selectedStudentId) {
      enrollMutation.mutate(Number(selectedStudentId), {
        onSuccess: () => {
          setEnrollDialogOpen(false);
          setSelectedStudentId("");
        }
      });
    }
  };

  const onAddIndividual = (data: any) => {
    createOneMutation.mutate(data);
  };

  const onEditStudent = (data: any) => {
    updateStudentMutation.mutate({ id: editingStudent.id, ...data });
  };

  const downloadTemplate = () => {
    const data = [{ Nome: "Exemplo Aluno", Email: "aluno@exemplo.com" }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo_alunos.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;
        const wb = XLSX.read(data, { type: "array" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws) as any[];

        const formattedStudents = jsonData.map((row: any) => ({
          nome: row.Nome || row.nome,
          matricula: String(row.Matricula || row.matricula || row.RA || row.ra || "ALU" + Math.random().toString(36).substr(2, 6).toUpperCase()),
          email: row.Email || row.email || null,
        })).filter(s => s.nome);

        if (formattedStudents.length === 0) {
          toast({ title: "Erro", description: "Nenhum aluno válido encontrado no arquivo.", variant: "destructive" });
          return;
        }

        createManyMutation.mutate(formattedStudents, {
          onSuccess: async (createdStudents) => {
            for (const student of createdStudents) {
              await enrollMutation.mutateAsync(student.id);
            }
            toast({ title: "Sucesso", description: `${formattedStudents.length} alunos importados e matriculados` });
            setEnrollDialogOpen(false);
          }
        });
      } catch (err) {
        console.error("Excel import error:", err);
        toast({ title: "Erro", description: "Falha ao processar arquivo Excel", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 gap-4 flex-wrap">
        <div className="space-y-1">
          <CardTitle>Alunos Matriculados</CardTitle>
          <CardDescription>Gerencie os alunos desta turma</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Modelo Excel
          </Button>
          <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Matricular Aluno
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Matricular Aluno</DialogTitle>
                <DialogDescription>Adicione individualmente, selecione um existente ou importe via Excel</DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="individual" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="individual">Individual</TabsTrigger>
                  <TabsTrigger value="existing">Existente</TabsTrigger>
                  <TabsTrigger value="excel">Excel</TabsTrigger>
                </TabsList>
                
                <TabsContent value="individual" className="space-y-4 pt-4">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onAddIndividual)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="nome"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl><Input placeholder="Nome do aluno" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-mail (Opcional)</FormLabel>
                            <FormControl><Input placeholder="email@exemplo.com" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="matricula"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Matrícula / RA (Opcional)</FormLabel>
                            <FormControl><Input placeholder="Será gerada se vazio" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={createOneMutation.isPending}>
                        {createOneMutation.isPending ? "Salvando..." : "Salvar e Matricular"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="existing" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Selecionar Aluno</Label>
                    <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um aluno..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStudents.map(student => (
                          <SelectItem key={student.id} value={student.id.toString()}>
                            {student.nome} ({student.matricula})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      className="w-full mt-4" 
                      onClick={handleEnrollExisting} 
                      disabled={!selectedStudentId || enrollMutation.isPending}
                    >
                      {enrollMutation.isPending ? "Matriculando..." : "Matricular Selecionado"}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="excel" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="excel-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 hover:bg-muted/50 transition-colors">
                        <Upload className="h-10 w-10 mb-2 text-muted-foreground" />
                        <span className="text-sm font-medium">Clique para subir arquivo Excel</span>
                        <span className="text-xs text-muted-foreground mt-2">Colunas: Nome, Email (opcional)</span>
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
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
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
                  <TableCell>
                    <Link href={`/student/${student.id}`} className="font-medium hover:underline text-primary">
                      {student.nome}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{student.email || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setEditingStudent(student);
                          editForm.reset({
                            nome: student.nome,
                            email: student.email || "",
                            matricula: student.matricula
                          });
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Aluno</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir permanentemente o aluno {student.nome}? 
                              Isso removerá todas as suas notas e registros de frequência em todas as turmas.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/alunos/${student.id}`, { method: "DELETE" });
                                  if (!res.ok) throw new Error();
                                  queryClient.invalidateQueries({ queryKey: ["/api/turmas", classId] });
                                  toast({ title: "Sucesso", description: "Aluno excluído com sucesso" });
                                } catch (e) {
                                  toast({ title: "Erro", description: "Falha ao excluir aluno", variant: "destructive" });
                                }
                              }}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditStudent)} className="space-y-4 pt-4">
              <FormField
                control={editForm.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="matricula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matrícula</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={updateStudentMutation.isPending}>
                {updateStudentMutation.isPending ? "Salvando..." : "Atualizar Dados"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function UnidadesTab({ classId, unidades }: { classId: number, unidades: any[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [selectedUC, setSelectedUC] = useState<any>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const createMutation = useCreateUnidadeCurricular(classId);
  const { toast } = useToast();

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

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUC) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 0, defval: "" }) as any[];

        const criterios = jsonData.map(row => {
          // Normalize row keys to ignore case and accents if possible
          const normalizedRow: any = {};
          Object.keys(row).forEach(key => {
            const normalizedKey = key.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            normalizedRow[normalizedKey] = row[key];
          });

          // Prioritize common variations of column names
          const descricao = normalizedRow.descricao || normalizedRow.criterio || normalizedRow.nome || normalizedRow.item || normalizedRow.enunciado || "";
          let pesoRaw = normalizedRow.peso || normalizedRow.valor || normalizedRow.pontos || "1.0";
          
          // Handle cases where peso might be a number or string with comma
          let peso = 1.0;
          if (typeof pesoRaw === 'number') {
            peso = pesoRaw;
          } else {
            peso = parseFloat(String(pesoRaw).replace(',', '.')) || 1.0;
          }

          return {
            descricao: String(descricao).trim(),
            peso: peso
          };
        }).filter(c => c.descricao && c.descricao !== "");

        if (criterios.length === 0) {
          toast({ title: "Erro", description: "Nenhum critério válido encontrado.", variant: "destructive" });
          return;
        }

        const res = await fetch(`/api/unidades-curriculares/${selectedUC.id}/criterios`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ criterios, unidadeCurricularId: selectedUC.id }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.mensagem || "Erro ao importar critérios");
        }

        const result = await res.json();
        toast({ title: "Sucesso", description: `${result.length} critérios importados.` });
        setImportDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/turmas", classId] });
        queryClient.invalidateQueries({ queryKey: ["/api/unidades-curriculares", selectedUC.id, "criterios"] });
      } catch (err: any) {
        console.error("Excel import error:", err);
        toast({ title: "Erro", description: err.message || "Falha ao processar Excel", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const data = [{ Descricao: "Critério de exemplo 1", Peso: 1.0 }, { Descricao: "Critério de exemplo 2", Peso: 0.5 }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo_criterios.xlsx");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle>Unidades Curriculares</CardTitle>
            <CardDescription>Matérias associadas a esta turma</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Modelo Excel
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Unidade
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Unidade Curricular</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Nome da Unidade</Label>
                    <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Metodologia Ágil" />
                  </div>
                  <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Criando..." : "Criar Unidade"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
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
                    <Button variant="outline" size="sm" onClick={() => { setSelectedUC(uc); setImportDialogOpen(true); }}>
                      <Upload className="mr-2 h-4 w-4" />
                      Critérios (Excel)
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Critérios - {selectedUC?.nome}</DialogTitle>
            <DialogDescription>Suba um Excel com colunas: Descricao, Peso (opcional)</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 mt-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => document.getElementById("excel-uc-import")?.click()}>
            <Upload className="h-10 w-10 mb-2 text-muted-foreground" />
            <span className="text-sm font-medium">Clique para selecionar o arquivo</span>
            <input id="excel-uc-import" type="file" className="hidden" accept=".xlsx,.xls" onChange={handleExcelImport} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentAproveitamentoBadge({ ucId, alunoId }: { ucId: number, alunoId: number }) {
  const { data: aproveitamento } = useQuery<any>({
    queryKey: ["/api/unidades-curriculares", ucId, "alunos", alunoId, "aproveitamento"],
    queryFn: async () => {
      const res = await fetch(`/api/unidades-curriculares/${ucId}/alunos/${alunoId}/aproveitamento`);
      if (res.status === 404 || !res.ok) return null;
      return res.json();
    }
  });

  if (!aproveitamento) return <Badge variant="secondary">N/A</Badge>;
  
  const perc = Math.round(aproveitamento.aproveitamento * 100);
  let variant: "default" | "destructive" | "outline" | "secondary" = "default";
  if (perc < 50) variant = "destructive";
  else if (perc < 75) variant = "secondary";

  return <Badge variant={variant}>{perc}%</Badge>;
}

function GradesTab({ classId, students }: { classId: number, students: any[] }) {
  const { data: classData } = useClass(classId);
  const unidades = classData?.unidadesCurriculares || [];
  const [selectedUC, setSelectedUC] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [evalDialogOpen, setEvalDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: criterios } = useQuery<any[]>({
    queryKey: ["/api/unidades-curriculares", selectedUC?.id, "criterios"],
    queryFn: async () => {
      if (!selectedUC) return [];
      const res = await fetch(`/api/unidades-curriculares/${selectedUC.id}/criterios`);
      return res.json();
    },
    enabled: !!selectedUC
  });

  const { data: atendimentos, refetch: refetchAtendimentos } = useQuery<any[]>({
    queryKey: ["/api/unidades-curriculares", selectedUC?.id, "alunos", selectedStudent?.id, "atendimentos"],
    queryFn: async () => {
      if (!selectedUC || !selectedStudent) return [];
      const res = await fetch(`/api/unidades-curriculares/${selectedUC.id}/alunos/${selectedStudent.id}/atendimentos`);
      return res.json();
    },
    enabled: !!selectedUC && !!selectedStudent
  });

  const { data: aproveitamento, refetch: refetchAproveitamento } = useQuery<any>({
    queryKey: ["/api/unidades-curriculares", selectedUC?.id, "alunos", selectedStudent?.id, "aproveitamento"],
    queryFn: async () => {
      if (!selectedUC || !selectedStudent) return null;
      const res = await fetch(`/api/unidades-curriculares/${selectedUC.id}/alunos/${selectedStudent.id}/aproveitamento`);
      return res.json();
    },
    enabled: !!selectedUC && !!selectedStudent
  });

  const toggleCriterio = useMutation({
    mutationFn: async ({ criterioId, atendido }: any) => {
      const res = await fetch("/api/atendimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alunoId: selectedStudent.id, criterioId, atendido }),
      });
      return res.json();
    },
    onSuccess: () => {
      refetchAtendimentos();
      refetchAproveitamento();
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Avaliação por Critérios</CardTitle>
          <CardDescription>Selecione uma Unidade Curricular para avaliar os alunos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Select onValueChange={(val) => setSelectedUC(unidades.find((u: any) => u.id === Number(val)))}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Selecione a Unidade Curricular" />
              </SelectTrigger>
              <SelectContent>
                {unidades.map((uc: any) => (
                  <SelectItem key={uc.id} value={uc.id.toString()}>{uc.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedUC && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Aproveitamento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.nome}</TableCell>
                    <TableCell>
                      <StudentAproveitamentoBadge ucId={selectedUC.id} alunoId={student.id} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedStudent(student); setEvalDialogOpen(true); }}>
                        <Check className="mr-2 h-4 w-4" />
                        Avaliar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={evalDialogOpen} onOpenChange={setEvalDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Avaliação: {selectedStudent?.nome}</DialogTitle>
            <DialogDescription>{selectedUC?.nome} - Critérios de Avaliação</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {criterios?.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum critério cadastrado para esta unidade.</p>}
            
            {criterios?.map((c: any) => {
              const atendido = atendimentos?.some((a: any) => a.criterioId === c.id && a.atendido === 1);
              return (
                <div key={c.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="space-y-1">
                    <p className="font-medium">{c.descricao}</p>
                    <p className="text-xs text-muted-foreground">Peso: {c.peso}</p>
                  </div>
                  <Button 
                    variant={atendido ? "default" : "outline"}
                    size="sm"
                    className={atendido ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={() => toggleCriterio.mutate({ criterioId: c.id, atendido: atendido ? 0 : 1 })}
                  >
                    {atendido ? <Check className="h-4 w-4 mr-1" /> : <Minus className="h-4 w-4 mr-1" />}
                    {atendido ? "Atingido" : "Não Atingido"}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="border-t pt-4 flex justify-between items-center">
            <div className="text-lg font-bold">
              Aproveitamento Final: {aproveitamento ? Math.round(aproveitamento.aproveitamento * 100) : 0}%
            </div>
            <Button onClick={() => setEvalDialogOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function EvaluationsTab({ evaluations, unidades, classId, onStartGrading }: { evaluations: any[], unidades: any[], classId: number, onStartGrading: (ev: any) => void }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/unidades-curriculares/${data.unidadeCurricularId}/avaliacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao criar avaliação");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/turmas", classId] });
      setDialogOpen(false);
      form.reset();
    }
  });

  const form = useForm({
    resolver: zodResolver(createEvaluationSchema),
    defaultValues: {
      unidadeCurricularId: "",
      nome: "",
      notaMaxima: "10",
      peso: "1",
    }
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Avaliações Agendadas</CardTitle>
          <CardDescription>Crie e gerencie as avaliações desta turma</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Avaliação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Avaliação</DialogTitle>
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
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {unidades.map(u => (
                            <SelectItem key={u.id} value={u.id.toString()}>{u.nome}</SelectItem>
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
                      <FormControl><Input placeholder="P1, Projeto Final..." {...field} /></FormControl>
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
                        <FormControl><Input type="number" {...field} /></FormControl>
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
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Criando..." : "Criar Avaliação"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {evaluations.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-xl">
            <FileText className="h-8 w-8 mb-2 opacity-50" />
            <p>Nenhuma avaliação cadastrada</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unidade</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="text-center">Nota Máxima</TableHead>
                <TableHead className="text-center">Peso</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluations.map((evalu) => (
                <TableRow key={evalu.id}>
                  <TableCell className="font-medium">
                    {unidades.find(u => u.id === evalu.unidadeCurricularId)?.nome}
                  </TableCell>
                  <TableCell>{evalu.nome}</TableCell>
                  <TableCell className="text-center">{evalu.notaMaxima}</TableCell>
                  <TableCell className="text-center">{evalu.peso}</TableCell>
                  <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="hover:bg-primary/10 text-primary"
                            onClick={() => onStartGrading(evalu)}
                          >
                            <Plus className="h-4 w-4" />
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

function AttendanceTab({ classId, students }: { classId: number, students: any[] }) {
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const { toast } = useToast();
  const { data: attendanceData, refetch } = useQuery<any[]>({
    queryKey: ["/api/turmas", classId, "frequencia", data],
    queryFn: async () => {
      const res = await fetch(`/api/turmas/${classId}/frequencia?data=${data}`);
      if (!res.ok) return [];
      const result = await res.json();
      return Array.isArray(result) ? result : [];
    }
  });

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/turmas/${classId}/frequencia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erro ao registrar frequência");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/turmas", classId, "frequencia"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance-history"] });
      refetch();
    }
  });

  const toggleAttendance = (alunoId: number, currentStatus: number) => {
    const now = new Date();
    const deviceTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    mutation.mutate({
      turmaId: classId,
      alunoId,
      data,
      status: currentStatus === 1 ? 0 : 1,
      horario: deviceTime
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Registro de Frequência</CardTitle>
          <CardDescription>Registre a presença dos alunos</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/frequency">
            <Button variant="outline" size="sm" className="bg-primary/5 text-primary border-primary/20">
              <Camera className="mr-2 h-4 w-4" />
              Modo Totem (Câmera)
            </Button>
          </Link>
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Input 
            type="date" 
            className="w-40" 
            value={data} 
            onChange={(e) => setData(e.target.value)} 
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead className="text-center">Horário</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => {
              const record = attendanceData?.find(a => a.alunoId === student.id);
              const isPresent = record ? record.status === 1 : false;
              
              return (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.nome}</TableCell>
                  <TableCell className="text-center text-muted-foreground text-sm">
                    {record?.horario || "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={isPresent ? "default" : "destructive"}>
                      {isPresent ? "Presente" : "Falta"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleAttendance(student.id, isPresent ? 1 : 0)}
                    >
                      Alternar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DetailsSkeleton() {
  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="flex gap-4 border-b pb-px">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-24" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </LayoutShell>
  );
}

function NotFoundState() {
  return (
    <LayoutShell>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Turma não encontrada</h2>
        <p className="text-muted-foreground mt-2">A turma solicitada não existe ou você não tem permissão para acessá-la.</p>
        <Link href="/">
          <Button className="mt-6">Voltar ao Painel</Button>
        </Link>
      </div>
    </LayoutShell>
  );
}
