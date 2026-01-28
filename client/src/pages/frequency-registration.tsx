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
import { useRoute } from "wouter";

import { useAuth } from "@/hooks/use-auth";
import { LogOut, RefreshCw } from "lucide-react";

export default function FrequencyRegistration() {
  const [match, params] = useRoute("/frequency-registration/:turmaId?");
  const turmaId = params?.turmaId ? parseInt(params.turmaId) : null;
  
  const { user, logout } = useAuth();
  const isTotem = user?.perfil === "totem";
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<{ aluno: Aluno; distance: number; similarity: number } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const [descriptors, setDescriptors] = useState<{ alunoId: number; descriptor: Float32Array }[]>([]);
  const [isProcessingModels, setIsProcessingModels] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [totemActive, setTotemActive] = useState(false);
  const [lastAutoCapture, setLastAutoCapture] = useState<number>(0);
  const recognitionCooldown = 5000; // 5 segundos entre registros do mesmo rosto
  
  // Limiar de reconhecimento - 0.20 garante 80%+ de similaridade real no modelo SSD
  // No face-api.js com SSD, 0.45 é permissivo, 0.20 é rigoroso (80%+ real)
  const RECOGNITION_THRESHOLD = 0.20;

  const { data: students } = useQuery<Aluno[]>({
    queryKey: turmaId ? [`/api/turmas/${turmaId}/alunos`] : ["/api/alunos"],
  });

  const { data: studentPhotos } = useQuery<(FotoAluno & { studentName: string })[]>({
    queryKey: turmaId ? [`/api/turmas/${turmaId}/fotos`] : ["/api/all-student-photos"],
    enabled: !!students,
  });

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models/";
      try {
        console.log("Loading face-api models from:", MODEL_URL);
        
        // Carregamento otimizado: SSD MobileNet v1 para maior precisão
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        
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
        const cached = localStorage.getItem("face_descriptors_cache");
        const cacheData = cached ? JSON.parse(cached) : {};
        const loadedDescriptors: { alunoId: number; descriptor: Float32Array }[] = [];
        
        // Limpeza de cache para fotos que não existem mais ou estão corrompidas
        const currentPhotoPaths = new Set(studentPhotos.map(p => p.objectPath).filter(Boolean));
        let cacheUpdated = false;
        
        for (const key in cacheData) {
          if (key.length > 50 && key.includes('/') && !currentPhotoPaths.has(key)) {
            delete cacheData[key];
            cacheUpdated = true;
          }
        }
        
        if (cacheUpdated) {
          localStorage.setItem("face_descriptors_cache", JSON.stringify(cacheData));
        }

        // Processamento em PARALELO para maior velocidade
        const batchSize = 5;
        for (let i = 0; i < studentPhotos.length; i += batchSize) {
          const batch = studentPhotos.slice(i, i + batchSize);
          await Promise.all(batch.map(async (photo) => {
            try {
              const cacheKey = photo.objectPath || photo.fotoBase64?.substring(0, 100);
              if (cacheKey && cacheData[cacheKey]) {
                loadedDescriptors.push({
                  alunoId: photo.alunoId,
                  descriptor: new Float32Array(Object.values(cacheData[cacheKey]))
                });
                return;
              }

              let studentImg: HTMLImageElement;
              if (photo.fotoBase64 && photo.fotoBase64.trim().length > 50) {
                let cleanBase64 = photo.fotoBase64.trim();
                // Validar se não é apenas um cabeçalho vazio "data:,"
                if (cleanBase64 === "data:," || cleanBase64.length < 100) {
                  console.warn("Foto base64 inválida ou muito curta para o aluno", photo.alunoId);
                  return;
                }
                if (!cleanBase64.includes(',') && !cleanBase64.startsWith('data:')) {
                  cleanBase64 = `data:image/jpeg;base64,${cleanBase64}`;
                }
                studentImg = await faceapi.fetchImage(cleanBase64);
              } else if (photo.objectPath) {
                const url = `/api/uploads/url?objectPath=${encodeURIComponent(photo.objectPath)}`;
                studentImg = await faceapi.fetchImage(url);
              } else {
                return;
              }

              const detection = await faceapi.detectSingleFace(studentImg, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })).withFaceLandmarks().withFaceDescriptor();
              if (detection) {
                const descriptorArray = Array.from(detection.descriptor);
                if (cacheKey) cacheData[cacheKey] = descriptorArray;
                loadedDescriptors.push({
                  alunoId: photo.alunoId,
                  descriptor: detection.descriptor
                });
              }
            } catch (e) {
              console.error("Error processing photo", e);
            }
          }));
          setProcessingProgress(Math.round(((i + batch.length) / studentPhotos.length) * 100));
        }
        
        localStorage.setItem("face_descriptors_cache", JSON.stringify(cacheData));
        setDescriptors(loadedDescriptors);
        setIsProcessingModels(false);
      };
      processDescriptors();
    }
  }, [modelsLoaded, studentPhotos]);

  const startVideo = () => {
    setTotemActive(true);
    setIsScanning(true);
    setCapturedImage(null);
    setRecognitionResult(null);
    navigator.mediaDevices.getUserMedia({ video: {} })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error(err);
        setTotemActive(false);
        setIsScanning(false);
      });
  };

  const stopVideo = () => {
    setIsScanning(false);
    setTotemActive(false);
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const handleCapture = async (auto = false) => {
    if (!videoRef.current || !canvasRef.current || !students || descriptors.length === 0 || !isScanning) {
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
        
        // Detecção ultra-rápida inicial para verificar se há rosto
        const detection = await faceapi.detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

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

        // Criar FaceMatcher em tempo real para busca ultra-rápida (vetorizada)
        // Isso é muito mais rápido que loop manual de euclideanDistance
        const labeledDescriptors = descriptors.reduce((acc, item) => {
          const existing = acc.find(l => l.label === item.alunoId.toString());
          if (existing) {
            existing.descriptors.push(item.descriptor);
          } else {
            acc.push(new faceapi.LabeledFaceDescriptors(item.alunoId.toString(), [item.descriptor]));
          }
          return acc;
        }, [] as faceapi.LabeledFaceDescriptors[]);

        if (labeledDescriptors.length === 0) return;

        const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, RECOGNITION_THRESHOLD);
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

        if (bestMatch.label !== "unknown") { 
          const matchedId = parseInt(bestMatch.label);
          const student = students.find(s => s.id === matchedId);
          
          if (student) {
            console.log("Totem: Aluno identificado!", student.nome, "Distância:", bestMatch.distance);
            
            // Calcular similaridade para exibição
            const similarity = Math.round(100 - (bestMatch.distance * 50)); 
            
            // Registrar presença PRIMEIRO
            const now = new Date();
            const deviceTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const deviceDate = now.toISOString().split('T')[0];

            registerPresenceMutation.mutate({
              alunoId: student.id,
              status: 1, 
              horario: deviceTime,
              data: deviceDate,
              metodo: "facial"
            });

            // Atualizar UI e parar câmera
            setCapturedImage(base64Image);
            setRecognitionResult({ 
              aluno: student, 
              distance: bestMatch.distance,
              similarity: similarity
            });
            setLastAutoCapture(Date.now());
            setIsScanning(false);
            setTotemActive(false);
            
            if (videoRef.current && videoRef.current.srcObject) {
              const stream = videoRef.current.srcObject as MediaStream;
              stream.getTracks().forEach(track => track.stop());
              videoRef.current.srcObject = null;
            }
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
    mutationFn: async (data: { alunoId: number; status: number; horario?: string; data?: string; metodo?: string; turmaId?: number }) => {
      // Find a class for this student to register presence
      const res = await fetch(`/api/alunos/${data.alunoId}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.mensagem || "Erro ao buscar dados do aluno");
      }
      const studentData = await res.json();
      
      if (studentData.turmas && studentData.turmas.length > 0) {
        const today = data.data || new Date().toISOString().split('T')[0];
        const targetTurmaId = studentData.turmas[0].id;
        console.log(`Totem: Enviando POST para turma ${targetTurmaId} - Aluno ${data.alunoId}`);
        
        // Atribuir o ID da turma aos dados para que o onSuccess saiba qual turma invalidar
        data.turmaId = targetTurmaId;

        await apiRequest("POST", `/api/turmas/${targetTurmaId}/frequencia`, {
          alunoId: data.alunoId,
          turmaId: targetTurmaId,
          data: today,
          status: data.status,
          horario: data.horario,
          metodo: data.metodo || "facial"
        });
      } else {
        console.warn("Totem: Aluno não está matriculado em nenhuma turma.");
        throw new Error("Aluno não matriculado em turmas");
      }
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Presença registrada",
        description: "A frequência foi salva com sucesso.",
      });
      
      // Force immediate invalidation across the app
      queryClient.invalidateQueries({ queryKey: ["/api/turmas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance-history"] });
      
      // IMPORTANT: This invalidates the specific query used in class-details.tsx
      const today = variables.data || new Date().toISOString().split('T')[0];
      queryClient.invalidateQueries({ 
        queryKey: ["/api/turmas", variables.turmaId, "frequencia"] 
      });
      
      console.log("Totem: Sucesso no registro. Aguardando ação do usuário...");
      // Removido o timeout que reiniciava a câmera automaticamente
    },
    onError: (error: any) => {
      console.error("Totem: Erro ao registrar:", error);
      toast({
        title: "Erro no registro",
        description: "Não foi possível salvar a presença no banco de dados.",
        variant: "destructive"
      });
      // Permite tentar novamente após erro (pode manter o reset aqui se desejar, mas seguindo a lógica de manual)
      setTimeout(() => {
        setCapturedImage(null);
        setRecognitionResult(null);
        startVideo();
      }, 3000);
    }
  });

  const content = (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 px-0 md:px-0">
      <header className="flex flex-col md:flex-row items-center justify-between pt-4 gap-4 text-center md:text-left">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold font-display text-primary">Totem SENAI</h1>
          <p className="text-sm md:text-lg text-muted-foreground mt-1 md:mt-2">Registro de presença automático.</p>
        </div>
        <div className="flex gap-2 items-center relative z-50">
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              localStorage.removeItem("face_descriptors_cache");
              window.location.reload();
            }}
            className="h-9 gap-2 shadow-md"
          >
            <Loader2 className="h-4 w-4" />
            <span>Sincronizar Faces</span>
          </Button>
          {isTotem && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => logout.mutate()}
              className="gap-2 border-primary/20 h-9"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 items-start">
        <Card className="overflow-hidden border-2 border-primary/10 shadow-lg rounded-xl md:rounded-2xl">
          <CardHeader className="bg-primary/5 border-b p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Camera className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              Área de Captura
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 flex flex-col items-center gap-4 md:gap-6">
            <div className="relative aspect-square w-full max-w-[400px] bg-black rounded-2xl md:rounded-3xl overflow-hidden border-2 md:border-4 border-muted shadow-inner">
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
                <div className="flex flex-col items-center justify-center h-full text-white/50 space-y-4 p-4 text-center">
                  <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin" />
                  <p className="italic text-sm md:text-base">Iniciando sistema...</p>
                </div>
              )}
              
              {/* Overlay de guia facial */}
              {isScanning && (
                <div className="absolute inset-0 border-[20px] md:border-[40px] border-black/40 pointer-events-none">
                  <div className="w-full h-full border-2 border-dashed border-white/50 rounded-[60px] md:rounded-[100px]" />
                </div>
              )}
              
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {!modelsLoaded || isProcessingModels ? (
              <div className="flex flex-col items-center gap-2 md:gap-3 w-full">
                <div className="flex items-center gap-2 md:gap-3 text-primary font-medium text-sm md:text-base">
                  <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                  <span>{isProcessingModels ? `Otimizando faces (${processingProgress}%)...` : "Carregando IA..."}</span>
                </div>
                {isProcessingModels && (
                  <div className="w-full bg-muted h-1.5 md:h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-300" 
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full">
                {!totemActive && (
                  <Button onClick={startVideo} size="lg" className="w-full text-base md:text-lg h-12 md:h-14 rounded-xl shadow-lg">
                    Ativar Câmera
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/10 shadow-lg rounded-xl md:rounded-2xl min-h-[300px] md:min-h-[400px] flex flex-col">
          <CardHeader className="bg-primary/5 border-b p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Status do Registro</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-6 md:p-8 text-center">
            {recognitionResult ? (
              <div className="animate-in zoom-in slide-in-from-bottom-4 duration-500 w-full">
                <div className="bg-green-100 dark:bg-green-900/30 p-4 md:p-6 rounded-full w-20 h-20 md:w-24 md:h-24 flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <CheckCircle className="h-12 w-12 md:h-16 md:w-16 text-green-600" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-primary mb-1 md:mb-2 uppercase truncate">{recognitionResult.aluno.nome}</h3>
                <p className="text-lg md:text-xl text-muted-foreground mb-1 md:mb-2">RA: {recognitionResult.aluno.matricula}</p>
                <p className="text-sm font-bold text-green-600 mb-4 md:mb-6">Compatibilidade: {recognitionResult.similarity}%</p>
                
                <div className="inline-block px-4 py-2 md:px-6 md:py-3 bg-primary text-white rounded-xl md:rounded-2xl text-base md:text-lg font-bold shadow-md">
                  PRESENÇA CONFIRMADA
                </div>
                
                <Button 
                  onClick={startVideo}
                  className="mt-6 md:mt-8 w-full h-10 md:h-12 rounded-xl"
                  variant="outline"
                >
                  Próximo Aluno
                </Button>
              </div>
            ) : capturedImage ? (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 md:h-16 md:w-16 animate-spin text-primary mx-auto" />
                <p className="text-lg md:text-xl font-medium text-primary">Validando identidade...</p>
              </div>
            ) : (
              <div className="space-y-4 md:space-y-6 opacity-40">
                <div className="bg-muted p-6 md:p-8 rounded-full w-24 h-24 md:w-32 md:h-32 flex items-center justify-center mx-auto">
                  <Camera className="h-12 w-12 md:h-16 md:w-16" />
                </div>
                <div className="space-y-1 md:space-y-2">
                  <p className="text-xl md:text-2xl font-bold">Aguardando Face</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Posicione-se para identificação</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <footer className="mt-8 md:mt-12 p-4 md:p-6 bg-muted/30 rounded-xl border border-dashed border-primary/20 text-center">
        <p className="text-[10px] md:text-sm text-muted-foreground">
          Sistema SENAI-SP • Reconhecimento Facial
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
