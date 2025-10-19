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
import { CheckCircle2, XCircle, Search, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { format } from "date-fns";

interface Order {
  id: string;
  session_id: string;
  customer_email: string | null;
  product_name: string | null;
  amount_total: number | null;
  currency: string | null;
  payment_status: string | null;
  emailed: boolean;
  created_at: string;
}

const ROWS_PER_PAGE = 20;

export default function AdminOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ["admin-orders", searchTerm, currentPage],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE - 1);

      if (searchTerm) {
        query = query.or(
          `customer_email.ilike.%${searchTerm}%,session_id.ilike.%${searchTerm}%`
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return { orders: data as Order[], totalCount: count || 0 };
    },
  });

  const handleResendReceipt = async (order: Order) => {
    try {
      toast({
        title: "Resending receipt...",
        description: `Sending to ${order.customer_email}`,
      });

      // Call edge function to resend email
      const { error } = await supabase.functions.invoke("resend-receipt", {
        body: {
          session_id: order.session_id,
          customer_email: order.customer_email,
          product_name: order.product_name,
          amount_total: order.amount_total,
          currency: order.currency,
        },
      });

      if (error) throw error;

      toast({
        title: "Receipt sent!",
        description: "Order email has been resent successfully",
      });

      // Refresh orders to show updated emailed status
      refetch();
    } catch (error: any) {
      console.error("Error resending receipt:", error);
      toast({
        title: "Failed to send receipt",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number | null, currency: string | null) => {
    if (amount === null) return "—";
    const dollars = (amount / 100).toFixed(2);
    return `$${dollars} ${(currency || "USD").toUpperCase()}`;
  };

  const shortenSessionId = (sessionId: string) => {
    return sessionId.slice(-6);
  };

  const totalPages = Math.ceil((ordersData?.totalCount || 0) / ROWS_PER_PAGE);

  return (
    <AdminGuard>
      <div className="container mx-auto p-6 max-w-7xl space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Order Management</h1>
            <p className="text-muted-foreground">Monitor purchases and email confirmations</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-card rounded-lg border p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or session ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page on new search
              }}
              className="pl-9"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-card rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Total Orders</div>
            <div className="text-2xl font-bold">{ordersData?.totalCount || 0}</div>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Emailed</div>
            <div className="text-2xl font-bold text-green-600">
              {ordersData?.orders.filter((o) => o.emailed).length || 0}
            </div>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Pending Email</div>
            <div className="text-2xl font-bold text-orange-600">
              {ordersData?.orders.filter((o) => !o.emailed).length || 0}
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {isLoading ? (
          <div className="text-center py-8">Loading orders...</div>
        ) : !ordersData?.orders || ordersData.orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No orders found. {searchTerm && "Try a different search term."}
          </div>
        ) : (
          <>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Customer Email</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Emailed</TableHead>
                    <TableHead>Session ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersData.orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(order.created_at), "MMM d, yyyy")}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), "HH:mm:ss")}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {order.customer_email || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.product_name || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(order.amount_total, order.currency)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.payment_status === "paid"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : order.payment_status === "refunded"
                              ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                          }`}
                        >
                          {order.payment_status || "unknown"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {order.emailed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        ...{shortenSessionId(order.session_id)}
                      </TableCell>
                      <TableCell className="text-right">
                        {!order.emailed && order.customer_email && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResendReceipt(order)}
                            className="gap-2"
                          >
                            <Mail className="h-4 w-4" />
                            Resend
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({ordersData.totalCount} total orders)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Mobile Responsive Note */}
        <div className="md:hidden text-xs text-muted-foreground text-center">
          💡 Tip: Scroll horizontally to view all columns
        </div>
      </div>
    </AdminGuard>
  );
}
