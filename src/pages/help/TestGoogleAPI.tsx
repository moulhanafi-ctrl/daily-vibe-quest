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
        overall: "❌ Test failed to run"
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
              <Alert variant={results.overall?.includes("✅") ? "default" : "destructive"}>
                <AlertDescription className="font-medium">
                  {results.overall}
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
                  <Badge variant={results.apiKeyConfigured ? "default" : "destructive"}>
                    {results.apiKeyConfigured ? "Yes" : "No"}
                  </Badge>
                  {results.apiKeyLength > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({results.apiKeyLength} chars)
                    </span>
                  )}
                </div>
              </div>

              {results.tests && (
                <div className="space-y-3">
                  <h3 className="font-semibold">API Tests</h3>
                  
                  {/* Geocoding API */}
                  {results.tests.geocoding && (
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">Geocoding API</span>
                              {results.tests.geocoding.success ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Status: {results.tests.geocoding.status}
                            </p>
                            {results.tests.geocoding.error && (
                              <p className="text-sm text-destructive mt-1">
                                Error: {results.tests.geocoding.error}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Places API */}
                  {results.tests.places && (
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">Places API</span>
                              {results.tests.places.success ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Status: {results.tests.places.status}
                            </p>
                            {results.tests.places.resultsCount > 0 && (
                              <p className="text-sm text-green-600 mt-1">
                                Found {results.tests.places.resultsCount} test results
                              </p>
                            )}
                            {results.tests.places.error && (
                              <p className="text-sm text-destructive mt-1">
                                Error: {results.tests.places.error}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
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
          <CardTitle className="text-lg">How to Fix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-medium">If tests are failing:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Go to Google Cloud Console</li>
            <li>Enable both "Geocoding API" and "Places API"</li>
            <li>Ensure billing is enabled (required for API calls)</li>
            <li>Check API key restrictions - remove HTTP referrer restrictions or add your domain</li>
            <li>Update the GOOGLE_MAPS_API_KEY secret with a valid key</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
