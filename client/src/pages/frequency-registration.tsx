import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { LayoutShell } from "@/components/layout-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Aluno, FotoAluno } from "@shared/schema";
import { Loader2, Camera, CheckCircle, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { useAuth } from "@/hooks/use-auth";
import { LogOut } from "lucide-react";

export default function FrequencyRegistration() {
  const { user, logout } = useAuth();
  const isTotem = user?.perfil === "totem";
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<{ aluno: Aluno; distance: number } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const [descriptors, setDescriptors] = useState<{ alunoId: number; descriptor: Float32Array }[]>([]);
  const [isProcessingModels, setIsProcessingModels] = useState(false);
  const [lastAutoCapture, setLastAutoCapture] = useState<number>(0);
  const recognitionCooldown = 5000; // 5 segundos entre registros do mesmo rosto

  const { data: students } = useQuery<Aluno[]>({
    queryKey: ["/api/alunos"],
  });

  const { data: studentPhotos } = useQuery<(FotoAluno & { studentName: string })[]>({
    queryKey: ["/api/all-student-photos"],
    enabled: !!students,
  });

  useEffect(() => {
    const loadModels = async () => {
      // Use locally hosted models with specific manifest extensions
      const MODEL_URL = "/models/";
      try {
        console.log("Loading face-api models from:", MODEL_URL);
        
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        
        console.log("Models loaded successfully");
        setModelsLoaded(true);
      } catch (err: any) {
        console.error("Error loading models:", err);
        toast({
          title: "Erro no Sistema",
          description: "Falha ao carregar modelos. Certifique-se que os arquivos .json estão na pasta public/models/",
          variant: "destructive",
        });
      }
    };
    loadModels();
  }, []);

  // Pre-process student descriptors once photos are loaded
  useEffect(() => {
    if (modelsLoaded && studentPhotos && studentPhotos.length > 0 && descriptors.length === 0) {
      const processDescriptors = async () => {
        setIsProcessingModels(true);
        const loadedDescriptors: { alunoId: number; descriptor: Float32Array }[] = [];
        
        for (const photo of studentPhotos) {
          try {
            let studentImg: HTMLImageElement;
            if (photo.fotoBase64) {
              studentImg = await faceapi.fetchImage(photo.fotoBase64);
            } else if (photo.objectPath) {
              const url = `/api/uploads/url?objectPath=${encodeURIComponent(photo.objectPath)}`;
              studentImg = await faceapi.fetchImage(url);
            } else {
              continue;
            }

            const detection = await faceapi.detectSingleFace(studentImg).withFaceLandmarks().withFaceDescriptor();
            if (detection) {
              loadedDescriptors.push({
                alunoId: photo.alunoId,
                descriptor: detection.descriptor
              });
            }
          } catch (e) {
            console.error("Error processing photo for descriptor", e);
          }
        }
        setDescriptors(loadedDescriptors);
        setIsProcessingModels(false);
      };
      processDescriptors();
    }
  }, [modelsLoaded, studentPhotos]);

  const startVideo = () => {
    setIsScanning(true);
    navigator.mediaDevices.getUserMedia({ video: {} })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error(err));
  };

  const stopVideo = () => {
    setIsScanning(false);
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
  };

  const handleCapture = async (auto = false) => {
    if (!videoRef.current || !canvasRef.current || !students || descriptors.length === 0) {
      if (!auto && descriptors.length === 0) {
        toast({
          title: "Aguarde",
          description: "Ainda processando banco de dados de faces...",
          variant: "destructive"
        });
      }
      return;
    }

    // Cooldown para evitar múltiplos registros acidentais no modo automático
    if (auto && Date.now() - lastAutoCapture < recognitionCooldown) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    
    const base64Image = canvas.toDataURL("image/jpeg");
    if (!auto) {
      setCapturedImage(base64Image);
      stopVideo();
    }

    try {
      const input = await faceapi.fetchImage(base64Image);
      const detection = await faceapi.detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        if (!auto) {
          toast({
            title: "Erro",
            description: "Nenhuma face detectada. Tente se posicionar melhor.",
            variant: "destructive",
          });
        }
        return;
      }

      let bestMatch: { student: Aluno; distance: number } | null = null;
      let minDistance = 0.6;

      for (const item of descriptors) {
        const distance = faceapi.euclideanDistance(detection.descriptor, item.descriptor);
        if (distance < minDistance) {
          minDistance = distance;
          const student = students.find(s => s.id === item.alunoId);
          if (student) {
            bestMatch = { student, distance };
          }
        }
      }

      const similarity = Math.max(0, 1 - minDistance);
      const matchPercentage = similarity * 100;

      if (bestMatch && matchPercentage >= 70) {
        // Capture image and stop video immediately on recognition
        setCapturedImage(base64Image);
        stopVideo();
        
        setLastAutoCapture(Date.now());
        setRecognitionResult({ aluno: bestMatch.student, distance: minDistance });
        toast({
          title: "Sucesso!",
          description: `Aluno identificado: ${bestMatch.student.nome} (${matchPercentage.toFixed(1)}%)`,
        });
        
        registerPresenceMutation.mutate({
          alunoId: bestMatch.student.id,
          status: "presente"
        });

        if (auto) {
          // Reinicia a busca automática após um tempo para o próximo aluno
          setTimeout(() => {
            setRecognitionResult(null);
            setCapturedImage(null);
            startVideo();
          }, 4000);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Loop de detecção automática
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning && modelsLoaded && !isProcessingModels && !recognitionResult) {
      interval = setInterval(() => {
        handleCapture(true);
      }, 1000); // Tenta detectar a cada 1 segundo
    }
    return () => clearInterval(interval);
  }, [isScanning, modelsLoaded, isProcessingModels, descriptors, recognitionResult]);

  const registerPresenceMutation = useMutation({
    mutationFn: async (data: { alunoId: number; status: string }) => {
      // Find a class for this student to register presence
      const studentClasses = await apiRequest("GET", `/api/alunos/${data.alunoId}`);
      const studentData = await studentClasses.json();
      
      if (studentData.turmas && studentData.turmas.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        await apiRequest("POST", `/api/turmas/${studentData.turmas[0].id}/frequencia`, {
          alunoId: data.alunoId,
          turmaId: studentData.turmas[0].id,
          data: today,
          status: data.status
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Presença registrada",
        description: "A frequência foi salva com sucesso.",
      });
      // Invalidate both lists to ensure everything updates
      queryClient.invalidateQueries({ queryKey: ["/api/frequencia"] });
      queryClient.invalidateQueries({ queryKey: ["/api/turmas"] });
    }
  });

  const content = (
    <div className="max-w-4xl mx-auto space-y-6 px-4 md:px-0">
      <header className="flex items-center justify-between pt-4">
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold font-display text-primary">Bem-vindo ao Totem SENAI</h1>
          <p className="text-lg text-muted-foreground mt-2">Aguardando aluno para registro de presença automático.</p>
        </div>
        {isTotem && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => logout.mutate()}
            title="Sair do Terminal"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <Card className="overflow-hidden border-2 border-primary/10 shadow-xl rounded-2xl">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Camera className="h-6 w-6 text-primary" />
              Área de Captura
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-col items-center gap-6">
            <div className="relative aspect-square w-full max-w-[400px] bg-black rounded-3xl overflow-hidden border-4 border-muted shadow-inner">
              {isScanning ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : capturedImage ? (
                <img src={capturedImage} className="w-full h-full object-cover scale-x-[-1]" alt="Captura" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/50 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin" />
                  <p className="italic">Iniciando sistema...</p>
                </div>
              )}
              
              {/* Overlay de guia facial */}
              {isScanning && (
                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                  <div className="w-full h-full border-2 border-dashed border-white/50 rounded-[100px]" />
                </div>
              )}
              
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {!modelsLoaded || isProcessingModels ? (
              <div className="flex items-center gap-3 text-primary font-medium">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{isProcessingModels ? "Otimizando banco de faces..." : "Carregando IA..."}</span>
              </div>
            ) : (
              <div className="w-full">
                {!isScanning && !capturedImage && (
                  <Button onClick={startVideo} size="lg" className="w-full text-lg h-14 rounded-xl shadow-lg hover:scale-[1.02] transition-transform">
                    Ativar Câmera do Totem
                  </Button>
                )}
                {capturedImage && (
                  <Button onClick={() => { setCapturedImage(null); setRecognitionResult(null); startVideo(); }} variant="outline" className="w-full h-12 rounded-xl">
                    Próximo Aluno
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full border-2 border-primary/10 shadow-xl rounded-2xl min-h-[400px] flex flex-col">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="text-xl">Status do Registro</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            {recognitionResult ? (
              <div className="animate-in zoom-in slide-in-from-bottom-4 duration-500 w-full">
                <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-16 w-16 text-green-600" />
                </div>
                <h3 className="text-3xl font-bold text-primary mb-2 uppercase">{recognitionResult.aluno.nome}</h3>
                <p className="text-xl text-muted-foreground mb-6">RA: {recognitionResult.aluno.matricula}</p>
                
                <div className="inline-block px-6 py-3 bg-primary text-white rounded-2xl text-lg font-bold shadow-md">
                  PRESENÇA CONFIRMADA
                </div>
                
                <p className="mt-8 text-sm text-muted-foreground animate-pulse">
                  Reiniciando em instantes para o próximo aluno...
                </p>
              </div>
            ) : capturedImage ? (
              <div className="space-y-4">
                <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                <p className="text-xl font-medium text-primary">Validando identidade...</p>
              </div>
            ) : (
              <div className="space-y-6 opacity-40">
                <div className="bg-muted p-8 rounded-full w-32 h-32 flex items-center justify-center mx-auto">
                  <Camera className="h-16 w-16" />
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">Aguardando Face</p>
                  <p className="text-muted-foreground">Posicione-se para identificação automática</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Rodapé Informativo para Tablet */}
      <footer className="mt-12 p-6 bg-muted/30 rounded-2xl border border-dashed border-primary/20 text-center">
        <p className="text-sm text-muted-foreground">
          Sistema de Frequência Inteligente SENAI-SP • Reconhecimento Facial em Tempo Real
        </p>
      </footer>
    </div>
  );

  if (isTotem) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-6xl animate-in fade-in zoom-in duration-500">
          {content}
        </div>
      </div>
    );
  }

  return (
    <LayoutShell>
      {content}
    </LayoutShell>
  );
}
