import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface VoiceOrderButtonProps {
  onVoiceCommand: (transcription: string) => Promise<void>;
  disabled?: boolean;
  language: string;
}

export function VoiceOrderButton({ onVoiceCommand, disabled, language }: VoiceOrderButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
      setTranscription("");

      toast({
        title: language === "es" ? "Escuchando..." : "Listening...",
        description: language === "es" 
          ? "Hable ahora para agregar productos" 
          : "Speak now to add products",
      });
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        title: "Error",
        description: language === "es"
          ? "No se pudo acceder al micrófono"
          : "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("language", language);

      const response = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Transcription failed");

      const data = await response.json();
      setTranscription(data.text);

      // Process the voice command
      await onVoiceCommand(data.text);

      toast({
        title: language === "es" ? "Comando procesado" : "Command processed",
        description: data.text,
      });
    } catch (error) {
      console.error("Error processing audio:", error);
      toast({
        title: "Error",
        description: language === "es"
          ? "No se pudo procesar el audio"
          : "Could not process audio",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-stop after 5 seconds of listening
  useEffect(() => {
    if (isListening) {
      const timer = setTimeout(() => {
        stopListening();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isListening]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col items-end gap-2">
        {transcription && (
          <Card className="p-3 max-w-sm">
            <p className="text-sm">{transcription}</p>
          </Card>
        )}
        
        {(isListening || isProcessing) && (
          <Badge variant="secondary" className="animate-pulse">
            {isProcessing ? (
              language === "es" ? "Procesando..." : "Processing..."
            ) : (
              language === "es" ? "Escuchando..." : "Listening..."
            )}
          </Badge>
        )}

        <Button
          size="icon"
          className={`h-16 w-16 rounded-full shadow-lg transition-all ${
            isListening ? "bg-destructive hover:bg-destructive/90 animate-pulse" : ""
          }`}
          onClick={isListening ? stopListening : startListening}
          disabled={disabled || isProcessing}
          data-testid="button-voice-order"
        >
          {isProcessing ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : isListening ? (
            <MicOff className="h-8 w-8" />
          ) : (
            <Mic className="h-8 w-8" />
          )}
        </Button>
      </div>
    </div>
  );
}
