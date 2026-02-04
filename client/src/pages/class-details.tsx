import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ArrowLeft, Plus, Trash2, UserPlus, FileText, AlertCircle, 
  Users, MoreHorizontal, Upload, BookOpen, Clock, Check, X, Minus, Download, Pencil, Camera, Monitor, GripVertical,
  ClipboardList, History, Layout, Save
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useClass, useDeleteClass } from "@/hooks/use-classes";
import { useStudents, useEnrollStudent, useCreateManyStudents } from "@/hooks/use-students";
import { useClassGrades, useUpdateGrade } from "@/hooks/use-grades";
import { useUnidadesCurriculares, useCreateUnidadeCurricular } from "@/hooks/use-unidades-curriculares";
import { LayoutShell } from "@/components/layout-shell";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  unidadeCurricularId: z.string().optional(),
  nome: z.string().min(2, "Nome obrigatório"),
  notaMaxima: z.string().transform(val => parseFloat(val) || 100),
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
      queryClient.invalidateQueries({ queryKey: [api.turmas.obter.path, classId] });
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
            Critérios de Avaliação
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
            <TabsTrigger 
              value="mapa-sala" 
              className="rounded-none border-b-2 border-transparent px-4 py-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
              data-testid="tab-mapa-sala"
            >
              Mapa de Sala
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <StudentsTab enrolledStudents={classData.alunos || []} classId={classId} />
          </TabsContent>

          <TabsContent value="unidades" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            {classData.unidadesCurriculares && (
              <UnidadesTab classId={classId} unidades={classData.unidadesCurriculares} />
            )}
          </TabsContent>

          <TabsContent value="evaluations" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
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

          <TabsContent value="grading" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            {gradingEvaluation && (
              <GradingView 
                evaluation={gradingEvaluation} 
                students={classData.alunos || []}
                onBack={() => setActiveTab("evaluations")}
              />
            )}
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

          <TabsContent value="final-grades" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <FinalGradesTab 
              classId={classId}
              students={classData.alunos || []}
              unidades={classData.unidadesCurriculares || []}
              evaluations={(classData as any).avaliacoes || []}
            />
          </TabsContent>

          <TabsContent value="totem" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <TotemTab classId={classId} className={classData.nome} />
          </TabsContent>

          <TabsContent value="mapa-sala" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <MapaSalaTab classId={classId} students={classData.alunos || []} />
          </TabsContent>
        </Tabs>
      </div>
    </LayoutShell>
  );
}

function GradingView({ evaluation, students, onBack }: { evaluation: any, students: any[], onBack: () => void }) {
  const { id } = useParams<{ id: string }>();
  const classId = Number(id);
  const updateGradeMutation = useUpdateGrade(classId);
  const { data: existingGrades } = useClassGrades(classId); 
  const { toast } = useToast();
  const [grades, setGrades] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize grades with existing values
  useEffect(() => {
    if (existingGrades) {
      const initialGrades: Record<number, string> = {};
      existingGrades
        .filter((g: any) => g.avaliacaoId === evaluation.id)
        .forEach((g: any) => {
          initialGrades[g.alunoId] = g.valor.toString();
        });
      setGrades(initialGrades);
    }
  }, [existingGrades, evaluation.id]);

  const handleUpdate = (studentId: number, valor: string) => {
    setGrades(prev => ({ ...prev, [studentId]: valor }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const promises = Object.entries(grades).map(([studentId, valor]) => {
        const numValor = parseFloat(valor);
        if (!isNaN(numValor)) {
          return updateGradeMutation.mutateAsync({
            alunoId: parseInt(studentId),
            avaliacaoId: evaluation.id,
            valor: numValor
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      toast({
        title: "Sucesso",
        description: "Notas salvas com sucesso!",
      });
      onBack();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao salvar algumas notas.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Lançar Critérios: {evaluation.nome}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack} disabled={isSaving}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button onClick={handleSaveAll} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar Critérios"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Critério (Máx: {evaluation.notaMaxima})</TableHead>
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
      <CardFooter className="flex justify-end p-6 border-t">
        <Button onClick={handleSaveAll} disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar Critérios"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function EditableGradeCell({ studentId, evaluationId, currentValue, maxValue, classId }: { studentId: number, evaluationId: number, currentValue: number | undefined, maxValue: number, classId: number }) {
  const [value, setValue] = useState(currentValue?.toString() ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const updateGradeMutation = useUpdateGrade(classId);
  const { toast } = useToast();

  useEffect(() => {
    setValue(currentValue?.toString() ?? "");
  }, [currentValue]);

  const handleSave = async () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setValue(currentValue?.toString() ?? "");
      setIsEditing(false);
      return;
    }
    
    if (numValue !== currentValue) {
      try {
        await updateGradeMutation.mutateAsync({
          alunoId: studentId,
          avaliacaoId: evaluationId,
          valor: numValue
        });
      } catch (error) {
        toast({ title: "Erro", description: "Falha ao salvar nota", variant: "destructive" });
        setValue(currentValue?.toString() ?? "");
      }
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        type="number"
        className="w-16 h-7 text-center p-1"
        value={value}
        max={maxValue}
        min={0}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setValue(currentValue?.toString() ?? "");
            setIsEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span 
      className="cursor-pointer hover:bg-muted px-2 py-1 rounded transition-colors"
      onClick={() => setIsEditing(true)}
      title="Clique para editar"
    >
      {currentValue !== undefined ? Number(currentValue).toFixed(1) : "-"}
    </span>
  );
}

function FinalGradesTab({ classId, students, unidades, evaluations: initialEvaluations }: { classId: number, students: any[], unidades: any[], evaluations: any[] }) {
  const { data: grades } = useClassGrades(classId);
  
  const evaluations = initialEvaluations.map(ev => {
    const uc = unidades.find(u => u.id === ev.unidadeCurricularId);
    return {
      ...ev,
      ucNome: uc?.nome || "Geral"
    };
  });
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Média Final e Aproveitamento</CardTitle>
          <CardDescription>Notas por avaliação, aproveitamento por UC e média final</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto relative border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px] sticky left-0 bg-background z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Aluno</TableHead>
                
                {/* Colunas de Avaliações */}
                {evaluations.map(ev => (
                  <TableHead key={`ev-${ev.id}`} className="text-center min-w-[120px] border-r bg-muted/30">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{ev.ucNome}</span>
                      <span className="text-sm font-bold">{ev.nome}</span>
                    </div>
                  </TableHead>
                ))}

                {/* Colunas de Aproveitamento por UC */}
                {unidades.map(uc => (
                  <TableHead key={`uc-${uc.id}`} className="text-center min-w-[120px] border-r bg-primary/5">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-primary font-semibold uppercase tracking-wider">Aproveitamento</span>
                      <span className="text-sm font-bold">{uc.nome}</span>
                    </div>
                  </TableHead>
                ))}

                <TableHead className="text-center font-bold min-w-[100px] sticky right-0 bg-background z-20 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">Média Final</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map(student => {
                const studentGrades = grades?.filter((g: any) => g.alunoId === student.id) || [];
                
                const gradesByEval: Record<number, number> = {};
                studentGrades.forEach((g: any) => {
                  gradesByEval[g.avaliacaoId] = g.valor;
                });

                // Calcular média das avaliações
                const evalValues = Object.values(gradesByEval);
                const evalsAvg = evalValues.length > 0
                  ? (evalValues.reduce((acc, val) => acc + val, 0) / evalValues.length)
                  : 0;

                return (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{student.nome}</TableCell>
                    
                    {/* Notas das Avaliações - Editáveis */}
                    {evaluations.map(ev => {
                      const grade = gradesByEval[ev.id];
                      return (
                        <TableCell key={`grade-${student.id}-${ev.id}`} className="text-center border-r">
                          <EditableGradeCell
                            studentId={student.id}
                            evaluationId={ev.id}
                            currentValue={grade}
                            maxValue={ev.notaMaxima}
                            classId={classId}
                          />
                        </TableCell>
                      );
                    })}

                    {/* Aproveitamento das UCs */}
                    {unidades.map(uc => (
                      <TableCell key={`apr-${student.id}-${uc.id}`} className="text-center border-r">
                        <StudentAproveitamentoValue ucId={uc.id} alunoId={student.id} />
                      </TableCell>
                    ))}

                    <TableCell className="text-center font-bold text-primary sticky right-0 bg-background z-10 border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <FinalAverageValue 
                        alunoId={student.id} 
                        evalsAvg={evalsAvg} 
                        unidades={unidades} 
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function StudentAproveitamentoValue({ ucId, alunoId }: { ucId: number, alunoId: number }) {
  const { data: aproveitamento } = useQuery<any>({
    queryKey: ["/api/unidades-curriculares", ucId, "alunos", alunoId, "aproveitamento"],
    queryFn: async () => {
      const res = await fetch(`/api/unidades-curriculares/${ucId}/alunos/${alunoId}/aproveitamento`);
      if (res.status === 404 || !res.ok) return null;
      return res.json();
    }
  });

  if (!aproveitamento) return <span className="text-muted-foreground">-</span>;
  const perc = Math.round(aproveitamento.aproveitamento * 100);
  return <span className={perc < 50 ? "text-destructive font-medium" : "font-medium"}>{perc}%</span>;
}

function FinalAverageValue({ alunoId, evalsAvg, unidades }: { alunoId: number, evalsAvg: number, unidades: any[] }) {
  // Buscar aproveitamentos de todas as UCs do aluno
  const aproveitamentos = useQuery({
    queryKey: ["final-average", alunoId],
    queryFn: async () => {
      const results = await Promise.all(
        unidades.map(async (uc) => {
          const res = await fetch(`/api/unidades-curriculares/${uc.id}/alunos/${alunoId}/aproveitamento`);
          if (res.status === 404 || !res.ok) return 0;
          const data = await res.json();
          return data.aproveitamento * 100;
        })
      );
      return results;
    }
  });

  if (aproveitamentos.isLoading) return <span className="animate-pulse">...</span>;

  const aprValues = aproveitamentos.data || [];
  const aprAvg = aprValues.length > 0 
    ? aprValues.reduce((a, b) => a + b, 0) / aprValues.length 
    : 0;

  // Média final é a média entre a média das avaliações e a média dos aproveitamentos das UCs
  let finalGrade = 0;
  if (evalsAvg > 0 && aprAvg > 0) {
    finalGrade = (evalsAvg + aprAvg) / 2;
  } else if (evalsAvg > 0) {
    finalGrade = evalsAvg;
  } else if (aprAvg > 0) {
    finalGrade = aprAvg;
  }

  return finalGrade > 0 ? <span>{finalGrade.toFixed(1)}</span> : <span>-</span>;
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
      queryClient.invalidateQueries({ queryKey: [api.turmas.obter.path, classId] });
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
      queryClient.invalidateQueries({ queryKey: [api.turmas.obter.path, classId] });
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
                                  queryClient.invalidateQueries({ queryKey: [api.turmas.obter.path, classId] });
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
        queryClient.invalidateQueries({ queryKey: [api.turmas.obter.path, classId] });
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/avaliacoes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir avaliação");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.turmas.obter.path, classId] });
      queryClient.invalidateQueries({ queryKey: [api.notas.listarPorTurma.path, classId] });
      toast({ title: "Sucesso", description: "Avaliação excluída com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao excluir avaliação", variant: "destructive" });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/turmas/${classId}/avaliacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao criar avaliação");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.turmas.obter.path, classId] });
      // Invalida também a listagem de notas para garantir que a tabela de notas finais atualize
      queryClient.invalidateQueries({ queryKey: [api.notas.listarPorTurma.path, classId] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Avaliação criada e notas inicializadas para os alunos.",
      });
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
    const payload = {
      ...data,
      unidadeCurricularId: data.unidadeCurricularId === "none" ? null : data.unidadeCurricularId
    };
    createMutation.mutate(payload);
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
            <DialogDescription>
              Preencha os dados abaixo para criar uma nova avaliação para esta turma.
            </DialogDescription>
          </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
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
                <FormField
                  control={form.control}
                  name="unidadeCurricularId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade Curricular (Opcional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma (Geral)</SelectItem>
                          {unidades.map(u => (
                            <SelectItem key={u.id} value={u.id.toString()}>{u.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                <TableHead>Nome</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-center">Nota Máxima</TableHead>
                <TableHead className="text-center">Peso</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluations.map((evalu) => {
                const uc = unidades.find(u => u.id === evalu.unidadeCurricularId);
                return (
                  <TableRow key={evalu.id}>
                    <TableCell className="font-medium">{evalu.nome}</TableCell>
                    <TableCell>
                      {uc ? <Badge variant="outline">{uc.nome}</Badge> : <Badge variant="secondary">Geral</Badge>}
                    </TableCell>
                    <TableCell className="text-center">{evalu.notaMaxima}</TableCell>
                    <TableCell className="text-center">{evalu.peso}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="hover:bg-primary/10 text-primary"
                          onClick={() => onStartGrading(evalu)}
                          data-testid={`button-grade-evaluation-${evalu.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="hover:bg-destructive/10 text-destructive"
                              data-testid={`button-delete-evaluation-${evalu.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Avaliação</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a avaliação "{evalu.nome}"? Todas as notas associadas também serão excluídas. Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteMutation.mutate(evalu.id)}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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

interface ComputadorData {
  id: number;
  numero: number;
  posX: number;
  posY: number;
  alunoId: number | null;
  aluno?: { id: number; nome: string };
}

interface SalaData {
  id: number;
  turmaId: number;
  nome: string;
  computadores: ComputadorData[];
}

function MapaSalaTab({ classId, students }: { classId: number; students: any[] }) {
  const { toast } = useToast();
  const [nomeSala, setNomeSala] = useState("");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedComp, setSelectedComp] = useState<any | null>(null);
  const [showOccurrenceDialog, setShowOccurrenceDialog] = useState(false);
  const [newOccurrence, setNewOccurrence] = useState("");
  const [anotacoes, setAnotacoes] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const { data: salaData, isLoading, refetch } = useQuery<SalaData>({
    queryKey: ["/api/turmas", classId, "sala"],
    queryFn: async () => {
      const res = await fetch(`/api/turmas/${classId}/sala`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Erro ao carregar sala");
      const data = await res.json();
      return data;
    },
    refetchInterval: 5000
  });

  useEffect(() => {
    if (salaData?.anotacoes) {
      setAnotacoes(salaData.anotacoes);
    }
  }, [salaData]);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { data: frequenciaHoje } = useQuery<any[]>({
    queryKey: ["/api/turmas", classId, "frequencia", todayStr],
    queryFn: async () => {
      const res = await fetch(`/api/turmas/${classId}/frequencia?data=${todayStr}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!salaData
  });

  const criarSalaMutation = useMutation({
    mutationFn: async (nome: string) => {
      const res = await fetch(`/api/turmas/${classId}/sala`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nome })
      });
      if (!res.ok) throw new Error("Erro ao criar sala");
      return res.json();
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Sucesso", description: "Sala criada!" });
    }
  });

  const adicionarComputadorMutation = useMutation({
    mutationFn: async (data: { numero: number; posX: number; posY: number }) => {
      const res = await fetch(`/api/salas/${salaData!.id}/computadores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Erro ao adicionar computador");
      return res.json();
    },
    onSuccess: () => refetch()
  });

  const atualizarComputadorMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; posX?: number; posY?: number; alunoId?: number | null }) => {
      const res = await fetch(`/api/computadores/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Erro ao atualizar computador");
      return res.json();
    },
    onSuccess: () => refetch()
  });

  const excluirComputadorMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/computadores/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) throw new Error("Erro ao excluir computador");
    },
    onSuccess: () => refetch()
  });

  const addOccurrenceMutation = useMutation({
    mutationFn: async ({ compId, desc }: { compId: number, desc: string }) => {
      const res = await fetch(`/api/computadores/${compId}/ocorrencias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ descricao: desc })
      });
      return res.json();
    },
    onSuccess: () => {
      refetch();
      setNewOccurrence("");
      toast({ title: "Sucesso", description: "Ocorrência registrada!" });
    }
  });

  const resolveOccurrenceMutation = useMutation({
    mutationFn: async ({ id, resolvido }: { id: number, resolvido: number }) => {
      const res = await fetch(`/api/ocorrencias/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ resolvido })
      });
      return res.json();
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Sucesso", description: "Status atualizado!" });
    }
  });

  const [bulkRows, setBulkRows] = useState("1");
  const [bulkCols, setBulkCols] = useState("1");
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  const bulkAddMutation = useMutation({
    mutationFn: async (payload: { salaId: number; rows: number; cols: number }) => {
      const res = await fetch(`/api/salas/${payload.salaId}/computadores/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload.rows, cols: payload.cols }),
      });
      if (!res.ok) throw new Error("Erro ao adicionar computadores em massa");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.turmas.obter.path, classId] });
      setIsBulkAdding(false);
      toast({ title: "Sucesso", description: "Computadores adicionados com sucesso!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  });

  const handleBulkAdd = () => {
    if (!salaData) return;
    bulkAddMutation.mutate({
      salaId: salaData.id,
      rows: parseInt(bulkRows) || 1,
      cols: parseInt(bulkCols) || 1
    });
  };

  const saveAnotacoesMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/salas/${salaData!.id}/anotacoes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ anotacoes: text })
      });
      return res.json();
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Sucesso", description: "Anotações salvas!" });
    }
  });

  const getStatusColor = (comp: any): string => {
    const temOcorrenciaAtiva = comp.ocorrencias?.some((o: any) => o.resolvido === 0);
    if (temOcorrenciaAtiva) return "bg-amber-500 border-amber-600";

    if (!comp.alunoId) return "bg-gray-400 border-gray-500";
    if (!frequenciaHoje || frequenciaHoje.length === 0) return "bg-red-500 border-red-600";
    const statusAluno = frequenciaHoje.find((f: any) => f.alunoId === comp.alunoId);
    if (!statusAluno) return "bg-red-500 border-red-600";
    return statusAluno.status === 1 ? "bg-green-500 border-green-600" : "bg-red-500 border-red-600";
  };

  const handleMouseDown = (e: React.MouseEvent, comp: ComputadorData) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setDraggingId(comp.id);
    setDragOffset({
      x: e.clientX - rect.left - comp.posX,
      y: e.clientY - rect.top - comp.posY
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(rect.width - 80, e.clientX - rect.left - dragOffset.x));
    const newY = Math.max(0, Math.min(rect.height - 80, e.clientY - rect.top - dragOffset.y));
    const compDiv = document.getElementById(`comp-${draggingId}`);
    if (compDiv) {
      compDiv.style.left = `${newX}px`;
      compDiv.style.top = `${newY}px`;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (draggingId === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(rect.width - 80, e.clientX - rect.left - dragOffset.x));
    const newY = Math.max(0, Math.min(rect.height - 80, e.clientY - rect.top - dragOffset.y));
    atualizarComputadorMutation.mutate({ id: draggingId, posX: Math.round(newX), posY: Math.round(newY) });
    setDraggingId(null);
  };

  const adicionarNovoComputador = () => {
    if (!salaData) return;
    const maxNumero = salaData.computadores.reduce((max, c) => Math.max(max, c.numero), 0);
    adicionarComputadorMutation.mutate({ numero: maxNumero + 1, posX: 100 + (maxNumero * 20) % 300, posY: 100 + Math.floor(maxNumero / 5) * 100 });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!salaData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Criar Mapa de Sala
          </CardTitle>
          <CardDescription>Configure o layout da sala de aula para esta turma</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              placeholder="Nome da sala (ex: Laboratório 01)"
              value={nomeSala}
              onChange={(e) => setNomeSala(e.target.value)}
              data-testid="input-nome-sala"
            />
            <Button 
              onClick={() => nomeSala && criarSalaMutation.mutate(nomeSala)}
              disabled={!nomeSala || criarSalaMutation.isPending}
              data-testid="button-criar-sala"
            >
              <Plus className="h-4 w-4 mr-2" /> Criar Sala
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const alunosNaoAtribuidos = students.filter(s => !salaData.computadores.find(c => c.alunoId === s.id));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              {salaData.nome}
            </CardTitle>
            <CardDescription>Arraste os computadores para posicioná-los. Clique para gerenciar alunos e ocorrências.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <ClipboardList className="h-4 w-4 mr-2" /> Anotações
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Anotações da Sala</DialogTitle>
                </DialogHeader>
                <Textarea 
                  className="min-h-[200px]"
                  placeholder="Notas gerais sobre a sala..."
                  value={anotacoes}
                  onChange={(e) => setAnotacoes(e.target.value)}
                />
                <DialogFooter>
                  <Button onClick={() => saveAnotacoesMutation.mutate(anotacoes)}>
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={adicionarNovoComputador} data-testid="button-adicionar-computador">
              <Plus className="h-4 w-4 mr-2" /> Adicionar Computador
            </Button>
            
            <Dialog open={isBulkAdding} onOpenChange={setIsBulkAdding}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Layout className="h-4 w-4 mr-2" /> Em Massa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar em Massa</DialogTitle>
                  <DialogDescription>
                    Informe linhas e colunas para organizar os novos PCs.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Linhas</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={bulkRows} 
                      onChange={(e) => setBulkRows(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Colunas</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={bulkCols} 
                      onChange={(e) => setBulkCols(e.target.value)} 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsBulkAdding(false)}>Cancelar</Button>
                  <Button onClick={handleBulkAdd} disabled={bulkAddMutation.isPending}>
                    {bulkAddMutation.isPending ? "Adicionando..." : "Confirmar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-gray-400" /> Sem aluno</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-500" /> Ausente</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-500" /> Presente</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-amber-500" /> Ocorrência</div>
          </div>
          <div 
            ref={canvasRef}
            className="relative border-2 border-dashed rounded-lg bg-muted/50"
            style={{ height: "800px", minWidth: "100%" }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setDraggingId(null)}
            data-testid="canvas-sala"
          >
            {salaData.computadores.map((comp: any) => (
              <div
                key={comp.id}
                id={`comp-${comp.id}`}
                className={`absolute cursor-move select-none rounded-lg p-2 shadow-md border-2 border-white ${getStatusColor(comp)} text-white transition-shadow hover:shadow-lg`}
                style={{ left: comp.posX, top: comp.posY, width: 80 }}
                onMouseDown={(e) => handleMouseDown(e, comp)}
                data-testid={`computador-${comp.id}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <GripVertical className="h-4 w-4 opacity-50" />
                  <span className="font-bold text-lg">{comp.numero}</span>
                  <div className="flex gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-5 w-5 p-0 text-white hover:text-amber-200 hover:bg-transparent"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedComp(comp);
                        setShowOccurrenceDialog(true);
                      }}
                    >
                      <AlertCircle className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-5 w-5 p-0 text-white hover:text-red-200 hover:bg-transparent"
                      onClick={(e) => { e.stopPropagation(); excluirComputadorMutation.mutate(comp.id); }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-center truncate">
                  {comp.aluno?.nome?.split(' ')[0] || '-'}
                </div>
                <Select
                  value={comp.alunoId?.toString() || "none"}
                  onValueChange={(val) => {
                    const alunoId = val === "none" ? null : Number(val);
                    atualizarComputadorMutation.mutate({ id: comp.id, alunoId });
                  }}
                >
                  <SelectTrigger 
                    className="h-6 text-xs mt-1 bg-white/20 border-white/30 text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue placeholder="Atribuir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showOccurrenceDialog} onOpenChange={setShowOccurrenceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ocorrências - PC {selectedComp?.numero}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Nova ocorrência..." 
                value={newOccurrence}
                onChange={(e) => setNewOccurrence(e.target.value)}
              />
              <Button onClick={() => addOccurrenceMutation.mutate({ compId: selectedComp.id, desc: newOccurrence })}>
                Adicionar
              </Button>
            </div>
            <Separator />
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {selectedComp?.ocorrencias?.map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between p-2 border rounded">
                    <div className={o.resolvido ? "line-through opacity-50" : ""}>
                      {o.descricao}
                    </div>
                    <Button 
                      size="sm" 
                      variant={o.resolvido ? "outline" : "default"}
                      onClick={() => resolveOccurrenceMutation.mutate({ id: o.id, resolvido: o.resolvido ? 0 : 1 })}
                    >
                      {o.resolvido ? "Reabrir" : "Resolver"}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {alunosNaoAtribuidos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alunos sem computador atribuído</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {alunosNaoAtribuidos.map(a => (
                <Badge key={a.id} variant="secondary">{a.nome}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
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
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-10 w-24" />)}
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
