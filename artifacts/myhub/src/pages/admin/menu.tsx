import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useGetProducts, getGetProductsQueryKey, 
  useCreateProduct, 
  useUpdateProduct, 
  useDeleteProduct 
} from "@workspace/api-client-react";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { UtensilsCrossed, Plus, Settings2, Trash2, Search } from "lucide-react";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.coerce.number().min(0.01, "Price must be > 0"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  available: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function AdminMenu() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [search, setSearch] = useState("");

  const { data: products, isLoading } = useGetProducts({
    query: { queryKey: getGetProductsQueryKey() }
  });

  const createProduct = useCreateProduct({
    mutation: {
      onSuccess: () => {
        toast({ title: "Product created" });
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        setIsAddOpen(false);
        addForm.reset();
      }
    }
  });

  const updateProduct = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        toast({ title: "Product updated" });
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        setEditingProduct(null);
      }
    }
  });

  const deleteProduct = useDeleteProduct({
    mutation: {
      onSuccess: () => {
        toast({ title: "Product deleted" });
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
      }
    }
  });

  const addForm = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", price: 0, category: "drinks", description: "", available: true },
  });

  const editForm = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
  });

  const onAddSubmit = (data: ProductFormValues) => {
    createProduct.mutate({ data });
  };

  const onEditSubmit = (data: ProductFormValues) => {
    if (!editingProduct) return;
    updateProduct.mutate({ id: editingProduct.id, data });
  };

  const toggleAvailability = (id: number, current: boolean) => {
    updateProduct.mutate({ id, data: { available: !current } });
  };

  const startEdit = (product: any) => {
    setEditingProduct(product);
    editForm.reset({ 
      name: product.name, 
      price: product.price, 
      category: product.category, 
      description: product.description || "", 
      available: product.available 
    });
  };

  const categories = useMemo(() => {
    if (!products) return ["all"];
    const cats = Array.from(new Set(products.map(p => p.category)));
    return ["all", ...cats];
  }, [products]);

  const [activeCategory, setActiveCategory] = useState("all");

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      const matchCat = activeCategory === "all" || p.category === activeCategory;
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, search]);

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <UtensilsCrossed className="w-8 h-8 text-primary" />
            Menu Management
          </h1>
          <p className="text-muted-foreground mt-1">Add, edit, and organize café menu items.</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 h-10">
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Menu Item</DialogTitle>
              <DialogDescription>Create a new product for the menu.</DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField control={addForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Iced Latte" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={addForm.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={addForm.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="drinks">Drinks</SelectItem>
                          <SelectItem value="food">Food</SelectItem>
                          <SelectItem value="snacks">Snacks</SelectItem>
                          <SelectItem value="merch">Merchandise</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={addForm.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl><Textarea className="resize-none" rows={3} placeholder="Brief description of the item..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={addForm.control} name="available" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Available for order</FormLabel>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createProduct.isPending}>Save Item</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField control={editForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="drinks">Drinks</SelectItem>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="snacks">Snacks</SelectItem>
                        <SelectItem value="merch">Merchandise</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={editForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea className="resize-none" rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingProduct(null)}>Cancel</Button>
                <Button type="submit" disabled={updateProduct.isPending}>Update Item</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="relative w-full lg:w-[300px] shrink-0">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search menu..." 
            className="pl-9 h-10 bg-card" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto bg-transparent border-b border-border h-10 p-0 flex-nowrap rounded-none">
            {categories.map(cat => (
              <TabsTrigger 
                key={cat} 
                value={cat}
                className="capitalize data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 h-10"
              >
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground border border-dashed rounded-xl bg-card/50">
            No items found matching your criteria.
          </div>
        ) : (
          filteredProducts.map((product) => (
            <Card key={product.id} className={`flex flex-col transition-all border-border/50 bg-card/50 hover:border-primary/30 ${!product.available && 'opacity-60 grayscale-[0.5]'}`}>
              <CardContent className="p-5 flex-1">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-bold text-lg leading-tight line-clamp-2">{product.name}</h3>
                  <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-sm shrink-0">
                    ${product.price.toFixed(2)}
                  </span>
                </div>
                <Badge variant="outline" className="mb-3 capitalize text-xs">{product.category}</Badge>
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                  {product.description || "No description provided."}
                </p>
              </CardContent>
              <CardFooter className="p-4 pt-0 gap-2 border-t border-border/50 bg-secondary/10 mt-auto flex flex-col sm:flex-row">
                <div className="flex items-center gap-2 mr-auto mb-2 sm:mb-0">
                  <Switch 
                    checked={product.available} 
                    onCheckedChange={() => toggleAvailability(product.id, product.available)} 
                    className="scale-75"
                  />
                  <span className="text-xs text-muted-foreground">{product.available ? 'In Stock' : 'Out of Stock'}</span>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="secondary" size="icon" className="h-8 w-8 flex-1 sm:flex-none" onClick={() => startEdit(product)}>
                    <Settings2 className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon" className="h-8 w-8 flex-1 sm:flex-none">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {product.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove the item from the menu. It cannot be ordered anymore.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteProduct.mutate({ id: product.id })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
