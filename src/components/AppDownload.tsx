import { Smartphone, AppleIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export const AppDownload = () => {
  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-background via-secondary/10 to-background">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto p-8 sm:p-12 bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm border-primary/20 shadow-xl">
          <div className="text-center space-y-8">
            {/* Header */}
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Smartphone className="w-8 h-8 text-primary" />
                <AppleIcon className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Available on Android & iPhone
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                Download the app today and start your mental wellness journey on any device
              </p>
            </div>

            {/* Store Badges */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 pt-4">
              {/* Google Play Badge */}
              <a
                href="#"
                className="group relative w-full sm:w-auto animate-scale-in"
                aria-label="Download on Google Play"
              >
                <div className="relative overflow-hidden rounded-xl bg-black hover:bg-gray-900 transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-primary/20">
                  <div className="px-6 py-3 sm:px-8 sm:py-4 flex items-center gap-3">
                    <svg
                      className="w-8 h-8 sm:w-10 sm:h-10"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3.609 1.814L13.792 12 3.609 22.186a.996.996 0 0 1-.609-.92V2.734a.996.996 0 0 1 .609-.92z"
                        fill="url(#google-play-gradient-1)"
                      />
                      <path
                        d="M14.5 12.707l3.139 3.139-10.821 6.16a1.002 1.002 0 0 1-.904.02l8.586-9.319z"
                        fill="url(#google-play-gradient-2)"
                      />
                      <path
                        d="M17.639 8.154L14.5 11.293 5.914 2.707a.997.997 0 0 1 .904-.02l10.821 6.16z"
                        fill="url(#google-play-gradient-3)"
                      />
                      <path
                        d="M20.607 10.154l-2.968 1.688-3.139-3.139 3.139-3.139 2.968 1.688a1 1 0 0 1 0 1.742v1.16z"
                        fill="url(#google-play-gradient-4)"
                      />
                      <defs>
                        <linearGradient
                          id="google-play-gradient-1"
                          x1="8.203"
                          y1="1.034"
                          x2="0.673"
                          y2="8.564"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#00A0FF" />
                          <stop offset="1" stopColor="#00A1FF" />
                        </linearGradient>
                        <linearGradient
                          id="google-play-gradient-2"
                          x1="16.545"
                          y1="14.793"
                          x2="-0.455"
                          y2="31.793"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#FFE000" />
                          <stop offset="1" stopColor="#FFBD00" />
                        </linearGradient>
                        <linearGradient
                          id="google-play-gradient-3"
                          x1="1.418"
                          y1="-6.707"
                          x2="11.418"
                          y2="3.293"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#FF3A44" />
                          <stop offset="1" stopColor="#C31162" />
                        </linearGradient>
                        <linearGradient
                          id="google-play-gradient-4"
                          x1="8.295"
                          y1="9.546"
                          x2="18.295"
                          y2="9.546"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#32A071" />
                          <stop offset="1" stopColor="#2DA771" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="text-left">
                      <div className="text-xs text-gray-400 uppercase tracking-wide">Get it on</div>
                      <div className="text-xl sm:text-2xl font-bold text-white">Google Play</div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              </a>

              {/* App Store Badge */}
              <a
                href="#"
                className="group relative w-full sm:w-auto animate-scale-in"
                style={{ animationDelay: "0.1s" }}
                aria-label="Download on the App Store"
              >
                <div className="relative overflow-hidden rounded-xl bg-black hover:bg-gray-900 transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-accent/20">
                  <div className="px-6 py-3 sm:px-8 sm:py-4 flex items-center gap-3">
                    <AppleIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    <div className="text-left">
                      <div className="text-xs text-gray-400 uppercase tracking-wide">Download on the</div>
                      <div className="text-xl sm:text-2xl font-bold text-white">App Store</div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/10 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              </a>
            </div>

            {/* Additional Info */}
            <div className="pt-6 space-y-2 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <p>✓ Free to download</p>
              <p>✓ Works on all devices</p>
              <p>✓ Secure & private</p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};
