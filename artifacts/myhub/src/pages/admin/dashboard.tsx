import AdminLayout from "@/components/layout/admin-layout";
import { 
  useGetDashboardSummary, getGetDashboardSummaryQueryKey, 
  useGetRecentOrders, getGetRecentOrdersQueryKey,
  useHealthCheck, getHealthCheckQueryKey,
  useGetTrafficHeatmap, getGetTrafficHeatmapQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Monitor, Receipt, DollarSign, Calendar, Clock, ChevronRight, UtensilsCrossed, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const HOURS = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function AdminDashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({
    query: {
      queryKey: getGetDashboardSummaryQueryKey(),
      refetchInterval: 30000, // refresh every 30s
    }
  });

  const { data: recentOrders, isLoading: isLoadingOrders } = useGetRecentOrders({
    query: {
      queryKey: getGetRecentOrdersQueryKey(),
      refetchInterval: 30000,
    }
  });

  const { data: health } = useHealthCheck({
    query: {
      queryKey: getHealthCheckQueryKey(),
      refetchInterval: 60000,
    }
  });

  const { data: heatmapData } = useGetTrafficHeatmap(undefined, {
    query: { queryKey: getGetTrafficHeatmapQueryKey() }
  });

  // Build heatmap lookup: dayOfWeek-hour → count
  const heatmap: Record<string, number> = {};
  let maxCount = 1;
  for (const entry of heatmapData ?? []) {
    const key = `${entry.dayOfWeek}-${entry.hour}`;
    heatmap[key] = entry.count;
    if (entry.count > maxCount) maxCount = entry.count;
  }

  function heatColor(count: number): string {
    if (!count) return "bg-secondary";
    const pct = count / maxCount;
    if (pct < 0.33) return "bg-emerald-200 text-emerald-900";
    if (pct < 0.66) return "bg-amber-300 text-amber-900";
    return "bg-red-400 text-white";
  }


  const statsCards = summary ? [
    {
      title: "Today's Revenue",
      value: `$${summary.todayRevenue.toFixed(2)}`,
      description: "Total paid orders today",
      icon: DollarSign,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Active Orders",
      value: summary.pendingOrders + summary.preparingOrders,
      description: `${summary.pendingOrders} pending, ${summary.preparingOrders} preparing`,
      icon: Receipt,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Table Status",
      value: `${summary.occupiedTables} / ${summary.totalTables}`,
      description: `${summary.availableTables} available tables`,
      icon: Monitor,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Reservations",
      value: summary.pendingReservations,
      description: "Pending confirmation today",
      icon: Calendar,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    }
  ] : [];

  return (
    <AdminLayout>
      <div className="flex flex-col space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Monitor your café's live status and daily performance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoadingSummary ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))
          ) : (
            statsCards.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <Card key={i} className="border-border/50 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                    <div className={`${stat.bg} ${stat.color} p-2 rounded-lg`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border/50 shadow-sm flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4 mb-4">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest order activity across tables</CardDescription>
              </div>
              <Link href="/admin/orders" className="text-sm font-medium text-primary hover:underline flex items-center">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </CardHeader>
            <CardContent className="flex-1">
              {isLoadingOrders ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : recentOrders?.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10">
                  <Receipt className="w-10 h-10 mb-4 opacity-20" />
                  <p>No recent orders today.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders?.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border/50 transition-colors hover:bg-secondary/50">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-full hidden sm:block">
                          <Monitor className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-base">{order.tableName}</div>
                          <div className="text-sm text-muted-foreground flex items-center mt-1">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            <span className="mx-2">•</span>
                            {order.items.length} items
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-bold">${order.totalAmount.toFixed(2)}</span>
                        <div className="flex gap-2">
                          <Badge variant="outline" className={
                            order.status === 'pending' ? 'border-amber-500/50 text-amber-500' :
                            order.status === 'preparing' ? 'border-blue-500/50 text-blue-500' :
                            'border-green-500/50 text-green-500'
                          }>
                            {order.status}
                          </Badge>
                          <Badge variant="secondary" className={
                            order.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
                          }>
                            {order.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm flex flex-col">
            <CardHeader className="border-b border-border/50 pb-4 mb-4">
              <CardTitle>System Health</CardTitle>
              <CardDescription>Real-time status</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-6">
              <div className="flex justify-between items-center p-4 bg-secondary/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                  <span className="font-medium">API Server</span>
                </div>
                <span className="text-green-500 text-sm font-semibold">Online</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-secondary/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                  <span className="font-medium">Database</span>
                </div>
                <span className="text-green-500 text-sm font-semibold">Connected</span>
              </div>
              
              <div className="mt-auto pt-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-auto py-3 px-2 flex flex-col gap-2" asChild>
                    <Link href="/admin/tables">
                      <Monitor className="w-4 h-4" />
                      <span className="text-xs">Tables</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 px-2 flex flex-col gap-2" asChild>
                    <Link href="/admin/menu">
                      <UtensilsCrossed className="w-4 h-4" />
                      <span className="text-xs">Menu</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Traffic Heatmap */}
        <Card className="border-border/50 shadow-sm mt-6">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <CardTitle>Reservation Traffic Heatmap</CardTitle>
            </div>
            <CardDescription>Busiest hours by day of week (all-time). Green = quiet, yellow = moderate, red = peak.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Header row: hours */}
              <div className="flex gap-1 mb-1 pl-10">
                {HOURS.map(h => (
                  <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground font-medium">{h.replace(":00","")}</div>
                ))}
              </div>
              {/* Data rows: days */}
              {DAYS.map((day, dayIdx) => (
                <div key={day} className="flex gap-1 mb-1 items-center">
                  <div className="w-9 text-xs text-muted-foreground font-medium shrink-0">{day}</div>
                  {HOURS.map(hour => {
                    const count = heatmap[`${dayIdx}-${hour}`] ?? 0;
                    return (
                      <div
                        key={hour}
                        className={`flex-1 h-8 rounded-md text-[10px] font-semibold flex items-center justify-center transition-colors ${heatColor(count)}`}
                        title={`${day} ${hour}: ${count} reservation${count !== 1 ? "s" : ""}`}
                      >
                        {count > 0 ? count : ""}
                      </div>
                    );
                  })}
                </div>
              ))}
              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-secondary inline-block border" /> None</div>
                <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-emerald-200 inline-block" /> Low</div>
                <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-amber-300 inline-block" /> Moderate</div>
                <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-red-400 inline-block" /> Peak</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
