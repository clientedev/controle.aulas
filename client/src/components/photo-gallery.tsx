import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Camera, Trash2, ImagePlus, X, Check, RotateCcw } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FotoAluno } from "@shared/schema";

interface PhotoGalleryProps {
  alunoId: number;
  alunoNome: string;
}

export function PhotoGallery({ alunoId, alunoNome }: PhotoGalleryProps) {
  const { toast } = useToast();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { data: fotos = [], isLoading } = useQuery<FotoAluno[]>({
    queryKey: ["/api/alunos", alunoId, "fotos"],
    queryFn: async () => {
      const res = await fetch(`/api/alunos/${alunoId}/fotos`);
      if (!res.ok) throw new Error("Erro ao carregar fotos");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fotoId: number) => {
      await apiRequest("DELETE", `/api/fotos/${fotoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alunos", alunoId, "fotos"] });
      toast({ title: "Foto removida com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao remover foto", variant: "destructive" });
    },
  });

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast({ title: "Erro ao acessar a câmera", description: "Verifique as permissões do navegador", variant: "destructive" });
      setCameraOpen(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleOpenCamera = () => {
    setCameraOpen(true);
    setCapturedPhotos([]);
  };

  const handleCloseCamera = () => {
    stopCamera();
    setCameraOpen(false);
    setCapturedPhotos([]);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedPhotos((prev) => [...prev, dataUrl]);
  };

  const removeCapture = (index: number) => {
    setCapturedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const dataUrlToBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const uploadPhotos = async () => {
    if (capturedPhotos.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    try {
      for (let i = 0; i < capturedPhotos.length; i++) {
        const dataUrl = capturedPhotos[i];
        const blob = dataUrlToBlob(dataUrl);
        const fileName = `aluno_${alunoId}_${Date.now()}_${i}.jpg`;

        const urlRes = await fetch("/api/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fileName,
            size: blob.size,
            contentType: "image/jpeg",
          }),
        });

        if (!urlRes.ok) throw new Error("Erro ao obter URL de upload");
        const { uploadURL, objectPath } = await urlRes.json();

        const uploadRes = await fetch(uploadURL, {
          method: "PUT",
          body: blob,
          headers: { "Content-Type": "image/jpeg" },
        });

        if (!uploadRes.ok) throw new Error("Erro ao enviar foto");

        await apiRequest("POST", `/api/alunos/${alunoId}/fotos`, { objectPath });
        successCount++;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/alunos", alunoId, "fotos"] });
      toast({ title: `${successCount} foto(s) salva(s) com sucesso` });
      handleCloseCamera();
    } catch {
      toast({ title: "Erro ao salvar fotos", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const getPhotoUrl = (objectPath: string) => {
    return `/api/uploads/url?objectPath=${encodeURIComponent(objectPath)}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Galeria de Fotos
        </CardTitle>
        <Button onClick={handleOpenCamera} data-testid="button-open-camera">
          <ImagePlus className="mr-2 h-4 w-4" />
          Capturar Fotos
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        ) : fotos.length === 0 ? (
          <div className="text-center py-8">
            <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Nenhuma foto capturada ainda.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Capture fotos do rosto do aluno para reconhecimento facial futuro.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {fotos.map((foto) => (
              <div key={foto.id} className="relative group aspect-square" data-testid={`photo-${foto.id}`}>
                <img
                  src={getPhotoUrl(foto.objectPath)}
                  alt={`Foto de ${alunoNome}`}
                  className="w-full h-full object-cover rounded-md border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={() => deleteMutation.mutate(foto.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-photo-${foto.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={cameraOpen} onOpenChange={(open) => !open && handleCloseCamera()}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Capturar Fotos - {alunoNome}</DialogTitle>
              <DialogDescription>
                Capture múltiplas fotos do rosto do aluno para reconhecimento facial.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative bg-black rounded-md overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={() => startCamera()}
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  <Button
                    size="lg"
                    onClick={capturePhoto}
                    className="rounded-full h-16 w-16"
                    data-testid="button-capture"
                  >
                    <Camera className="h-8 w-8" />
                  </Button>
                </div>
              </div>

              {capturedPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {capturedPhotos.length} foto(s) capturada(s)
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {capturedPhotos.map((photo, index) => (
                      <div key={index} className="relative" data-testid={`captured-photo-${index}`}>
                        <img
                          src={photo}
                          alt={`Captura ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-md border"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => removeCapture(index)}
                          data-testid={`button-remove-capture-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCloseCamera} data-testid="button-cancel-capture">
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCapturedPhotos([])}
                  disabled={capturedPhotos.length === 0}
                  data-testid="button-reset-captures"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Limpar
                </Button>
                <Button
                  onClick={uploadPhotos}
                  disabled={capturedPhotos.length === 0 || isUploading}
                  data-testid="button-save-photos"
                >
                  <Check className="mr-2 h-4 w-4" />
                  {isUploading ? "Salvando..." : `Salvar ${capturedPhotos.length} foto(s)`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
