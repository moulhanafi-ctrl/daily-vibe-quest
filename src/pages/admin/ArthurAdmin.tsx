import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2, Send, Sparkles } from "lucide-react";

interface Template {
  id: string;
  message_type: string;
  focus_area: string;
  age_group: string;
  content: string;
  cooldown_days: number;
  active: boolean;
  priority: number;
}

export default function ArthurAdmin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showNewTemplate, setShowNewTemplate] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role, admin_role')
        .eq('user_id', user.id);

      const isAdmin = roles?.some(r => 
        r.role === 'admin' || 
        ['owner', 'moderator'].includes(r.admin_role)
      );

      if (!isAdmin) {
        toast({
          title: "Access Denied",
          description: "You need admin privileges to access this page",
          variant: "destructive"
        });
        navigate('/dashboard');
        return;
      }

      setHasAccess(true);
      loadTemplates();
    } catch (error) {
      console.error('Error checking access:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('arthur_templates')
      .select('*')
      .order('message_type', { ascending: true })
      .order('focus_area', { ascending: true })
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error loading templates:', error);
      return;
    }

    setTemplates(data || []);
  };

  const saveTemplate = async (template: Partial<Template>) => {
    if (template.id) {
      // Update existing
      const { error } = await supabase
        .from('arthur_templates')
        .update(template as any)
        .eq('id', template.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('arthur_templates')
        .insert(template as any);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
    }

    toast({ title: "Success", description: "Template saved" });
    loadTemplates();
    setEditingTemplate(null);
    setShowNewTemplate(false);
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    const { error } = await supabase
      .from('arthur_templates')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Template deleted" });
    loadTemplates();
  };

  const sendTestNotification = async () => {
    const { data, error } = await supabase.functions.invoke('send-arthur-notifications');
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Test notifications sent!" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) return null;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Arthur Admin</h1>
            <p className="text-muted-foreground">Manage notification templates and settings</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={sendTestNotification} variant="outline">
            <Send className="w-4 h-4 mr-2" />
            Send Test
          </Button>
          <Button onClick={() => setShowNewTemplate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{template.focus_area}</CardTitle>
                      <Badge variant="outline">{template.age_group}</Badge>
                      <Badge>{template.message_type}</Badge>
                      {!template.active && <Badge variant="destructive">Inactive</Badge>}
                    </div>
                    <CardDescription>
                      Priority: {template.priority} | Cooldown: {template.cooldown_days} days
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingTemplate(template)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{template.content}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Metrics</CardTitle>
              <CardDescription>Coming soon: Open rates, click rates, and user engagement</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Arthur Configuration</CardTitle>
              <CardDescription>Global settings for the Arthur persona</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Settings management coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Editor Modal (simplified) */}
      {(editingTemplate || showNewTemplate) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Message Type</Label>
                  <Select defaultValue={editingTemplate?.message_type}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily_motivation">Daily Motivation</SelectItem>
                      <SelectItem value="daily_checkin_nudge">Check-in Nudge</SelectItem>
                      <SelectItem value="weekly_recap">Weekly Recap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Age Group</Label>
                  <Select defaultValue={editingTemplate?.age_group}>
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
              </div>

              <div className="space-y-2">
                <Label>Focus Area</Label>
                <Input defaultValue={editingTemplate?.focus_area} placeholder="e.g., anxiety, grief_loss" />
              </div>

              <div className="space-y-2">
                <Label>Content (140 chars recommended)</Label>
                <Textarea
                  defaultValue={editingTemplate?.content}
                  placeholder="Your warm, encouraging message..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Input type="number" defaultValue={editingTemplate?.priority || 1} min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Cooldown (days)</Label>
                  <Input type="number" defaultValue={editingTemplate?.cooldown_days || 7} min="1" />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Switch defaultChecked={editingTemplate?.active !== false} />
                  <Label>Active</Label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditingTemplate(null);
                    setShowNewTemplate(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => saveTemplate(editingTemplate || {})}
                >
                  Save Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
