import { useGetTables, getGetTablesQueryKey } from "@workspace/api-client-react";
import CustomerLayout from "@/components/layout/customer-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Monitor, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: tables, isLoading } = useGetTables();

  return (
    <CustomerLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Select a Table</h1>
            <p className="text-muted-foreground">Find an available table to view the menu and place your order.</p>
          </div>
          <Link href="/reservation" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            Make a Reservation
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[180px] w-full rounded-xl" />
            ))
          ) : tables?.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <p className="text-muted-foreground">No tables available at the moment.</p>
            </div>
          ) : (
            tables?.map((table) => (
              <Link key={table.id} href={`/table/${table.id}`} className={table.status === 'occupied' ? 'pointer-events-none' : ''}>
                <Card className={`h-full transition-all duration-200 border-2 ${
                  table.status === 'available' 
                    ? 'hover:border-primary hover:shadow-md cursor-pointer border-border/50 bg-card/50' 
                    : 'opacity-60 border-destructive/20 bg-destructive/5'
                }`}>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xl font-bold">{table.name}</CardTitle>
                    <Monitor className={`w-5 h-5 ${table.status === 'available' ? 'text-primary' : 'text-destructive'}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center text-muted-foreground text-sm">
                        <Users className="w-4 h-4 mr-1.5" />
                        <span>Up to {table.capacity}</span>
                      </div>
                      <Badge variant={table.status === 'available' ? "default" : "destructive"}>
                        {table.status === 'available' ? 'Available' : 'Occupied'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
