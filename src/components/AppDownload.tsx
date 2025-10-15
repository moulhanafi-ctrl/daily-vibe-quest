import { AppleIcon } from "lucide-react";
import iphoneMockup from "@/assets/iphone-mockup.png";
import androidMockup from "@/assets/android-mockup.png";

export const AppDownload = () => {
  return (
    <section className="py-12 sm:py-20 bg-gradient-to-b from-background via-secondary/5 to-background">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Two-column grid */}
          <div className="grid items-center gap-8 md:gap-12 lg:grid-cols-2 rounded-2xl bg-card/70 backdrop-blur-sm border border-border/50 p-6 sm:p-10 shadow-lg">
            
            {/* Left Column: Content */}
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent leading-tight">
                  Available on iPhone & Android
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground">
                  Download Vibe Check and start your daily wellness journey.
                </p>
              </div>

              {/* Benefits */}
              <ul className="space-y-2 text-sm sm:text-base text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>Track your mood and mental health journey</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>Join supportive community chat rooms</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>Access resources and professional help</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>Family mode for connected care</span>
                </li>
              </ul>

              {/* Store Badges */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
                {/* App Store Badge */}
                <a
                  href="#"
                  className="group inline-block min-h-[44px]"
                  aria-label="Download on the App Store"
                >
                  <div className="relative overflow-hidden rounded-lg bg-black hover:bg-gray-900 transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-xl">
                    <div className="px-5 py-2.5 flex items-center gap-2.5">
                      <AppleIcon className="w-7 h-7 text-white flex-shrink-0" />
                      <div className="text-left">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">
                          Download on the
                        </div>
                        <div className="text-lg font-semibold text-white leading-tight">
                          App Store
                        </div>
                      </div>
                    </div>
                  </div>
                </a>

                {/* Google Play Badge */}
                <a
                  href="#"
                  className="group inline-block min-h-[44px]"
                  aria-label="Get it on Google Play"
                >
                  <div className="relative overflow-hidden rounded-lg bg-black hover:bg-gray-900 transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-xl">
                    <div className="px-5 py-2.5 flex items-center gap-2.5">
                      <svg
                        className="w-7 h-7 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3.609 1.814L13.792 12 3.609 22.186a.996.996 0 0 1-.609-.92V2.734a.996.996 0 0 1 .609-.92z"
                          fill="url(#gp-grad-1)"
                        />
                        <path
                          d="M14.5 12.707l3.139 3.139-10.821 6.16a1.002 1.002 0 0 1-.904.02l8.586-9.319z"
                          fill="url(#gp-grad-2)"
                        />
                        <path
                          d="M17.639 8.154L14.5 11.293 5.914 2.707a.997.997 0 0 1 .904-.02l10.821 6.16z"
                          fill="url(#gp-grad-3)"
                        />
                        <path
                          d="M20.607 10.154l-2.968 1.688-3.139-3.139 3.139-3.139 2.968 1.688a1 1 0 0 1 0 1.742v1.16z"
                          fill="url(#gp-grad-4)"
                        />
                        <defs>
                          <linearGradient id="gp-grad-1" x1="8.203" y1="1.034" x2="0.673" y2="8.564" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#00A0FF" />
                            <stop offset="1" stopColor="#00A1FF" />
                          </linearGradient>
                          <linearGradient id="gp-grad-2" x1="16.545" y1="14.793" x2="-0.455" y2="31.793" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#FFE000" />
                            <stop offset="1" stopColor="#FFBD00" />
                          </linearGradient>
                          <linearGradient id="gp-grad-3" x1="1.418" y1="-6.707" x2="11.418" y2="3.293" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#FF3A44" />
                            <stop offset="1" stopColor="#C31162" />
                          </linearGradient>
                          <linearGradient id="gp-grad-4" x1="8.295" y1="9.546" x2="18.295" y2="9.546" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#32A071" />
                            <stop offset="1" stopColor="#2DA771" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="text-left">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">
                          Get it on
                        </div>
                        <div className="text-lg font-semibold text-white leading-tight">
                          Google Play
                        </div>
                      </div>
                    </div>
                  </div>
                </a>
              </div>

              {/* Help Link */}
              <a 
                href="/help" 
                className="inline-block text-sm text-muted-foreground hover:text-foreground underline decoration-primary/50 hover:decoration-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
              >
                Need help installing?
              </a>
            </div>

            {/* Right Column: Device Mockups */}
            <div className="relative animate-fade-in" style={{ animationDelay: "0.2s" }}>
              {/* Gradient Background Blur */}
              <div className="absolute -inset-8 -z-10 rounded-[32px] bg-gradient-to-tr from-primary/20 via-accent/20 to-secondary/20 blur-3xl opacity-60" />
              
              {/* Mockups Container */}
              <div className="relative mx-auto max-w-sm lg:max-w-md">
                {/* iPhone Mockup (Main) */}
                <div className="relative z-10 transition-transform duration-500 hover:scale-105 hover:-translate-y-2">
                  <img
                    src={iphoneMockup}
                    alt="Vibe Check app on iPhone showing mood tracking dashboard"
                    className="w-full h-auto rounded-[2.5rem] shadow-2xl"
                    loading="lazy"
                    width="512"
                    height="1024"
                  />
                </div>

                {/* Android Mockup (Overlapped) */}
                <div className="absolute -right-8 sm:-right-12 top-12 sm:top-16 w-[70%] z-0 transition-transform duration-500 hover:scale-105 hover:rotate-6">
                  <img
                    src={androidMockup}
                    alt="Vibe Check app on Android showing support chat rooms"
                    className="w-full h-auto rounded-[2.5rem] shadow-2xl rotate-3"
                    loading="lazy"
                    width="512"
                    height="1024"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
