import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Mic, Square, Upload } from "lucide-react";

interface VoiceRecorderProps {
  onRecordingComplete: (audioUrl: string, transcript: string) => void;
  onCancel: () => void;
}

export const VoiceRecorder = ({ onRecordingComplete, onCancel }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await processRecording();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to record voice notes",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const processRecording = async () => {
    setIsProcessing(true);
    try {
      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload to storage
      const fileName = `${user.id}/${Date.now()}.webm`;
      const { error: uploadError, data } = await supabase.storage
        .from("voice-notes")
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("voice-notes")
        .getPublicUrl(fileName);

      // Convert to base64 for transcription
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(",")[1];
        
        // Call transcription edge function
        const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke(
          "transcribe-audio",
          { body: { audio: base64Audio } }
        );

        if (transcriptionError) {
          console.error("Transcription error:", transcriptionError);
          onRecordingComplete(publicUrl, "");
        } else {
          onRecordingComplete(publicUrl, transcriptionData.text || "");
        }
      };
    } catch (error: any) {
      toast({
        title: "Error processing recording",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="text-center space-y-2">
        {isRecording && (
          <div className="text-2xl font-mono text-primary">
            {formatTime(recordingTime)}
          </div>
        )}
        {isProcessing && (
          <div className="space-y-2">
            <Progress value={undefined} className="w-full" />
            <p className="text-sm text-muted-foreground">Processing recording...</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!isRecording && !isProcessing && (
          <>
            <Button onClick={startRecording} className="flex-1">
              <Mic className="w-4 h-4 mr-2" />
              Start Recording
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </>
        )}
        {isRecording && (
          <Button onClick={stopRecording} variant="destructive" className="flex-1">
            <Square className="w-4 h-4 mr-2" />
            Stop Recording
          </Button>
        )}
      </div>
    </div>
  );
};
