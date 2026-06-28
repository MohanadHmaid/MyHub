import AdminLayout from "@/components/layout/admin-layout";
import { 
  useGetTables, getGetTablesQueryKey,
  useGetRecentOrders, getGetRecentOrdersQueryKey,
  useGetTrafficHeatmap, getGetTrafficHeatmapQueryKey,
  useGetReservations, getGetReservationsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Monitor, Receipt, Calendar, Clock, ChevronRight, Activity, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useMemo } from "react";

const HOURS = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function AdminDashboard() {
  // Fetch raw data to compute our own summary instead of relying on the crashing /api/dashboard/summary
  const { data: tables, isLoading: isLoadingTables } = useGetTables({
    query: { queryKey: getGetTablesQueryKey(), refetchInterval: 30000 }
  });

  const { data: recentOrders, isLoading: isLoadingOrders } = useGetRecentOrders({
    query: { queryKey: getGetRecentOrdersQueryKey(), refetchInterval: 30000 }
  });

  const { data: reservations, isLoading: isLoadingReservations } = useGetReservations({
    query: { queryKey: getGetReservationsQueryKey(), refetchInterval: 30000 }
  });

  const { data: heatmapData, isLoading: isLoadingHeatmap } = useGetTrafficHeatmap(undefined, {
    query: { queryKey: getGetTrafficHeatmapQueryKey() }
  });

  // Compute summary stats client-side
  const summary = useMemo(() => {
    if (!tables || !recentOrders || !reservations) return null;

    const totalTables = tables.length;
    const occupiedTables = tables.filter(t => t.status === "occupied").length;
    const availableTables = tables.filter(t => t.status === "available").length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = recentOrders.filter(o => new Date(o.createdAt) >= today);
    const todayRevenue = todayOrders
      .filter(o => o.paymentStatus === "paid")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const unpaidAmount = recentOrders
      .filter(o => o.paymentStatus === "unpaid")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const pendingReservations = reservations.filter(r => r.status === "pending").length;
    const confirmedToday = reservations.filter(r => {
      const d = new Date(r.dateTime);
      return d >= today && d < new Date(today.getTime() + 24 * 60 * 60 * 1000) && r.status === "confirmed";
    }).length;

    return {
      totalTables,
      occupiedTables,
      availableTables,
      todayRevenue,
      unpaidAmount,
      pendingReservations,
      confirmedToday
    };
  }, [tables, recentOrders, reservations]);

  // Build heatmap lookup: dayOfWeek-hour → count
  const heatmap = useMemo(() => {
    const map: Record<string, number> = {};
    let max = 1;
    for (const entry of heatmapData ?? []) {
      const key = `${entry.dayOfWeek}-${entry.hour}`;
      map[key] = entry.count;
      if (entry.count > max) max = entry.count;
    }
    return { map, max };
  }, [heatmapData]);

  function heatColor(count: number): string {
    if (!count) return "bg-secondary";
    const pct = count / heatmap.max;
    if (pct < 0.33) return "bg-emerald-200 text-emerald-900";
    if (pct < 0.66) return "bg-amber-300 text-amber-900";
    return "bg-red-400 text-white";
  }

  const statsCards = summary ? [
    {
      title: "Today's Revenue",
      value: `₪${summary.todayRevenue.toFixed(2)}`,
      description: "مدفوع orders today",
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      title: "غير مدفوع المبلغ",
      value: `₪${summary.unpaidAmount.toFixed(2)}`,
      description: "الإجمالي pending payments",
      icon: Receipt,
      color: "text-red-600",
      bg: "bg-red-500/10",
    },
    {
      title: "Table الحالة",
      value: `${summary.occupiedTables} / ${summary.totalTables}`,
      description: `${summary.availableTables} available now`,
      icon: Monitor,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "قيد الانتظار Bookings",
      value: summary.pendingReservations,
      description: "الحجوزات to review",
      icon: Calendar,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Today's Guests",
      value: summary.confirmedToday,
      description: "Confirmed for today",
      icon: Users,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    }
  ] : [];

  const isLoading = isLoadingTables || isLoadingOrders || isLoadingReservations;

  return (
    <AdminLayout>
      <div className="flex flex-col space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">لوحة التحكم Overview</h1>
            <p className="text-muted-foreground mt-1">Live status and performance metrics for MyHUB.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 py-1 px-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live System
            </Badge>
          </div>
        </div>

        {/* Main KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))
          ) : (
            statsCards.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <Card key={i} className="border-border/50 shadow-sm hover:shadow-md transition-all">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                    <div className={`${stat.bg} ${stat.color} p-2 rounded-lg`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent الطلبات Table */}
          <Card className="lg:col-span-2 border-border/50 shadow-sm flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4 mb-4">
              <div>
                <CardTitle>Recent الطلبات</CardTitle>
                <CardDescription>Latest activity across all tables</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary hover:bg-primary/5">
                <Link href="/admin/orders" className="flex items-center">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="flex-1">
              {isLoadingOrders ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : recentOrders?.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10">
                  <Receipt className="w-10 h-10 mb-4 opacity-20" />
                  <p>لا orders found for today.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders?.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border/50 transition-colors hover:bg-secondary/40">
                      <div className="flex items-center gap-4">
                        <div className="bg-background p-2.5 rounded-lg border border-border/50 shadow-sm">
                          <Monitor className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{order.tableName}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center mt-0.5">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            <span className="mx-2">•</span>
                            {order.items.length} items
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-sm">₪{order.totalAmount.toFixed(2)}</div>
                          <div className="flex gap-1.5 mt-1 justify-end">
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${
                              order.status === 'pending' ? 'border-amber-500/50 text-amber-500' :
                              order.status === 'preparing' ? 'border-blue-500/50 text-blue-500' :
                              'border-emerald-500/50 text-emerald-500'
                            }`}>
                              {order.status}
                            </Badge>
                            <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 h-4 ${
                              order.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'
                            }`}>
                              {order.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Table Utilization & Heatmap */}
          <div className="flex flex-col gap-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Table Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingTables ? (
                  <Skeleton className="h-20 w-full" />
                ) : summary ? (
                  <div className="space-y-4">
                    <div className="flex items-end justify-between">
                      <div className="text-3xl font-bold">
                        {summary.totalTables > 0 ? Math.round((summary.occupiedTables / summary.totalTables) * 100) : 0}%
                      </div>
                      <div className="text-xs text-muted-foreground pb-1">
                        {summary.occupiedTables} of {summary.totalTables} tables
                      </div>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${summary.totalTables > 0 ? (summary.occupiedTables / summary.totalTables) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm flex-1">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Peak Hours</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingHeatmap ? (
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 21 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-7 gap-1">
                      {DAYS.map((day, dIdx) => (
                        <div key={day} className="flex flex-col gap-1">
                          <div className="text-[9px] font-bold text-center text-muted-foreground mb-1">{day[0]}</div>
                          {HOURS.filter((_, hIdx) => hIdx % 3 === 0).map(hour => {
                            const count = heatmap.map[`${dIdx}-${hour}`] ?? 0;
                            return (
                              <div
                                key={hour}
                                className={`h-6 rounded-sm transition-all hover:scale-110 cursor-default ${heatColor(count)}`}
                                title={`${day} at ${hour}: ${count} reservations`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/50">
                      <span>Quiet</span>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-sm bg-secondary" />
                        <div className="w-2 h-2 rounded-sm bg-emerald-200" />
                        <div className="w-2 h-2 rounded-sm bg-amber-300" />
                        <div className="w-2 h-2 rounded-sm bg-red-400" />
                      </div>
                      <span>Busy</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
