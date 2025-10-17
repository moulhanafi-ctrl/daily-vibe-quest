import { AlertTriangle, Phone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const CrisisBanner = () => {
  return (
    <section className="w-full bg-destructive/10 border-y-4 border-destructive py-8" role="alert" aria-live="polite">
      <div className="container mx-auto px-4">
        <Alert variant="destructive" className="bg-destructive/90 border-destructive shadow-lg">
          <AlertTriangle className="h-6 w-6" />
          <AlertDescription className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1 space-y-2">
                <h2 className="text-xl font-bold text-white">
                  Need Immediate Help?
                </h2>
                <p className="text-base text-white/90">
                  <strong>Daily Vibe Check is a mental wellness platform and does not provide medical advice, diagnosis, or clinical services.</strong> If you are in crisis or need immediate support, please reach out to a professional.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <a 
                  href="tel:988" 
                  className="inline-flex"
                  aria-label="Call 988 Suicide and Crisis Lifeline"
                >
                  <Button 
                    size="lg" 
                    className="bg-white hover:bg-white/90 text-destructive font-bold min-h-[56px] text-lg shadow-xl w-full sm:w-auto"
                  >
                    <Phone className="h-5 w-5 mr-2" />
                    Call 988
                  </Button>
                </a>
                <a 
                  href="sms:988" 
                  className="inline-flex"
                  aria-label="Text 988 Suicide and Crisis Lifeline"
                >
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20 border-white text-white font-semibold min-h-[56px] text-lg w-full sm:w-auto"
                  >
                    Text 988
                  </Button>
                </a>
              </div>
            </div>
            <p className="text-sm text-white/80 pt-2 border-t border-white/20">
              The 988 Suicide & Crisis Lifeline provides 24/7 free and confidential support for people in distress.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    </section>
  );
};
