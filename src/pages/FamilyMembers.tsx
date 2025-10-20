import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus, Users, Mail, Clock, CheckCircle2, XCircle, Trash2, MoreVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AddFamilyMemberModal } from "@/components/family/AddFamilyMemberModal";
import { FamilyInviteCodeCard } from "@/components/family/FamilyInviteCodeCard";
import { JoinFamilyModal } from "@/components/family/JoinFamilyModal";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface FamilyMember {
  id: string;
  member_name: string | null;
  invitee_email: string | null;
  relationship: string | null;
  status: string;
  joined_at: string | null;
}

const FamilyMembers = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [familyGroupId, setFamilyGroupId] = useState<string | null>(null);

  useEffect(() => {
    loadFamilyMembers();
  }, []);

  const loadFamilyMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get user's family group
      const { data: familyGroup } = await supabase
        .from("family_groups")
        .select("id")
        .eq("created_by", user.id)
        .single();

      if (!familyGroup) {
        // Check if user is a member of any family
        const { data: memberOf } = await supabase
          .from("family_members")
          .select("family_id")
          .eq("user_id", user.id)
          .single();

        if (!memberOf) {
          setMembers([]);
          setLoading(false);
          return;
        }
        
        setFamilyGroupId(memberOf.family_id);
      } else {
        setFamilyGroupId(familyGroup.id);
      }

      // Get family members and pending invites
      const actualFamilyId = familyGroupId || familyGroup?.id;
      if (!actualFamilyId) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const { data: familyMembers, error: membersError } = await supabase
        .from("family_members")
        .select(`
          id,
          user_id,
          joined_at,
          profiles!inner(username)
        `)
        .eq("family_id", actualFamilyId);

      const { data: pendingInvites, error: invitesError } = await supabase
        .from("family_invites")
        .select("*")
        .eq("parent_id", user.id);

      if (membersError) throw membersError;

      // Combine active members and pending invites
      const combined: FamilyMember[] = [
        ...(familyMembers || []).map(m => ({
          id: m.id,
          member_name: m.profiles?.username || "Unknown",
          invitee_email: null,
          relationship: null,
          status: "active",
          joined_at: m.joined_at,
        })),
        ...(pendingInvites || []).map(i => ({
          id: i.id,
          member_name: i.invitee_name || "Pending",
          invitee_email: i.invitee_email,
          relationship: i.relationship,
          status: i.expires_at && new Date(i.expires_at) < new Date() ? "expired" : (i.status || "pending"),
          joined_at: null,
        })),
      ];

      setMembers(combined);
    } catch (error) {
      console.error("Error loading family members:", error);
      toast({
        title: "Error",
        description: "Failed to load family members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    try {
      const { error } = await supabase
        .from("family_invites")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Invitation deleted",
        description: "The invitation has been removed",
      });
      
      setDeletingId(null);
      loadFamilyMembers();
    } catch (error) {
      console.error("Error deleting invite:", error);
      toast({
        title: "Error",
        description: "Failed to delete invitation",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600">
            <Clock className="w-3 h-3 mr-1" />
            Invite Pending
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <XCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatRelationship = (relationship: string | null) => {
    if (!relationship) return "";
    return relationship.charAt(0).toUpperCase() + relationship.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4">
        <div className="container max-w-4xl mx-auto py-8">
          <Button variant="ghost" onClick={() => navigate("/family/chat")} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Family
          </Button>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4">
        <div className="container max-w-4xl mx-auto py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/family/chat")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Family
          </Button>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl flex items-center gap-2">
                      <Users className="w-8 h-8 text-primary" />
                      Your Family Members
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Invite your loved ones and stay connected through chat and stories
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowJoinModal(true)}>
                      <Users className="w-4 h-4 mr-2" />
                      Join Group
                    </Button>
                    <Button onClick={() => setShowAddModal(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite Member
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/family/journals")}
                  className="w-full"
                >
                  📖 View Children's Journals
                </Button>
              </CardContent>
            </Card>

            {familyGroupId && (
              <FamilyInviteCodeCard familyGroupId={familyGroupId} />
            )}

            {members.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center space-y-4">
                    <Users className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2">No family members yet</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        Start building your family network by inviting your loved ones to connect with you
                      </p>
                    </div>
                    <Button onClick={() => setShowAddModal(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Your First Family Member
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {members.map((member) => (
                  <Card key={member.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12 flex-shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(member.member_name || "?")}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg truncate">
                                {member.member_name}
                              </h3>
                              {member.relationship && (
                                <p className="text-sm text-muted-foreground">
                                  {formatRelationship(member.relationship)}
                                </p>
                              )}
                              {member.invitee_email && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <Mail className="w-3 h-3" />
                                  {member.invitee_email}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {getStatusBadge(member.status)}
                              
                              {member.status !== "active" && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-card z-50">
                                    <DropdownMenuItem
                                      onClick={() => setDeletingId(member.id)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Invitation
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                          
                          {member.joined_at && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Joined {new Date(member.joined_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddFamilyMemberModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          loadFamilyMembers();
        }}
      />

      <JoinFamilyModal
        open={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={() => {
          setShowJoinModal(false);
          loadFamilyMembers();
        }}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this invitation. The person will no longer be able to join using this link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDeleteInvite(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FamilyMembers;