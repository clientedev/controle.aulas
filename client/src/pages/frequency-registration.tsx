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

export default function FrequencyRegistration() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<{ aluno: Aluno; distance: number } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const [descriptors, setDescriptors] = useState<{ alunoId: number; descriptor: Float32Array }[]>([]);
  const [isProcessingModels, setIsProcessingModels] = useState(false);

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

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || !students || descriptors.length === 0) {
      if (descriptors.length === 0) {
        toast({
          title: "Aguarde",
          description: "Ainda processando banco de dados de faces...",
          variant: "destructive"
        });
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    
    const base64Image = canvas.toDataURL("image/jpeg");
    setCapturedImage(base64Image);
    stopVideo();

    toast({
      title: "Processando",
      description: "Identificando aluno...",
    });

    try {
      const input = await faceapi.fetchImage(base64Image);
      // Voltando para SsdMobilenetv1 para maior precisão na identificação, mesmo sendo levemente mais lento
      const detection = await faceapi.detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        toast({
          title: "Erro",
          description: "Nenhuma face detectada. Tente se posicionar melhor e garanta boa iluminação.",
          variant: "destructive",
        });
        return;
      }

      let bestMatch: { student: Aluno; distance: number } | null = null;
      let minDistance = 0.6; // Threshold padrão do face-api.js para faces diferentes

      // Comparação precisa com os descritores pré-carregados
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

      // Convertendo distância para porcentagem de similaridade
      // Distância 0 = 100% similar, Distância 0.6 = ~40% similar (limite de reconhecimento)
      // Para o requisito de 70%, a distância máxima deve ser 0.3
      const similarity = Math.max(0, 1 - minDistance);
      const matchPercentage = similarity * 100;

      if (bestMatch && matchPercentage >= 70) {
        setRecognitionResult({ aluno: bestMatch.student, distance: minDistance });
        toast({
          title: "Sucesso!",
          description: `Aluno identificado: ${bestMatch.student.nome} (${matchPercentage.toFixed(1)}% compatibilidade)`,
        });
        
        // Register presence
        registerPresenceMutation.mutate({
          alunoId: bestMatch.student.id,
          status: "presente"
        });
      } else {
        toast({
          title: "Não identificado",
          description: `Compatibilidade insuficiente (${matchPercentage.toFixed(1)}%).`,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro",
        description: "Falha no reconhecimento facial.",
        variant: "destructive",
      });
    }
  };

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
      queryClient.invalidateQueries({ queryKey: ["/api/frequencia"] });
    }
  });

  return (
    <LayoutShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold font-display text-primary">Registro de Frequência</h1>
          <p className="text-muted-foreground">Posicione-se em frente à câmera para reconhecimento facial.</p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Câmera
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="relative aspect-video w-full bg-muted rounded-lg overflow-hidden border">
                {isScanning ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : capturedImage ? (
                  <img src={capturedImage} className="w-full h-full object-cover" alt="Captura" />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground italic">
                    Câmera desligada
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {!modelsLoaded || isProcessingModels ? (
                <Button disabled className="w-full">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isProcessingModels ? "Otimizando banco de faces..." : "Carregando modelos de IA..."}
                </Button>
              ) : (
                <div className="flex gap-2 w-full">
                  {!isScanning ? (
                    <Button onClick={startVideo} className="flex-1">
                      Iniciar Câmera
                    </Button>
                  ) : (
                    <Button onClick={handleCapture} className="flex-1" variant="default">
                      Capturar e Identificar
                    </Button>
                  )}
                  {capturedImage && (
                    <Button onClick={() => { setCapturedImage(null); setRecognitionResult(null); startVideo(); }} variant="outline">
                      Tentar novamente
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resultado da Identificação</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-[300px] text-center">
              {recognitionResult ? (
                <div className="animate-in zoom-in duration-300">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold">{recognitionResult.aluno.nome}</h3>
                  <p className="text-muted-foreground">Matrícula: {recognitionResult.aluno.matricula}</p>
                  <div className="mt-4 p-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-bold">
                    {(1 - recognitionResult.distance).toLocaleString(undefined, {style: 'percent'})} de Compatibilidade
                  </div>
                  <p className="mt-4 text-sm text-green-600 font-medium">Presença registrada automaticamente!</p>
                </div>
              ) : capturedImage ? (
                <div className="animate-pulse">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                  <p>Processando imagem...</p>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <XCircle className="h-16 w-16 opacity-20 mx-auto mb-4" />
                  <p>Aguardando captura para identificação.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </LayoutShell>
  );
}
