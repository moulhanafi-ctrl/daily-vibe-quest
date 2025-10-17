import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Copy, Calendar } from "lucide-react";
import { format } from "date-fns";

interface UserProfile {
  id: string;
  full_name: string | null;
  birth_date: string | null;
  timezone: string;
  marketing_opt_in: boolean;
  created_at: string;
  last_login_at: string | null;
}

interface UserWithEmail extends UserProfile {
  email: string;
}

export default function UsersAdmin() {
  const [searchTerm, setSearchTerm] = useState("");
  const [hasBirthdayThisMonth, setHasBirthdayThisMonth] = useState(false);
  const [optInOnly, setOptInOnly] = useState(false);
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", searchTerm, hasBirthdayThisMonth, optInOnly],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, birth_date, timezone, marketing_opt_in, created_at, last_login_at")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.ilike("full_name", `%${searchTerm}%`);
      }

      if (optInOnly) {
        query = query.eq("marketing_opt_in", true);
      }

      const { data: profiles, error } = await query;
      if (error) throw error;

      // Get emails from auth.users via admin API
      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
      
      const emailMap = new Map<string, string>();
      if (authUsers && Array.isArray(authUsers)) {
        for (const authUser of authUsers) {
          const userId = authUser?.id;
          const userEmail = authUser?.email;
          if (userId && userEmail) {
            emailMap.set(userId, userEmail);
          }
        }
      }

      let filteredData = (profiles || []).map(p => ({
        ...p,
        email: emailMap.get(p.id) || ""
      })).filter(u => u.email) as UserWithEmail[];

      if (hasBirthdayThisMonth) {
        const currentMonth = new Date().getMonth() + 1;
        filteredData = filteredData.filter((user) => {
          if (!user.birth_date) return false;
          const birthMonth = new Date(user.birth_date).getMonth() + 1;
          return birthMonth === currentMonth;
        });
      }

      return filteredData;
    },
  });

  const exportCSV = () => {
    if (!users || users.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const headers = ["Joined", "Name", "Email", "Birth Date", "Timezone", "Opt-in", "Last Login"];
    const rows = users.map((user) => [
      format(new Date(user.created_at), "yyyy-MM-dd"),
      user.full_name || "",
      user.email,
      user.birth_date ? format(new Date(user.birth_date), "yyyy-MM-dd") : "",
      user.timezone,
      user.marketing_opt_in ? "Yes" : "No",
      user.last_login_at ? format(new Date(user.last_login_at), "yyyy-MM-dd HH:mm") : "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "CSV exported successfully" });
  };

  const copyEmails = () => {
    if (!users || users.length === 0) {
      toast({ title: "No emails to copy", variant: "destructive" });
      return;
    }

    const emails = users.map((u) => u.email).join(", ");
    navigator.clipboard.writeText(emails);
    toast({ title: `Copied ${users.length} email addresses` });
  };

  return (
    <AdminGuard>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">User Management</h1>
          <div className="flex gap-2">
            <Button onClick={exportCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={copyEmails} variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              Copy Emails
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-4 mb-6 space-y-4">
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasBirthdayThisMonth}
                onChange={(e) => setHasBirthdayThisMonth(e.target.checked)}
                className="w-4 h-4"
              />
              <Calendar className="w-4 h-4" />
              Birthday this month
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={optInOnly}
                onChange={(e) => setOptInOnly(e.target.checked)}
                className="w-4 h-4"
              />
              Marketing opt-in only
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {users?.length || 0} users
            </div>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Joined</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Birth Date</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead>Opt-in</TableHead>
                    <TableHead>Last Login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{format(new Date(user.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>{user.full_name || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.birth_date ? (
                          format(new Date(user.birth_date), "MMM d, yyyy")
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{user.timezone}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            user.marketing_opt_in
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                          }`}
                        >
                          {user.marketing_opt_in ? "Yes" : "No"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.last_login_at ? (
                          <span className="text-sm">
                            {format(new Date(user.last_login_at), "MMM d, HH:mm")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </AdminGuard>
  );
}