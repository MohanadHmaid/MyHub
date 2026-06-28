import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useGetTables, getGetTablesQueryKey, 
  useCreateTable, 
  useUpdateTable, 
  useDeleteTable 
} from "@workspace/api-client-react";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Monitor, Users, Plus, Settings2, Trash2 } from "lucide-react";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

const tableSchema = z.object({
  name: z.string().min(1, "اسم الطاولة مطلوب"),
  capacity: z.coerce.number().min(1, "السعة يجب أن تكون 1 على الأقل").max(20, "السعة يجب أن لا تتجاوز 20"),
});

export default function AdminTables() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<{id: number, name: string, capacity: number} | null>(null);

  const { data: tables, isLoading } = useGetTables({
    query: { queryKey: getGetTablesQueryKey() }
  });

  const createTable = useCreateTable({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم إنشاء الطاولة بنجاح" });
        queryClient.invalidateQueries({ queryKey: getGetTablesQueryKey() });
        setIsAddOpen(false);
        addForm.reset();
      }
    }
  });

  const updateTable = useUpdateTable({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم تحديث الطاولة بنجاح" });
        queryClient.invalidateQueries({ queryKey: getGetTablesQueryKey() });
        setEditingTable(null);
      }
    }
  });

  const deleteTable = useDeleteTable({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم حذف الطاولة بنجاح" });
        queryClient.invalidateQueries({ queryKey: getGetTablesQueryKey() });
      }
    }
  });

  const addForm = useForm<z.infer<typeof tableSchema>>({
    resolver: zodResolver(tableSchema),
    defaultValues: { name: "", capacity: 2 },
  });

  const editForm = useForm<z.infer<typeof tableSchema>>({
    resolver: zodResolver(tableSchema),
  });

  const onAddSubmit = (data: z.infer<typeof tableSchema>) => {
    createTable.mutate({ data });
  };

  const onEditSubmit = (data: z.infer<typeof tableSchema>) => {
    if (!editingTable) return;
    updateTable.mutate({ id: editingTable.id, data });
  };

  const toggleStatus = (id: number, currentStatus: string) => {
    updateTable.mutate({ 
      id, 
      data: { status: currentStatus === 'available' ? 'occupied' : 'available' as any } 
    });
  };

  const startEdit = (table: any) => {
    setEditingTable({ id: table.id, name: table.name, capacity: table.capacity });
    editForm.reset({ name: table.name, capacity: table.capacity });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة الطاولات</h1>
          <p className="text-muted-foreground mt-1">تكوين ومراقبة جميع الطاولات في المقهى.</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="w-4 h-4 mr-2" /> إضافة طاولة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة طاولة جديدة</DialogTitle>
              <DialogDescription>أنشئ طاولة جديدة ليتمكن العملاء من الطلب منها.</DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField control={addForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الطاولة/Number</FormLabel>
                    <FormControl><Input placeholder="e.g. Table 01, VIP Booth" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={addForm.control} name="capacity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>السعة</FormLabel>
                    <FormControl><Input type="number" min={1} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>إلغاء</Button>
                  <Button type="submit" disabled={createTable.isPending}>إنشاء الطاولة</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editingTable} onOpenChange={(open) => !open && setEditingTable(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الطاولة</DialogTitle>
            <DialogDescription>تحديث تفاصيل الطاولة.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField control={editForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم الطاولة/Number</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="capacity" render={({ field }) => (
                <FormItem>
                  <FormLabel>السعة</FormLabel>
                  <FormControl><Input type="number" min={1} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingTable(null)}>إلغاء</Button>
                <Button type="submit" disabled={updateTable.isPending}>حفظ التغييرات</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)
        ) : tables?.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground border border-dashed rounded-xl">
            لا توجد طاولات مضافة بعد.
          </div>
        ) : (
          tables?.map((table) => (
            <Card key={table.id} className={`flex flex-col transition-colors border-2 ${
              table.status === 'available' ? 'border-border/50' :
              table.status === 'reserved' ? 'border-amber-300 bg-amber-50' :
              'border-primary/30 bg-primary/5'
            }`}>
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{table.name}</CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Users className="w-3.5 h-3.5 mr-1" /> السعة: {table.capacity}
                    </div>
                  </div>
                  <Monitor className={`w-5 h-5 ${
                    table.status === 'available' ? 'text-muted-foreground' :
                    table.status === 'reserved' ? 'text-amber-500' :
                    'text-primary'
                  }`} />
                </div>
              </CardHeader>
              <CardContent className="py-4 flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium">الحالة</span>
                  <Badge
                    variant="outline"
                    className={`cursor-pointer ${
                      table.status === 'available' ? '' :
                      table.status === 'reserved' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                      'bg-primary text-primary-foreground border-primary'
                    }`}
                    onClick={() => table.status !== 'reserved' && toggleStatus(table.id, table.status)}
                  >
                    {table.status === 'available' ? 'متاحة' : table.status === 'reserved' ? 'محجوزة' : 'مشغولة'}
                  </Badge>
                </div>
                <div className="flex justify-between gap-2 mt-auto">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => startEdit(table)}>
                    <Settings2 className="w-4 h-4 mr-2" /> تعديل
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="px-3" disabled={table.status === 'occupied'}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
                        <AlertDialogDescription>
                          سيؤدي هذا إلى حذف الطاولة {table.name} نهائياً وإزالتها من النظام.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteTable.mutate({ id: table.id })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
