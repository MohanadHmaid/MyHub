import { useState } from "react";
import { 
  useGetOrders, getGetOrdersQueryKey, 
  useUpdateOrderStatus, 
  useUpdateOrderPayment 
} from "@workspace/api-client-react";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Receipt, CheckCircle2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders, isLoading } = useGetOrders(
    statusFilter !== "all" ? { status: statusFilter } : undefined,
    {
      query: { 
        queryKey: getGetOrdersQueryKey(statusFilter !== "all" ? { status: statusFilter } : undefined),
        refetchInterval: 15000 // Poll every 15s for new orders
      }
    }
  );

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        toast({ title: "Order status updated" });
        queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
      }
    }
  });

  const updatePayment = useUpdateOrderPayment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Payment status updated" });
        queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
      }
    }
  });

  const handleStatusChange = (id: number, status: string) => {
    updateStatus.mutate({ id, data: { status: status as any } });
  };

  const handlePaymentChange = (id: number, paymentStatus: string) => {
    updatePayment.mutate({ id, data: { paymentStatus: paymentStatus as any } });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Receipt className="w-8 h-8 text-primary" />
            Order Management
          </h1>
          <p className="text-muted-foreground mt-1">Track and update kitchen orders in real-time.</p>
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
          <TabsList className="grid w-full grid-cols-4 bg-secondary">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:text-amber-500">Pending</TabsTrigger>
            <TabsTrigger value="preparing" className="data-[state=active]:text-blue-500">Preparing</TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:text-green-500">Done</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead className="w-[100px]">Order ID</TableHead>
              <TableHead>Table</TableHead>
              <TableHead className="w-[300px]">Items</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : orders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No orders found for this filter.
                </TableCell>
              </TableRow>
            ) : (
              orders?.map((order) => (
                <TableRow key={order.id} className="group transition-colors hover:bg-secondary/20 border-b border-border/30">
                  <TableCell className="font-mono text-xs text-muted-foreground">#{order.id}</TableCell>
                  <TableCell className="font-medium text-base">{order.tableName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {order.items.map(item => (
                        <div key={item.id} className="text-sm flex items-start gap-2">
                          <span className="font-semibold text-primary min-w-[20px]">{item.quantity}x</span>
                          <span className="truncate" title={item.productName}>{item.productName}</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <div className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-base">${order.totalAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className={`h-8 rounded-full border px-3 flex items-center gap-1 ${
                          order.status === 'pending' ? 'border-amber-500/50 text-amber-500 bg-amber-500/5' :
                          order.status === 'preparing' ? 'border-blue-500/50 text-blue-500 bg-blue-500/5' :
                          'border-green-500/50 text-green-500 bg-green-500/5'
                        }`}>
                          {order.status === 'pending' ? 'Pending' : order.status === 'preparing' ? 'Preparing' : 'Completed'}
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'pending')} disabled={order.status === 'pending'}>
                          Pending
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'preparing')} disabled={order.status === 'preparing'}>
                          Preparing
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'completed')} disabled={order.status === 'completed'}>
                          Completed
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-8 rounded-full px-3 text-xs font-semibold ${
                        order.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                      }`}
                      onClick={() => handlePaymentChange(order.id, order.paymentStatus === 'paid' ? 'unpaid' : 'paid')}
                    >
                      {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    {order.status !== 'completed' && (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleStatusChange(order.id, order.status === 'pending' ? 'preparing' : 'completed')}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {order.status === 'pending' ? 'Start' : 'Finish'} <CheckCircle2 className="w-4 h-4 ml-1.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
