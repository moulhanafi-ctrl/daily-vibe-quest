import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function TestGoogleAPI() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [mapsJsTest, setMapsJsTest] = useState<any>({ status: "pending" });

  // Test Maps JavaScript API (frontend)
  useEffect(() => {
    const testMapsJS = async () => {
      setMapsJsTest({ status: "testing" });
      
      try {
        // Get the API key from environment
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        
        if (!apiKey) {
          setMapsJsTest({ 
            status: "WARNING", 
            error: { 
              code: "KEY_NOT_SET", 
              message: "VITE_GOOGLE_MAPS_API_KEY not configured in frontend environment. Set this to the same value as GOOGLE_MAPS_API_KEY for Maps JavaScript API to work." 
            }
          });
          return;
        }

        // Try to load the Maps JavaScript API
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        
        const loadPromise = new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          setTimeout(() => reject(new Error('Timeout loading API')), 10000);
        });

        document.head.appendChild(script);
        await loadPromise;

        // Verify google.maps is available
        if (typeof (window as any).google !== 'undefined' && (window as any).google.maps) {
          setMapsJsTest({ 
            status: "OK",
            message: "Maps JavaScript API loaded successfully",
            latency: 0
          });
        } else {
          setMapsJsTest({ 
            status: "ERROR",
            error: { code: "LOAD_FAILED", message: "API script loaded but google.maps not available" }
          });
        }
      } catch (err: any) {
        setMapsJsTest({ 
          status: "ERROR",
          error: { 
            code: "LOAD_FAILED", 
            message: err.message || "Failed to load Maps JavaScript API"
          }
        });
      }
    };

    testMapsJS();
  }, []);

  const runTest = async () => {
    setLoading(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("help-test-google");
      
      if (error) throw error;
      setResults(data);
    } catch (err: any) {
      setResults({
        error: err.message,
        overallStatus: "UNHEALTHY"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Google Maps API Diagnostic</CardTitle>
          <CardDescription>
            Test your Google Maps API configuration for the Help Near Me feature
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runTest} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Run Diagnostic Test
          </Button>

          {/* Frontend Maps JS Test */}
          <div className="space-y-3">
            <h3 className="font-semibold">Frontend API Test</h3>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">Maps JavaScript API</span>
                      {mapsJsTest.status === "OK" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : mapsJsTest.status === "testing" || mapsJsTest.status === "pending" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : mapsJsTest.status === "WARNING" ? (
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Status: {mapsJsTest.status}
                    </p>
                    {mapsJsTest.message && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {mapsJsTest.message}
                      </p>
                    )}
                    {mapsJsTest.error && (
                      <div className="mt-2">
                        <p className="text-sm text-destructive font-medium">
                          Error Code: {mapsJsTest.error.code}
                        </p>
                        <p className="text-sm text-destructive">
                          {mapsJsTest.error.message}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {results && (
            <div className="space-y-4">
              <Alert variant={
                results.overallStatus === "HEALTHY" && (mapsJsTest.status === "OK" || mapsJsTest.status === "WARNING")
                  ? "default" 
                  : "destructive"
              }>
                <AlertDescription className="font-medium flex items-center gap-2">
                  {results.overallStatus === "HEALTHY" && (mapsJsTest.status === "OK" || mapsJsTest.status === "WARNING") ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  {results.overallStatus === "HEALTHY" && (mapsJsTest.status === "OK" || mapsJsTest.status === "WARNING")
                    ? "✅ All Google Maps APIs are operational" 
                    : "❌ Google Maps API issues detected"}
                </AlertDescription>
              </Alert>

              {results.recommendation && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{results.recommendation}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <h3 className="font-semibold">Configuration</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm">API Key Configured:</span>
                  <Badge variant={results.apiKey?.configured ? "default" : "destructive"}>
                    {results.apiKey?.configured ? "Yes" : "No"}
                  </Badge>
                  {results.apiKey?.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({results.apiKey.length} chars)
                    </span>
                  )}
                </div>
                {results.apiKey?.preview && (
                  <p className="text-xs text-muted-foreground">
                    Key preview: {results.apiKey.preview}
                  </p>
                )}
              </div>

              {results.tests && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Backend API Tests</h3>
                  
                  {/* Geocoding API */}
                  {results.tests.geocoding && (
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">Geocoding API</span>
                              {results.tests.geocoding.status === "OK" ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Status: {results.tests.geocoding.status}
                            </p>
                            {results.tests.geocoding.latency > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Latency: {results.tests.geocoding.latency}ms
                              </p>
                            )}
                            {results.tests.geocoding.error && (
                              <div className="mt-2">
                                <p className="text-sm text-destructive font-medium">
                                  Error Code: {results.tests.geocoding.error.code}
                                </p>
                                <p className="text-sm text-destructive">
                                  {results.tests.geocoding.error.message}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Places API (New) */}
                  {results.tests.places && (
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">Places API (New)</span>
                              {results.tests.places.status === "OK" ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Status: {results.tests.places.status}
                            </p>
                            {results.tests.places.latency > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Latency: {results.tests.places.latency}ms
                              </p>
                            )}
                            {results.tests.places.resultsCount !== undefined && (
                              <p className="text-sm text-green-600 mt-1">
                                ✓ Found {results.tests.places.resultsCount} test results
                              </p>
                            )}
                            {results.tests.places.error && (
                              <div className="mt-2">
                                <p className="text-sm text-destructive font-medium">
                                  Error Code: {results.tests.places.error.code}
                                </p>
                                <p className="text-sm text-destructive">
                                  {results.tests.places.error.message}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {results.timestamp && (
                <p className="text-xs text-muted-foreground">
                  Test run at: {new Date(results.timestamp).toLocaleString()}
                </p>
              )}

              {results.error && !results.tests && (
                <Alert variant="destructive">
                  <AlertDescription>{results.error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-medium">If tests are failing:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Go to Google Cloud Console</li>
            <li>Enable these APIs: <strong>Maps JavaScript API</strong>, <strong>Geocoding API</strong>, and <strong>Places API (New)</strong></li>
            <li>Disable the old "Places API" (legacy)</li>
            <li>Ensure billing is enabled (required for API calls)</li>
            <li>Update API key restrictions to include all three APIs</li>
            <li>Add your domains to HTTP referrer restrictions:
              <ul className="list-disc list-inside ml-4 mt-1 text-xs">
                <li>https://dailyvibecheck.com/*</li>
                <li>https://www.dailyvibecheck.com/*</li>
                <li>https://*.lovable.app/*</li>
                <li>localhost (for local testing)</li>
              </ul>
            </li>
            <li className="mt-2"><strong>Important:</strong> Set both <code className="bg-muted px-1 py-0.5 rounded">GOOGLE_MAPS_API_KEY</code> (for backend) and <code className="bg-muted px-1 py-0.5 rounded">VITE_GOOGLE_MAPS_API_KEY</code> (for frontend) secrets to the same API key value</li>
          </ol>
        </CardContent>
      </Card>

      <Card className="mt-4 border-primary/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            📊 Monitoring & Operations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium mb-2">Production Monitoring:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Structured logging with event tracking</li>
              <li>10-minute edge cache for optimal performance</li>
              <li>Rate limiting: 30 requests/min per IP</li>
              <li>Anomaly detection: &gt;20 unique ZIPs/min triggers alerts</li>
            </ul>
          </div>
          
          <div className="bg-muted p-3 rounded-md">
            <p className="font-medium mb-1">📖 Full Operations Runbook:</p>
            <p className="text-xs text-muted-foreground mb-2">
              Complete monitoring guide including alert thresholds, incident response, and troubleshooting procedures.
            </p>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a 
                href="https://github.com/yourusername/yourrepo/blob/main/src/docs/HELP_NEARBY_MONITORING.md" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Monitoring Runbook
              </a>
            </Button>
          </div>

          <div>
            <p className="font-medium mb-2">Key Alert Thresholds:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
              <li>Error rate &gt; 2% (10 min window)</li>
              <li>P95 latency &gt; 2000ms (10 min window)</li>
              <li>Rate limit hits &gt; 200/10min</li>
              <li>Google API quota at 80% daily limit</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
