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
                <Button variant="ghost" size="sm" onClick={() => {
                  setIsEditingClass(true);
                  classForm.reset({
                    nome: classData.nome,
                    ano: classData.ano.toString(),
                    semestre: classData.semestre.toString(),
                  });
                }}>
                  <Pencil className="h-4 w-4" />
                </Button>
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

        <Dialog open={isEditingClass} onOpenChange={setIsEditingClass}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Turma</DialogTitle>
            </DialogHeader>
            <Form {...classForm}>
              <form onSubmit={classForm.handleSubmit((data) => updateClassMutation.mutate({
                ...data,
                ano: parseInt(data.ano),
                semestre: parseInt(data.semestre)
              }))} className="space-y-4 pt-4">
                <FormField
                  control={classForm.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Turma</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={classForm.control}
                    name="ano"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ano</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={classForm.control}
                    name="semestre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Semestre</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1º Semestre</SelectItem>
                            <SelectItem value="2">2º Semestre</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={updateClassMutation.isPending}>
                  {updateClassMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

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
          </TabsList>

          <TabsContent value="students" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <StudentsTab enrolledStudents={classData.alunos || []} classId={classId} />
          </TabsContent>

          <TabsContent value="unidades" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <UnidadesTab classId={classId} unidades={classData.unidadesCurriculares || []} />
          </TabsContent>

          <TabsContent value="evaluations" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <EvaluationsTab 
              evaluations={(classData as any).avaliacoes || []} 
              unidades={classData.unidadesCurriculares || []} 
              classId={classId}
            />
          </TabsContent>

          <TabsContent value="attendance" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <AttendanceTab classId={classId} students={classData.alunos || []} />
          </TabsContent>

          <TabsContent value="grades" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <GradesTab 
              classId={classId} 
              students={classData.alunos || []} 
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
                  <TableCell className="font-medium">{student.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{student.email || "-"}</TableCell>
                  <TableCell className="text-right">
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
            const normalizedKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            normalizedRow[normalizedKey] = row[key];
          });

          return {
            descricao: normalizedRow.descricao || normalizedRow.criterio || normalizedRow.nome || normalizedRow.item || "",
            peso: parseFloat(String(normalizedRow.peso || normalizedRow.valor).replace(',', '.')) || 1.0
          };
        }).filter(c => c.descricao && String(c.descricao).trim() !== "");

        if (criterios.length === 0) {
          toast({ title: "Erro", description: "Nenhum critério válido encontrado.", variant: "destructive" });
          return;
        }

        const res = await fetch(`/api/unidades-curriculares/${selectedUC.id}/criterios`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ criterios }),
        });

        if (!res.ok) throw new Error("Erro ao importar critérios");

        toast({ title: "Sucesso", description: `${criterios.length} critérios importados.` });
        setImportDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/turmas", classId] });
      } catch (err) {
        console.error("Excel import error:", err);
        toast({ title: "Erro", description: "Falha ao processar Excel", variant: "destructive" });
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
function EvaluationsTab({ evaluations, unidades, classId }: { evaluations: any[], unidades: any[], classId: number }) {
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
    const deviceTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    mutation.mutate({
      turmaId: classId,
      alunoId,
      data,
      status: currentStatus === 1 ? 0 : 1,
      horario: deviceTime,
      metodo: "manual"
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
              <TableHead className="text-center">Método</TableHead>
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
                    {record?.metodo === "facial" ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Facial</Badge>
                    ) : record?.metodo === "manual" ? (
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Manual</Badge>
                    ) : "-"}
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
