import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, User, Mail, Hash, BookOpen, GraduationCap, 
  Calendar, Pencil, Trash2, FileDown, AlertCircle, TrendingUp, CheckCircle2, XCircle
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Textarea } from "@/components/ui/textarea";

const occurrenceSchema = z.object({
  descricao: z.string().min(5, "A descrição deve ter pelo menos 5 caracteres"),
});
import type { Aluno, Turma, Nota, Avaliacao, UnidadeCurricular, Frequencia } from "@shared/schema";
import { LayoutShell } from "@/components/layout-shell";
import { PhotoGallery } from "@/components/photo-gallery";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
  AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

const studentSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  matricula: z.string().min(1, "Matrícula é obrigatória"),
});

type AlunoComDetalhes = Aluno & {
  turmas: Turma[];
  notas: (Nota & { avaliacao: Avaliacao; unidadeCurricular: UnidadeCurricular })[];
  frequencia: (Frequencia & { turma: Turma })[];
};

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const exportBoletim = () => {
    const doc = new jsPDF();
    doc.text(`Boletim Escolar - ${aluno?.nome}`, 20, 20);
    doc.text(`Matrícula: ${aluno?.matricula}`, 20, 30);
    
    const tableData = aluno?.notas.map(n => [
      n.unidadeCurricular.nome,
      n.avaliacao.nome,
      n.valor.toFixed(1)
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Unidade Curricular', 'Avaliação', 'Nota']],
      body: tableData || [],
    });

    doc.save(`boletim_${aluno?.matricula}.pdf`);
  };

  const { data: ocorrencias, refetch: refetchOcorrencias } = useQuery<OcorrenciaAluno[]>({
    queryKey: ["/api/alunos", id, "ocorrencias"],
    queryFn: async () => {
      const res = await fetch(`/api/alunos/${id}/ocorrencias`);
      if (!res.ok) throw new Error("Erro ao carregar ocorrências");
      return res.json();
    }
  });

  const occurrenceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/alunos/${id}/ocorrencias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao registrar ocorrência");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alunos", id, "ocorrencias"] });
      toast({ title: "Sucesso", description: "Ocorrência registrada com sucesso" });
      formOccurrence.reset();
    }
  });

  const setProfilePhotoMutation = useMutation({
    mutationFn: async (fotoId: number) => {
      const res = await fetch(`/api/alunos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotoPerfilId: fotoId }),
      });
      if (!res.ok) throw new Error("Erro ao definir foto de perfil");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alunos", id] });
      toast({ title: "Sucesso", description: "Foto de perfil atualizada" });
    }
  });

  const formOccurrence = useForm({
    resolver: zodResolver(occurrenceSchema),
    defaultValues: { descricao: "" }
  });

  const { data: fotos } = useQuery<any[]>({
    queryKey: ["/api/alunos", id, "fotos"],
    queryFn: async () => {
      const res = await fetch(`/api/alunos/${id}/fotos`);
      return res.json();
    }
  });
    queryKey: ["/api/alunos", id],
    queryFn: async () => {
      const res = await fetch(`/api/alunos/${id}`);
      if (!res.ok) throw new Error("Aluno não encontrado");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/alunos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alunos", id] });
      setIsEditing(false);
      toast({ title: "Sucesso", description: "Perfil atualizado com sucesso" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/alunos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Aluno excluído com sucesso" });
      setLocation("/students");
    }
  });

  const form = useForm({
    resolver: zodResolver(studentSchema),
    values: {
      nome: aluno?.nome || "",
      email: aluno?.email || "",
      matricula: aluno?.matricula || ""
    }
  });

  const calcularMediaGeral = () => {
    if (!aluno?.notas.length) return null;
    const soma = aluno.notas.reduce((acc, n) => acc + n.valor, 0);
    return (soma / aluno.notas.length).toFixed(1);
  };

  const calcularFrequencia = () => {
    if (!aluno?.frequencia.length) return null;
    const presencas = aluno.frequencia.filter(f => f.status === 1).length;
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

  const presencas = aluno.frequencia.filter(f => f.status === 1).length;
  const faltas = aluno.frequencia.filter(f => f.status === 0).length;
  const atrasos = aluno.frequencia.filter(f => f.status === 2).length;
  
  const attendanceData = [
    { name: 'Presenças', value: presencas, color: '#10b981' },
    { name: 'Faltas', value: faltas, color: '#ef4444' },
    { name: 'Atrasos', value: atrasos, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const performanceData = aluno.notas.map(n => ({
    name: n.avaliacao.nome,
    nota: n.valor
  }));

  const fotoPerfil = fotos?.find(f => f.id === (aluno as any).fotoPerfilId)?.fotoBase64;

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/students">
              <Button variant="outline" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              {fotoPerfil ? (
                <img src={fotoPerfil} className="h-12 w-12 rounded-full object-cover border-2 border-primary" alt="Perfil" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                  <User className="h-6 w-6 text-primary" />
                </div>
              )}
              <h1 className="text-2xl font-bold" data-testid="text-student-name">{aluno.nome}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportBoletim}>
              <FileDown className="mr-2 h-4 w-4" />
              Emitir Boletim (PDF)
            </Button>
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar Perfil
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Perfil do Aluno</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
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
                      control={form.control}
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
                      control={form.control}
                      name="matricula"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Matrícula / RA</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/10">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Aluno
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir Aluno</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o aluno {aluno.nome},
                    suas matrículas, notas e histórico de frequência.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => deleteMutation.mutate()}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {deleteMutation.isPending ? "Excluindo..." : "Excluir Permanentemente"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Informações</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold" data-testid="text-matricula">{aluno.matricula}</span>
              </div>
              {aluno.email && (
                <div className="flex items-center gap-2 overflow-hidden">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs truncate" data-testid="text-email">{aluno.email}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="hover-elevate border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Presença</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{percentualFrequencia}%</div>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] h-4 px-1 bg-green-50 text-green-700 border-green-200">
                  {presencas}P
                </Badge>
                <Badge variant="outline" className="text-[10px] h-4 px-1 bg-red-50 text-red-700 border-red-200">
                  {faltas}F
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Média Geral</CardTitle>
              <GraduationCap className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{mediaGeral ?? "0.0"}</div>
              <p className="text-xs text-muted-foreground mt-1">Aproveitamento Acadêmico</p>
            </CardContent>
          </Card>

          <Card className="hover-elevate border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Ocorrências</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{ocorrencias?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Registros de Comportamento</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Desempenho por Avaliação
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {performanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" fontSize={10} tick={{fill: '#888'}} />
                    <YAxis domain={[0, 10]} fontSize={10} tick={{fill: '#888'}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Line type="monotone" dataKey="nota" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm italic">
                  Dados insuficientes para gerar o gráfico de desempenho.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Distribuição de Frequência
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {attendanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendanceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {attendanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm italic text-center px-4">
                  Nenhum registro de presença para gerar estatísticas.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Registro de Ocorrências
                </CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">Novo Registro</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Ocorrência Disciplinar</DialogTitle>
                    </DialogHeader>
                    <Form {...formOccurrence}>
                      <form onSubmit={formOccurrence.handleSubmit((data) => occurrenceMutation.mutate(data))} className="space-y-4 pt-4">
                        <FormField
                          control={formOccurrence.control}
                          name="descricao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descrição da Ocorrência</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Descreva detalhadamente o ocorrido..." 
                                  className="min-h-[120px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full" disabled={occurrenceMutation.isPending}>
                          {occurrenceMutation.isPending ? "Registrando..." : "Registrar Ocorrência"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {ocorrencias?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm italic">
                    Nenhuma ocorrência registrada para este aluno.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ocorrencias?.map((oc) => (
                      <div key={oc.id} className="p-4 rounded-lg border bg-orange-50/30 border-orange-100 relative group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">Ocorrência</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(oc.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{oc.descricao}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Histórico Acadêmico Completo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {aluno.notas.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nenhuma nota registrada até o momento.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 font-medium">Unidade Curricular</th>
                          <th className="pb-2 font-medium">Avaliação</th>
                          <th className="pb-2 font-medium text-right">Nota</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {aluno.notas.map((nota) => (
                          <tr key={nota.id} className="group hover:bg-muted/50">
                            <td className="py-3 pr-4 font-medium">{nota.unidadeCurricular.nome}</td>
                            <td className="py-3 pr-4 text-muted-foreground">{nota.avaliacao.nome}</td>
                            <td className="py-3 text-right">
                              <Badge 
                                variant={nota.valor >= 7 ? "default" : nota.valor >= 5 ? "secondary" : "destructive"}
                                className="w-12 justify-center"
                              >
                                {nota.valor.toFixed(1)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Galeria & Perfil
                </CardTitle>
                <p className="text-xs text-muted-foreground">Escolha a foto que será exibida como padrão no perfil do aluno.</p>
              </CardHeader>
              <CardContent>
                {!fotos || fotos.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed rounded-lg">
                    <User className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                    <p className="text-xs text-muted-foreground italic px-4">Nenhuma foto na galeria. Use o Totem para capturar fotos.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {fotos.map((foto) => (
                      <div 
                        key={foto.id} 
                        className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          (aluno as any).fotoPerfilId === foto.id ? 'border-primary ring-2 ring-primary/20' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                        onClick={() => setProfilePhotoMutation.mutate(foto.id)}
                      >
                        <img src={foto.fotoBase64} className="h-32 w-full object-cover" alt="Aluno" />
                        {(aluno as any).fotoPerfilId === foto.id && (
                          <div className="absolute top-1 right-1 bg-primary text-white p-1 rounded-full shadow-lg">
                            <CheckCircle2 className="h-3 w-3" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-[10px] text-white font-bold bg-primary px-2 py-1 rounded">DEFINIR PADRÃO</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Frequência Recente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {aluno.frequencia.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground italic">Sem registros.</div>
                ) : (
                  <div className="divide-y">
                    {aluno.frequencia.slice(0, 8).map((freq) => (
                      <div key={freq.id} className="flex items-center justify-between p-4 hover:bg-muted/30">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">{new Date(freq.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{freq.turma.nome}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{freq.horario || "--:--"}</span>
                          {freq.status === 1 ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : freq.status === 2 ? (
                            <TrendingUp className="h-4 w-4 text-orange-400 rotate-90" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
      </div>
    </LayoutShell>
  );
}
