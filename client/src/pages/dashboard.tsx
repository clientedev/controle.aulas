import { useState } from "react";
import { useClasses, useCreateClass } from "@/hooks/use-classes";
import { Link } from "wouter";
import { 
  Plus, 
  Users, 
  Calendar, 
  BookOpen, 
  ArrowRight,
  MoreVertical,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LayoutShell } from "@/components/layout-shell";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";

// Define schema for client-side form validation (mirroring shared schema)
const createClassSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  unit: z.string().min(2, "Unit name must be at least 2 characters"),
  year: z.string().transform(val => parseInt(val, 10)),
  semester: z.string().transform(val => parseInt(val, 10)),
});

type CreateClassForm = z.input<typeof createClassSchema>;

export default function Dashboard() {
  const { data: classes, isLoading } = useClasses();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const createClassMutation = useCreateClass();

  const form = useForm<CreateClassForm>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      name: "",
      unit: "",
      year: new Date().getFullYear().toString(),
      semester: "1",
    },
  });

  const onSubmit = (data: CreateClassForm) => {
    // Transform string inputs to numbers as expected by the hook
    createClassMutation.mutate({
      ...data,
      year: Number(data.year),
      semester: Number(data.semester),
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
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your classes and track student progress.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                <Plus className="mr-2 h-4 w-4" />
                New Class
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
                <DialogDescription>
                  Add a new class for the current academic year.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Turma A - 2024" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Curricular Unit</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Lógica de Programação" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="semester"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Semester</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1st Semester</SelectItem>
                              <SelectItem value="2">2nd Semester</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createClassMutation.isPending}>
                      {createClassMutation.isPending ? "Creating..." : "Create Class"}
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
      {/* Decorative gradient background opacity */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-start justify-between">
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary ring-1 ring-primary/20">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground border border-border">
            <Calendar className="h-3 w-3" />
            {cls.year} • S{cls.semester}
          </div>
        </div>
        
        <div>
          <h3 className="font-display text-lg font-bold leading-tight group-hover:text-primary transition-colors">
            {cls.name}
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-1 font-medium">
            {cls.unit}
          </p>
        </div>
      </div>
      
      <div className="relative z-10 mt-6 flex items-center justify-between border-t pt-4">
        <div className="flex -space-x-2">
          {/* Mock avatars for visual interest */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
              S{i}
            </div>
          ))}
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
            +
          </div>
        </div>
        
        <span className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
          View Details <ArrowRight className="h-3.5 w-3.5" />
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
      <h3 className="text-lg font-semibold">No classes found</h3>
      <p className="text-muted-foreground max-w-sm mt-2 mb-6">
        Get started by creating your first class to manage students and evaluations.
      </p>
    </div>
  );
}
