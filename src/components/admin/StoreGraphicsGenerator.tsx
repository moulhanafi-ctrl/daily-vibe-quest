import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const StoreGraphicsGenerator = () => {
  const [generating, setGenerating] = useState<'icon' | 'banner' | null>(null);
  const [iconImage, setIconImage] = useState<string | null>(null);
  const [bannerImage, setBannerImage] = useState<string | null>(null);

  const generateGraphic = async (type: 'icon' | 'banner') => {
    setGenerating(type);
    try {
      const { data, error } = await supabase.functions.invoke('generate-store-graphics', {
        body: { type }
      });

      if (error) throw error;

      if (data.success && data.image) {
        if (type === 'icon') {
          setIconImage(data.image);
          toast.success("App icon generated! Right-click to save.");
        } else {
          setBannerImage(data.image);
          toast.success("Feature banner generated! Right-click to save.");
        }
      } else {
        throw new Error("Failed to generate image");
      }
    } catch (error) {
      console.error("Error generating graphic:", error);
      toast.error(`Failed to generate ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(null);
    }
  };

  const downloadImage = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Store Graphics Generator
        </CardTitle>
        <CardDescription>
          Generate app store graphics using AI based on your brand
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* App Icon */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">App Icon (1024×1024)</h3>
              <p className="text-sm text-muted-foreground">
                Square icon for iOS and Android app stores
              </p>
            </div>
            <Button
              onClick={() => generateGraphic('icon')}
              disabled={generating !== null}
              size="sm"
            >
              {generating === 'icon' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Image className="h-4 w-4 mr-2" />
                  Generate Icon
                </>
              )}
            </Button>
          </div>
          
          {iconImage && (
            <div className="space-y-2">
              <img 
                src={iconImage} 
                alt="Generated app icon"
                className="w-64 h-64 rounded-lg border shadow-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadImage(iconImage, 'app-icon-1024x1024.png')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Icon
              </Button>
            </div>
          )}
        </div>

        {/* Feature Banner */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Feature Banner (1024×500)</h3>
              <p className="text-sm text-muted-foreground">
                Horizontal banner for Google Play Store
              </p>
            </div>
            <Button
              onClick={() => generateGraphic('banner')}
              disabled={generating !== null}
              size="sm"
            >
              {generating === 'banner' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Image className="h-4 w-4 mr-2" />
                  Generate Banner
                </>
              )}
            </Button>
          </div>
          
          {bannerImage && (
            <div className="space-y-2">
              <img 
                src={bannerImage} 
                alt="Generated feature banner"
                className="w-full max-w-2xl rounded-lg border shadow-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadImage(bannerImage, 'feature-banner-1024x500.png')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Banner
              </Button>
            </div>
          )}
        </div>

        <div className="p-4 bg-muted rounded-lg text-sm">
          <p className="font-medium mb-2">📝 Next Steps:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Generate both graphics above</li>
            <li>Download the images (right-click or use download button)</li>
            <li>Verify dimensions and quality</li>
            <li>Upload to App Store Connect / Google Play Console</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
