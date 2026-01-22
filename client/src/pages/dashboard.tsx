import { useState } from "react";
import { useClasses, useCreateClass } from "@/hooks/use-classes";
import { Link } from "wouter";
import { 
  Plus, 
  Users, 
  Calendar, 
  BookOpen, 
  ArrowRight,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LayoutShell } from "@/components/layout-shell";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";

const createClassSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  unidadeCurricular: z.string().min(2, "A unidade deve ter pelo menos 2 caracteres"),
  ano: z.string().transform(val => parseInt(val, 10)),
  semestre: z.string().transform(val => parseInt(val, 10)),
});

type CreateClassForm = z.input<typeof createClassSchema>;

export default function Dashboard() {
  const { data: classes, isLoading } = useClasses();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const createClassMutation = useCreateClass();

  const form = useForm<CreateClassForm>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      nome: "",
      unidadeCurricular: "",
      ano: new Date().getFullYear().toString(),
      semestre: "1",
    },
  });

  const onSubmit = (data: CreateClassForm) => {
    createClassMutation.mutate({
      ...data,
      ano: Number(data.ano),
      semestre: Number(data.semestre),
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        form.reset();
      }
    });
  };

  if (isLoading) return <DashboardSkeleton />;

  return (
    <LayoutShell>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Painel de Controle</h1>
            <p className="text-muted-foreground mt-1">
              {useAuth().user?.perfil === "admin" 
                ? "Visualizando todas as turmas do sistema." 
                : "Gerencie suas turmas e acompanhe o progresso dos alunos."}
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                <Plus className="mr-2 h-4 w-4" />
                Nova Turma
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Criar Nova Turma</DialogTitle>
                <DialogDescription>
                  Adicione uma nova turma para o ano letivo atual.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Turma</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: Turma A - 2024" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="unidadeCurricular"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade Curricular</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: Lógica de Programação" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ano"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ano</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="semestre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Semestre</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1º Semestre</SelectItem>
                              <SelectItem value="2">2º Semestre</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={createClassMutation.isPending}>
                      {createClassMutation.isPending ? "Criando..." : "Criar Turma"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {classes && classes.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes?.map((cls) => (
              <ClassCard key={cls.id} cls={cls} />
            ))}
          </div>
        )}
      </div>
    </LayoutShell>
  );
}

function ClassCard({ cls }: { cls: any }) {
  return (
    <Link href={`/classes/${cls.id}`} className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-start justify-between">
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary ring-1 ring-primary/20">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground border border-border">
            <Calendar className="h-3 w-3" />
            {cls.ano} • {cls.semestre}º Sem.
          </div>
        </div>
        
        <div>
          <h3 className="font-display text-lg font-bold leading-tight group-hover:text-primary transition-colors">
            {cls.nome}
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-1 font-medium">
            {cls.unidadeCurricular}
          </p>
        </div>
      </div>
      
      <div className="relative z-10 mt-6 flex items-center justify-between border-t pt-4">
        <div className="flex -space-x-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
              A{i}
            </div>
          ))}
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
            +
          </div>
        </div>
        
        <span className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
          Ver Detalhes <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <LayoutShell>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    </LayoutShell>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-3xl bg-muted/30">
      <div className="bg-background p-4 rounded-full shadow-sm mb-4">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">Nenhuma turma encontrada</h3>
      <p className="text-muted-foreground max-w-sm mt-2 mb-6">
        Comece criando sua primeira turma para gerenciar alunos e avaliações.
      </p>
    </div>
  );
}
