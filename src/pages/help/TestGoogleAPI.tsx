import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function TestGoogleAPI() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

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

          {results && (
            <div className="space-y-4">
              <Alert variant={results.overallStatus === "HEALTHY" ? "default" : "destructive"}>
                <AlertDescription className="font-medium flex items-center gap-2">
                  {results.overallStatus === "HEALTHY" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  {results.overallStatus === "HEALTHY" 
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
                  <h3 className="font-semibold">API Tests</h3>
                  
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
            <li>Enable these APIs: <strong>Geocoding API</strong> and <strong>Places API (New)</strong></li>
            <li>Disable the old "Places API" (legacy)</li>
            <li>Ensure billing is enabled (required for API calls)</li>
            <li>Update API key restrictions to include "Places API (New)"</li>
            <li>Add your domains to HTTP referrer restrictions:
              <ul className="list-disc list-inside ml-4 mt-1 text-xs">
                <li>https://dailyvibecheck.com/*</li>
                <li>https://www.dailyvibecheck.com/*</li>
                <li>https://*.lovable.app/*</li>
                <li>localhost (for local testing)</li>
              </ul>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
