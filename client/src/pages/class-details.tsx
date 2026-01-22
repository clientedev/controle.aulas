import { useState } from "react";
import { useParams, Link } from "wouter";
import { useClass, useDeleteClass } from "@/hooks/use-classes";
import { useStudents, useEnrollStudent } from "@/hooks/use-students";
import { useCreateEvaluation } from "@/hooks/use-evaluations";
import { useClassGrades, useUpdateGrade } from "@/hooks/use-grades";
import { LayoutShell } from "@/components/layout-shell";
import {
  ArrowLeft,
  Settings,
  MoreHorizontal,
  Plus,
  Trash2,
  UserPlus,
  Search,
  FileText,
  AlertCircle
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
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

// Schemas
const createEvaluationSchema = z.object({
  name: z.string().min(2, "Name required"),
  maxScore: z.string().transform(val => parseFloat(val) || 10),
  weight: z.string().transform(val => parseFloat(val) || 1),
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
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-2xl font-bold md:text-3xl">{classData.name}</h1>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  {classData.year} • S{classData.semester}
                </Badge>
              </div>
              <p className="text-muted-foreground font-medium">{classData.unit}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Class
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the class,
                    all enrollments, evaluations, and grades.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => deleteClassMutation.mutate(classId)}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="students" className="w-full space-y-6">
          <TabsList className="w-full justify-start border-b bg-transparent p-0">
            <TabsTrigger 
              value="students" 
              className="rounded-none border-b-2 border-transparent px-4 py-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              Students
            </TabsTrigger>
            <TabsTrigger 
              value="evaluations" 
              className="rounded-none border-b-2 border-transparent px-4 py-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              Evaluations
            </TabsTrigger>
            <TabsTrigger 
              value="grades" 
              className="rounded-none border-b-2 border-transparent px-4 py-3 font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              Gradebook
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <StudentsTab classId={classId} enrolledStudents={classData.students || []} />
          </TabsContent>

          <TabsContent value="evaluations" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <EvaluationsTab classId={classId} evaluations={classData.evaluations || []} />
          </TabsContent>

          <TabsContent value="grades" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <GradesTab 
              classId={classId} 
              students={classData.students || []} 
              evaluations={classData.evaluations || []} 
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
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // Filter out already enrolled students
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Enrolled Students</CardTitle>
          <CardDescription>Manage students in this class</CardDescription>
        </div>
        <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Enroll Student
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enroll Student</DialogTitle>
              <DialogDescription>Add an existing student to this class</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="student-select">Select Student</Label>
              <select
                id="student-select"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-2"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                <option value="">Select a student...</option>
                {availableStudents.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.registrationNumber})
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button onClick={handleEnroll} disabled={!selectedStudentId || enrollMutation.isPending}>
                {enrollMutation.isPending ? "Enrolling..." : "Enroll"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {enrolledStudents.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-xl">
            <Users className="h-8 w-8 mb-2 opacity-50" />
            <p>No students enrolled yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Registration</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrolledStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono text-xs">{student.registrationNumber}</TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
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

function EvaluationsTab({ classId, evaluations }: { classId: number, evaluations: any[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const createMutation = useCreateEvaluation(classId);
  
  const form = useForm({
    resolver: zodResolver(createEvaluationSchema),
    defaultValues: { name: "", maxScore: "10", weight: "1" }
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
          <CardTitle>Evaluations</CardTitle>
          <CardDescription>Tests, assignments, and projects</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Evaluation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Evaluation</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input placeholder="Exam 1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maxScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Score</FormLabel>
                        <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight</FormLabel>
                        <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>Create</Button>
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
            <p>No evaluations created yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Max Score</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluations.map((evalItem) => (
                <TableRow key={evalItem.id}>
                  <TableCell className="font-medium">{evalItem.name}</TableCell>
                  <TableCell>{evalItem.maxScore}</TableCell>
                  <TableCell>{evalItem.weight}</TableCell>
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

function GradesTab({ classId, students, evaluations }: { classId: number, students: any[], evaluations: any[] }) {
  const { data: grades, isLoading } = useClassGrades(classId);
  const updateGradeMutation = useUpdateGrade(classId);

  // Helper to find existing grade
  const getGrade = (studentId: number, evalId: number) => {
    return grades?.find(g => g.studentId === studentId && g.evaluationId === evalId)?.score ?? "";
  };

  const handleGradeChange = (studentId: number, evalId: number, value: string) => {
    if (value === "") return;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    updateGradeMutation.mutate({
      studentId,
      evaluationId: evalId,
      score: numValue
    });
  };

  if (isLoading) return <div className="p-8 text-center">Loading grades...</div>;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Gradebook</CardTitle>
        <CardDescription>Enter grades for each student and evaluation</CardDescription>
      </CardHeader>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px] sticky left-0 bg-card z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Student</TableHead>
              {evaluations.map(e => (
                <TableHead key={e.id} className="text-center min-w-[100px]">
                  <div className="flex flex-col">
                    <span>{e.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">Max: {e.maxScore}</span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center font-bold bg-muted/20">Average</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map(student => {
              // Calculate weighted average
              let totalWeight = 0;
              let weightedSum = 0;
              
              evaluations.forEach(e => {
                const grade = grades?.find(g => g.studentId === student.id && g.evaluationId === e.id);
                if (grade) {
                  // Normalize to 0-10 scale if maxScore differs
                  const normalizedScore = (grade.score / e.maxScore) * 10;
                  weightedSum += normalizedScore * e.weight;
                  totalWeight += e.weight;
                }
              });

              const finalAverage = totalWeight > 0 ? (weightedSum / totalWeight).toFixed(1) : "-";

              return (
                <TableRow key={student.id}>
                  <TableCell className="sticky left-0 bg-card z-10 font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div className="flex flex-col">
                      <span>{student.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{student.registrationNumber}</span>
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
        <h2 className="text-2xl font-bold">Class Not Found</h2>
        <p className="text-muted-foreground mt-2 mb-6">The class you are looking for does not exist or has been deleted.</p>
        <Link href="/">
          <Button>Return to Dashboard</Button>
        </Link>
      </div>
    </LayoutShell>
  );
}
