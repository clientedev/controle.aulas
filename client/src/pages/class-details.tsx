import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ArrowLeft, Plus, Trash2, UserPlus, FileText, AlertCircle, 
  Users, MoreHorizontal, Upload, BookOpen, Clock, Check, X, Minus 
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
              evaluations={classData.avaliacoes || []} 
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

function EvaluationsTab({ evaluations, unidades, classId }: { evaluations: any[], unidades: any[], classId: number }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  
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
      queryClient.invalidateQueries({ queryKey: [api.turmas.obter.path, { id: classId }] });
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
            <p>Nenhuma avaliação criada ainda</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Nota Máx.</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluations.map((eval_item) => {
                const uc = unidades.find(u => u.id === eval_item.unidadeCurricularId);
                return (
                  <TableRow key={eval_item.id}>
                    <TableCell className="font-medium">{eval_item.nome}</TableCell>
                    <TableCell>{uc?.nome || "-"}</TableCell>
                    <TableCell>{eval_item.notaMaxima}</TableCell>
                    <TableCell>{eval_item.peso}</TableCell>
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

function AttendanceTab({ classId, students }: { classId: number, students: any[] }) {
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  
  const { data: schedule } = useQuery<any[]>({
    queryKey: ["/api/turmas", classId, "horarios"],
    queryFn: async () => {
      const res = await fetch(`/api/turmas/${classId}/horarios`);
      return res.json();
    }
  });

  const { data: attendanceData, refetch: refetchAttendance } = useQuery<any[]>({
    queryKey: ["/api/turmas", classId, "frequencia", date],
    queryFn: async () => {
      const res = await fetch(`/api/turmas/${classId}/frequencia?data=${date}`);
      return res.json();
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/turmas/${classId}/frequencia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => refetchAttendance()
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/turmas/${classId}/horarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/turmas", classId, "horarios"] });
      setShowScheduleDialog(false);
    }
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/horarios/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/turmas", classId, "horarios"] })
  });

  const daysOfWeek = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  const getStatus = (studentId: number) => {
    return attendanceData?.find(a => a.alunoId === studentId)?.status;
  };

  const handleStatusChange = (studentId: number, status: string) => {
    registerMutation.mutate({
      alunoId: studentId,
      turmaId: classId,
      data: date,
      status
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="w-48"
          />
          <Badge variant="outline" className="h-9 px-3">
            {format(new Date(date + "T00:00:00"), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </Badge>
        </div>
        <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              Configurar Horários
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Horários da Turma</DialogTitle>
              <DialogDescription>Defina os dias e horários das aulas</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-4">
                {schedule?.map((h) => (
                  <div key={h.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div>
                      <span className="font-semibold">{daysOfWeek[h.diaSemana]}</span>
                      <p className="text-sm text-muted-foreground">{h.horarioInicio} - {h.horarioFim}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteScheduleMutation.mutate(h.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createScheduleMutation.mutate({
                  diaSemana: Number(formData.get("diaSemana")),
                  horarioInicio: formData.get("inicio"),
                  horarioFim: formData.get("fim")
                });
              }} className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dia da Semana</Label>
                    <Select name="diaSemana" defaultValue="1">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {daysOfWeek.map((day, i) => (
                          <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Horário Início</Label>
                    <Input name="inicio" type="time" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Horário Fim</Label>
                    <Input name="fim" type="time" required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createScheduleMutation.isPending}>
                  Adicionar Horário
                </Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chamada</CardTitle>
          <CardDescription>Registre a presença dos alunos para este dia</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead className="text-center w-[300px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const status = getStatus(student.id);
                return (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{student.nome}</span>
                        <span className="text-xs text-muted-foreground">{student.matricula}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-2">
                        <Button 
                          size="sm" 
                          variant={status === "presente" ? "default" : "outline"}
                          className={status === "presente" ? "bg-green-600 hover:bg-green-700" : "hover:text-green-600 hover:border-green-600"}
                          onClick={() => handleStatusChange(student.id, "presente")}
                        >
                          <Check className="mr-1 h-3 w-3" /> Presença
                        </Button>
                        <Button 
                          size="sm" 
                          variant={status === "atraso" ? "default" : "outline"}
                          className={status === "atraso" ? "bg-yellow-600 hover:bg-yellow-700" : "hover:text-yellow-600 hover:border-yellow-600"}
                          onClick={() => handleStatusChange(student.id, "atraso")}
                        >
                          <Clock className="mr-1 h-3 w-3" /> Atraso
                        </Button>
                        <Button 
                          size="sm" 
                          variant={status === "falta" ? "default" : "outline"}
                          className={status === "falta" ? "bg-destructive hover:bg-destructive/90" : "hover:text-destructive hover:border-destructive"}
                          onClick={() => handleStatusChange(student.id, "falta")}
                        >
                          <X className="mr-1 h-3 w-3" /> Falta
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function GradesTab({ classId, students, evaluations }: { classId: number, students: any[], evaluations: any[] }) {
  const { data: grades } = useClassGrades(classId);
  const updateGradeMutation = useUpdateGrade();

  const handleGradeChange = (studentId: number, evaluationId: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      updateGradeMutation.mutate({
        alunoId: studentId,
        avaliacaoId: evaluationId,
        valor: numValue
      });
    }
  };

  const getGradeValue = (studentId: number, evaluationId: number) => {
    const grade = grades?.find(g => g.alunoId === studentId && g.avaliacaoId === evaluationId);
    return grade ? grade.valor.toString() : "";
  };

  const calculateStudentAverage = (studentId: number) => {
    let weightedSum = 0;
    let totalWeight = 0;

    evaluations.forEach(e => {
      const grade = grades?.find(g => g.alunoId === studentId && g.avaliacaoId === e.id);
      if (grade) {
        const normalizedScore = (grade.valor / e.notaMaxima) * 10;
        weightedSum += normalizedScore * e.peso;
        totalWeight += e.peso;
      }
    });

    return totalWeight > 0 ? (weightedSum / totalWeight).toFixed(1) : "-";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quadro de Notas</CardTitle>
        <CardDescription>Notas normalizadas (0-10) baseadas no peso</CardDescription>
      </CardHeader>
      <CardContent>
        {evaluations.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-xl">
            <FileText className="h-8 w-8 mb-2 opacity-50" />
            <p>Nenhuma avaliação para exibir notas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Aluno</TableHead>
                  {evaluations.map(e => (
                    <TableHead key={e.id} className="text-center min-w-[100px]">
                      {e.nome}
                      <div className="text-[10px] text-muted-foreground">Max: {e.notaMaxima} | Peso: {e.peso}</div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-bold">Média Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(student => {
                  const finalAverage = calculateStudentAverage(student.id);
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.nome}</TableCell>
                      {evaluations.map(e => (
                        <TableCell key={e.id} className="p-1">
                          <Input
                            type="number"
                            step="0.1"
                            className="h-8 text-center"
                            defaultValue={getGradeValue(student.id, e.id)}
                            onBlur={(evt) => handleGradeChange(student.id, e.id, evt.target.value)}
                          />
                        </TableCell>
                      ))}
                      <TableCell className={`text-center font-bold ${finalAverage !== "-" && Number(finalAverage) >= 6 ? "text-green-600" : "text-destructive"}`}>
                        {finalAverage}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
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
        <Skeleton className="h-[400px] w-full rounded-xl" />
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
        <p className="text-muted-foreground mt-2">A turma que você está procurando não existe ou foi removida.</p>
        <Link href="/">
          <Button className="mt-6">Voltar para o Início</Button>
        </Link>
      </div>
    </LayoutShell>
  );
}
