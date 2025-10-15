import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Play, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  id: string;
  title?: string;
  posterUrl?: string;
  hlsUrl?: string;
  mp4Url: string;
  durationSeconds: number;
  uploaderName: string;
  uploaderInitial: string;
  isOwner?: boolean;
  onDelete?: () => void;
  onClick?: () => void;
};

export default function FamilyStoryCard({
  id,
  title,
  posterUrl,
  hlsUrl,
  mp4Url,
  durationSeconds,
  uploaderName,
  uploaderInitial,
  isOwner,
  onDelete,
  onClick
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [isInView, setIsInView] = useState(false);

  // Format duration as mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Lazy load with IntersectionObserver
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // Initialize HLS or fallback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isInView) return;

    // Native HLS support (iOS Safari)
    if (video.canPlayType("application/vnd.apple.mpegURL") && hlsUrl) {
      video.src = hlsUrl;
      setReady(true);
      return;
    }

    // hls.js for browsers without native HLS
    if (Hls.isSupported() && hlsUrl) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setReady(true);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn("HLS error, falling back to MP4:", data);
          if (mp4Url) {
            video.src = mp4Url;
            setReady(true);
          }
        }
      });

      return () => {
        hls.destroy();
      };
    }

    // MP4 fallback
    if (mp4Url) {
      video.src = mp4Url;
      setReady(true);
    }
  }, [hlsUrl, mp4Url, isInView]);

  return (
    <Card className="group rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div 
        className="relative cursor-pointer"
        onClick={onClick}
      >
        <video
          ref={videoRef}
          poster={posterUrl}
          playsInline
          preload="metadata"
          className="w-full aspect-video bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
          }}
        >
          {mp4Url && <source src={mp4Url} type="video/mp4" />}
        </video>
        
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="h-8 w-8 text-primary ml-1" />
          </div>
        </div>

        {/* Duration badge */}
        <span className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded-md bg-black/70 text-white font-medium">
          {formatDuration(durationSeconds)}
        </span>
      </div>

      {/* Card content */}
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs">
              {uploaderInitial}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            {title && (
              <div className="text-sm font-medium line-clamp-1 mb-0.5">
                {title}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              by {uploaderName}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div 
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {isOwner && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
