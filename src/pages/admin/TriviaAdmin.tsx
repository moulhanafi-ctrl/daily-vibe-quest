import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Plus, Pencil, Trash2, Play, Calendar, Video, Eye } from "lucide-react";

interface TriviaQuestion {
  id: string;
  locale: string;
  age_group: string;
  category: string;
  type: string;
  prompt: string;
  options: any;
  correct_option_id: string;
  explanation: string;
  tags: string[];
  sensitive: boolean;
  active: boolean;
}

interface TriviaRound {
  id: string;
  date: string;
  age_group: string;
  question_ids: string[];
}

export default function TriviaAdmin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [rounds, setRounds] = useState<TriviaRound[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<TriviaQuestion | null>(null);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [showRoundDialog, setShowRoundDialog] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [generationLogs, setGenerationLogs] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [wellnessVideos, setWellnessVideos] = useState<any[]>([]);
  const [isFetchingWellness, setIsFetchingWellness] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    locale: "en",
    age_group: "adult",
    category: "feelings",
    type: "mcq",
    prompt: "",
    options: [{ id: "a", text: "", emoji: "" }],
    correct_option_id: "a",
    explanation: "",
    tags: "",
    sensitive: false,
    active: true,
  });

  const [roundForm, setRoundForm] = useState({
    date: "",
    age_group: "adult",
    question_ids: [] as string[],
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (hasAccess) {
      loadQuestions();
      loadRounds();
      loadStats();
      loadGenerationLogs();
      loadWellnessVideos();
    }
  }, [hasAccess]);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role, admin_role")
        .eq("user_id", session.user.id)
        .single();

      if (error || !roles || (!["admin"].includes(roles.role) && !["owner", "moderator"].includes(roles.admin_role))) {
        toast({
          title: "Access Denied",
          description: "You need admin privileges to access this page.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setHasAccess(true);
    } catch (error) {
      console.error("Access check error:", error);
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("trivia_questions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error("Failed to load questions:", error);
      toast({
        title: "Error",
        description: "Failed to load trivia questions",
        variant: "destructive",
      });
    }
  };

  const loadRounds = async () => {
    try {
      const { data, error } = await supabase
        .from("trivia_rounds")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;
      setRounds(data || []);
    } catch (error) {
      console.error("Failed to load rounds:", error);
    }
  };

  const loadStats = async () => {
    try {
      const { data: progressData } = await supabase
        .from("trivia_progress")
        .select("round_id, score, correct, total, streak");

      if (progressData) {
        const totalPlays = progressData.length;
        const avgScore = progressData.reduce((acc, p) => acc + p.score, 0) / totalPlays || 0;
        const maxStreak = Math.max(...progressData.map(p => p.streak), 0);
        const completionRate = progressData.length > 0 
          ? (progressData.filter(p => p.correct === p.total).length / totalPlays * 100)
          : 0;

        setStats({
          totalPlays,
          avgScore: avgScore.toFixed(1),
          maxStreak,
          completionRate: completionRate.toFixed(1),
        });
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadGenerationLogs = async () => {
    try {
      const { data } = await supabase
        .from('trivia_generation_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) setGenerationLogs(data);
    } catch (error) {
      console.error('Failed to load generation logs:', error);
    }
  };

  const loadWellnessVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('trivia_break_videos')
        .select('*')
        .order('week_key', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setWellnessVideos(data || []);
    } catch (error) {
      console.error('Failed to load wellness videos:', error);
    }
  };

  const handleFetchWellnessVideos = async () => {
    setIsFetchingWellness(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-youtube-wellness-shorts', {
        body: { 
          topics: ["self care", "mindfulness", "deep breathing", "motivation", "gratitude"],
          manual: true 
        }
      });

      if (error) throw error;

      toast({
        title: "Wellness Videos Fetched!",
        description: `Saved ${data.videos} videos for week ${data.week_key}`,
      });

      // Reload videos
      await loadWellnessVideos();
    } catch (error: any) {
      toast({
        title: "Fetch Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsFetchingWellness(false);
    }
  };

  const handleGenerateRounds = async () => {
    if (!confirm('Generate trivia rounds for this week? This will create ~288 questions across all ages and languages.')) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('trivia-generate-weekly-rounds');

      if (error) throw error;

      toast({ 
        title: 'Generation started',
        description: 'Check generation logs below for progress.' 
      });

      // Reload after a delay
      setTimeout(() => {
        loadGenerationLogs();
        loadRounds();
        loadQuestions();
        setIsGenerating(false);
      }, 5000);
    } catch (error: any) {
      toast({
        title: 'Generation failed',
        description: error.message,
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  const handlePublishRounds = async () => {
    if (!confirm('Publish all pending rounds for this Saturday?')) return;

    try {
      const { data, error } = await supabase.functions.invoke('trivia-publish-rounds');

      if (error) throw error;

      toast({ 
        title: 'Rounds published',
        description: `Published ${data?.published || 0} rounds.` 
      });

      loadRounds();
      loadGenerationLogs();
    } catch (error: any) {
      toast({
        title: 'Publishing failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSaveQuestion = async () => {
    try {
      const questionData = {
        locale: formData.locale,
        age_group: formData.age_group as 'child' | 'teen' | 'adult' | 'elder',
        category: formData.category,
        type: formData.type,
        prompt: formData.prompt,
        options: formData.options,
        correct_option_id: formData.correct_option_id,
        explanation: formData.explanation,
        tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
        sensitive: formData.sensitive,
        active: formData.active,
      };

      if (editingQuestion) {
        const { error } = await supabase
          .from("trivia_questions")
          .update(questionData)
          .eq("id", editingQuestion.id);

        if (error) throw error;
        toast({ title: "Question updated successfully" });
      } else {
        const { error } = await supabase
          .from("trivia_questions")
          .insert(questionData);

        if (error) throw error;
        toast({ title: "Question created successfully" });
      }

      setShowQuestionDialog(false);
      setEditingQuestion(null);
      resetForm();
      loadQuestions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Delete this question?")) return;

    try {
      const { error } = await supabase
        .from("trivia_questions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Question deleted" });
      loadQuestions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveRound = async () => {
    try {
      const { error } = await supabase
        .from("trivia_rounds")
        .insert({
          date: roundForm.date,
          age_group: roundForm.age_group as 'child' | 'teen' | 'adult' | 'elder',
          question_ids: roundForm.question_ids,
        });

      if (error) throw error;
      toast({ title: "Round created successfully" });
      setShowRoundDialog(false);
      setRoundForm({ date: "", age_group: "adult", question_ids: [] });
      loadRounds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      locale: "en",
      age_group: "adult",
      category: "feelings",
      type: "mcq",
      prompt: "",
      options: [{ id: "a", text: "", emoji: "" }],
      correct_option_id: "a",
      explanation: "",
      tags: "",
      sensitive: false,
      active: true,
    });
  };

  const openEditDialog = (question: TriviaQuestion) => {
    setEditingQuestion(question);
    setFormData({
      locale: question.locale,
      age_group: question.age_group,
      category: question.category,
      type: question.type,
      prompt: question.prompt,
      options: question.options,
      correct_option_id: question.correct_option_id,
      explanation: question.explanation,
      tags: question.tags.join(", "),
      sensitive: question.sensitive,
      active: question.active,
    });
    setShowQuestionDialog(true);
  };

  const addOption = () => {
    const newId = String.fromCharCode(97 + formData.options.length);
    setFormData({
      ...formData,
      options: [...formData.options, { id: newId, text: "", emoji: "" }],
    });
  };

  const updateOption = (index: number, field: string, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData({ ...formData, options: newOptions });
  };

  const removeOption = (index: number) => {
    if (formData.options.length <= 2) return;
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">Saturday Trivia Admin</h1>
          <p className="text-muted-foreground">Manage questions, rounds, and view stats</p>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Plays</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPlays}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgScore}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Max Streak</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.maxStreak} weeks</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completion Rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completionRate}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
            <TabsTrigger value="rounds">Rounds ({rounds.length})</TabsTrigger>
            <TabsTrigger value="autogen">Auto-Gen</TabsTrigger>
            <TabsTrigger value="wellness">Wellness Breaks</TabsTrigger>
          </TabsList>

          <TabsContent value="autogen">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Auto-Generation</CardTitle>
                    <CardDescription>AI-powered weekly trivia generation</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleGenerateRounds}
                      disabled={isGenerating}
                    >
                      {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                      Generate This Week
                    </Button>
                    <Button 
                      onClick={handlePublishRounds}
                      variant="outline"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Publish Pending
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold">How It Works</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• <strong>Friday 6pm:</strong> Auto-generates 5-7 questions per age/locale (EN/ES/FR/AR)</li>
                    <li>• <strong>Saturday 9:55am:</strong> Auto-publishes approved rounds</li>
                    <li>• <strong>Saturday 10am:</strong> Sends notifications to users</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    Using <strong>Lovable AI (google/gemini-2.5-flash)</strong> - FREE during promo period
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Generation Logs (Last 20)</h3>
                  {generationLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No generation logs yet. Click "Generate This Week" to start.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Week</TableHead>
                          <TableHead>Age Group</TableHead>
                          <TableHead>Locale</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Questions</TableHead>
                          <TableHead>Dropped</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {generationLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>{log.week}</TableCell>
                            <TableCell className="capitalize">{log.age_group}</TableCell>
                            <TableCell className="uppercase">{log.locale}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  log.status === 'success' ? 'default' : 
                                  log.status === 'failed' ? 'destructive' : 
                                  'secondary'
                                }
                              >
                                {log.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{log.kept_ids?.length || 0}</TableCell>
                            <TableCell>{log.dropped_reasons?.length || 0}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">⚠️ Setup Required</h4>
                  <p className="text-sm">
                    To enable automated weekly generation, set up pg_cron jobs in Supabase. 
                    See <code className="bg-black/10 px-1 rounded">src/docs/TRIVIA_AUTO_GEN_SETUP.md</code> for instructions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wellness">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Wellness Breaks</CardTitle>
                    <CardDescription>YouTube wellness shorts between trivia sessions</CardDescription>
                  </div>
                  <Button 
                    onClick={handleFetchWellnessVideos}
                    disabled={isFetchingWellness}
                  >
                    {isFetchingWellness ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Video className="h-4 w-4 mr-2" />}
                    Run Wellness Fetch Now
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold">How It Works</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• <strong>Friday 6pm:</strong> Auto-fetches 2 wellness videos (30-60s) from YouTube</li>
                    <li>• <strong>Break 1:</strong> Shown between Session 1 and 2</li>
                    <li>• <strong>Break 2:</strong> Shown between Session 2 and 3</li>
                    <li>• <strong>Features:</strong> Captions ON, channel attribution, progress tracking</li>
                    <li>• <strong>Fallback:</strong> Uses stock video if YouTube API fails</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Recent Videos ({wellnessVideos.length})</h3>
                  {wellnessVideos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No wellness videos yet. Click "Run Wellness Fetch Now" to populate.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Week</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Channel</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Preview</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wellnessVideos.map((video) => (
                          <TableRow key={video.id}>
                            <TableCell>{new Date(video.week_key).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                Break {video.break_position}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{video.title}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{video.channel_name}</TableCell>
                            <TableCell>{video.duration_seconds}s</TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => setPreviewVideo(video)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">⚠️ Setup Required</h4>
                  <p className="text-sm">
                    To enable automated weekly fetching, set up pg_cron job in Supabase. 
                    See <code className="bg-black/10 px-1 rounded">src/docs/YOUTUBE_WELLNESS_CRON_SETUP.sql</code> for instructions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Trivia Questions</CardTitle>
                    <CardDescription>Create and manage trivia questions</CardDescription>
                  </div>
                  <Button onClick={() => { resetForm(); setShowQuestionDialog(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prompt</TableHead>
                      <TableHead>Locale</TableHead>
                      <TableHead>Age Group</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="max-w-xs truncate">{q.prompt}</TableCell>
                        <TableCell>{q.locale.toUpperCase()}</TableCell>
                        <TableCell>{q.age_group}</TableCell>
                        <TableCell>{q.category}</TableCell>
                        <TableCell>{q.type}</TableCell>
                        <TableCell>
                          <Badge variant={q.active ? "default" : "secondary"}>
                            {q.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => openEditDialog(q)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteQuestion(q.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rounds">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Trivia Rounds</CardTitle>
                    <CardDescription>Schedule weekly trivia rounds</CardDescription>
                  </div>
                  <Button onClick={() => setShowRoundDialog(true)}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Create Round
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Age Group</TableHead>
                      <TableHead>Questions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rounds.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.date}</TableCell>
                        <TableCell>{r.age_group}</TableCell>
                        <TableCell>{r.question_ids.length} questions</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Question Dialog */}
        <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? "Edit Question" : "Create Question"}</DialogTitle>
              <DialogDescription>Fill in the question details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Locale</Label>
                  <Select value={formData.locale} onValueChange={(v) => setFormData({ ...formData, locale: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Age Group</Label>
                  <Select value={formData.age_group} onValueChange={(v) => setFormData({ ...formData, age_group: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="child">Child (5-12)</SelectItem>
                      <SelectItem value="teen">Teen (13-17)</SelectItem>
                      <SelectItem value="adult">Adult (18-60)</SelectItem>
                      <SelectItem value="elder">Elder (61+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feelings">Feelings</SelectItem>
                      <SelectItem value="coping">Coping</SelectItem>
                      <SelectItem value="empathy">Empathy</SelectItem>
                      <SelectItem value="communication">Communication</SelectItem>
                      <SelectItem value="habits">Habits</SelectItem>
                      <SelectItem value="values">Values</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">Multiple Choice</SelectItem>
                      <SelectItem value="emoji">Emoji</SelectItem>
                      <SelectItem value="scenario">Scenario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Prompt</Label>
                <Textarea
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  placeholder="Enter the question prompt"
                />
              </div>

              <div>
                <Label>Options</Label>
                {formData.options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <Input
                      placeholder="Option text"
                      value={opt.text}
                      onChange={(e) => updateOption(idx, "text", e.target.value)}
                    />
                    <Input
                      placeholder="Emoji (optional)"
                      value={opt.emoji}
                      onChange={(e) => updateOption(idx, "emoji", e.target.value)}
                      className="w-24"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeOption(idx)}
                      disabled={formData.options.length <= 2}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={addOption}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Option
                </Button>
              </div>

              <div>
                <Label>Correct Answer</Label>
                <Select value={formData.correct_option_id} onValueChange={(v) => setFormData({ ...formData, correct_option_id: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.options.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.id.toUpperCase()}: {opt.text || "(empty)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Explanation</Label>
                <Textarea
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  placeholder="Explain why this is the correct answer"
                />
              </div>

              <div>
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="anxiety, sleep, etc."
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.sensitive}
                    onCheckedChange={(checked) => setFormData({ ...formData, sensitive: checked })}
                  />
                  <Label>Sensitive Content</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                  <Label>Active</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveQuestion}>
                {editingQuestion ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Round Dialog */}
        <Dialog open={showRoundDialog} onOpenChange={setShowRoundDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Trivia Round</DialogTitle>
              <DialogDescription>Schedule a new weekly round</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Date (Saturday)</Label>
                <Input
                  type="date"
                  value={roundForm.date}
                  onChange={(e) => setRoundForm({ ...roundForm, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Age Group</Label>
                <Select value={roundForm.age_group} onValueChange={(v) => setRoundForm({ ...roundForm, age_group: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="teen">Teen</SelectItem>
                    <SelectItem value="adult">Adult</SelectItem>
                    <SelectItem value="elder">Elder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Questions (select 5-7)</Label>
                <div className="border rounded p-2 max-h-48 overflow-y-auto space-y-1">
                  {questions
                    .filter(q => q.active && q.age_group === roundForm.age_group)
                    .map(q => (
                      <div key={q.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={roundForm.question_ids.includes(q.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRoundForm({
                                ...roundForm,
                                question_ids: [...roundForm.question_ids, q.id],
                              });
                            } else {
                              setRoundForm({
                                ...roundForm,
                                question_ids: roundForm.question_ids.filter(id => id !== q.id),
                              });
                            }
                          }}
                        />
                        <span className="text-sm truncate">{q.prompt}</span>
                      </div>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {roundForm.question_ids.length} selected
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRoundDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveRound} disabled={roundForm.question_ids.length < 5}>
                Create Round
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Video Preview Modal */}
        <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{previewVideo?.title}</DialogTitle>
              <DialogDescription>
                From {previewVideo?.channel_name} • {previewVideo?.duration_seconds}s
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {previewVideo && (
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${previewVideo.youtube_video_id}?cc_load_policy=1`}
                    title={previewVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">{previewVideo?.tip_content}</p>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Informational only — this is not medical advice
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewVideo(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
