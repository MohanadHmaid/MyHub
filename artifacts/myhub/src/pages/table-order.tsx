import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { useGetTable, getGetTableQueryKey, useGetProducts, useCreateOrder, getGetOrdersQueryKey, useVerifyTableReservation, Product } from "@workspace/api-client-react";
import CustomerLayout from "@/components/layout/customer-layout";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle2, KeyRound, Lock } from "lucide-react";

export default function TableOrder() {
  const { id } = useParams<{ id: string }>();
  const tableId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");

  const { data: table, isLoading: isTableLoading } = useGetTable(tableId, {
    query: {
      enabled: !!tableId,
      queryKey: getGetTableQueryKey(tableId),
    }
  });

  const { data: products, isLoading: isProductsLoading } = useGetProducts();

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Order placed successfully!",
          description: "We are preparing your items.",
          duration: 5000,
        });
        setCart([]);
        queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to place order",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      }
    }
  });

  const verifyReservation = useVerifyTableReservation({
    mutation: {
      onSuccess: () => {
        setIsVerified(true);
        setVerifyError("");
        queryClient.invalidateQueries({ queryKey: getGetTableQueryKey(tableId) });
        toast({ title: "Reservation verified!", description: "Welcome to MyHUB. Your table is ready." });
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error || err?.message || "Invalid reservation code.";
        setVerifyError(msg);
      }
    }
  });

  const handleVerify = () => {
    if (!verifyCode.trim()) {
      setVerifyError("Please enter your reservation code.");
      return;
    }
    verifyReservation.mutate({ id: tableId, data: { code: verifyCode.trim() } });
  };

  const categories = useMemo(() => {
    if (!products) return [];
    return Array.from(new Set(products.map(p => p.category)));
  }, [products]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.product.id !== productId);
    });
  };

  const deleteFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);

  const handleSubmitOrder = () => {
    if (cart.length === 0) return;
    
    createOrder.mutate({
      data: {
        tableId,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        }))
      }
    });
  };

  if (isTableLoading || isProductsLoading) {
    return (
      <CustomerLayout minimal>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Skeleton className="h-12 w-full mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
              </div>
            </div>
            <div>
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (!table) {
    return (
      <CustomerLayout minimal>
        <div className="container mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
          <div className="bg-destructive/10 text-destructive p-4 rounded-full mb-4">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Table Not Found</h2>
          <p className="text-muted-foreground">The table you are trying to order from does not exist.</p>
        </div>
      </CustomerLayout>
    );
  }

  // Show reservation code verification screen if table is reserved and not yet verified
  if (table.status === "reserved" && !isVerified) {
    return (
      <CustomerLayout minimal>
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="bg-card border border-amber-200 rounded-3xl p-8 shadow-lg text-center">
              <div className="bg-amber-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">{table.name} — Reserved</h1>
              <p className="text-muted-foreground text-sm mb-8">
                This table is reserved. Enter the 8-character code from your reservation confirmation to check in.
              </p>

              <div className="space-y-4">
                <Input
                  value={verifyCode}
                  onChange={(e) => { setVerifyCode(e.target.value.toUpperCase()); setVerifyError(""); }}
                  placeholder="Enter reservation code (e.g. ABC12345)"
                  className="text-center text-lg font-mono tracking-widest h-14 border-2 uppercase"
                  maxLength={8}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                />

                {verifyError && (
                  <p className="text-sm text-destructive font-medium">{verifyError}</p>
                )}

                <Button
                  className="w-full h-12 text-base font-semibold"
                  onClick={handleVerify}
                  disabled={verifyReservation.isPending}
                >
                  <KeyRound className="w-5 h-5 mr-2" />
                  {verifyReservation.isPending ? "Verifying..." : "Verify & Check In"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-6">
                Don't have a code? <a href="/reservation" className="text-primary underline">Make a reservation</a>
              </p>
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout minimal>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Order for {table.name}</h1>
          <Badge variant="outline" className="text-sm">{table.status === 'occupied' ? 'Occupied' : 'Available'}</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <Tabs defaultValue={categories[0]} className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto bg-card border border-border h-auto py-2 px-2 flex-nowrap rounded-lg mb-6">
                {categories.map(category => (
                  <TabsTrigger 
                    key={category} 
                    value={category}
                    className="capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
                  >
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {categories.map(category => (
                <TabsContent key={category} value={category} className="mt-0 outline-none">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products?.filter(p => p.category === category && p.available).map(product => (
                      <Card key={product.id} className="flex flex-col border-border/50 bg-card/50 hover:border-primary/50 transition-colors">
                        <CardHeader className="p-4 pb-2">
                          <div className="flex justify-between items-start gap-4">
                            <CardTitle className="text-lg leading-tight">{product.name}</CardTitle>
                            <span className="font-bold text-primary shrink-0">${product.price.toFixed(2)}</span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 flex-1">
                          <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                        </CardContent>
                        <CardFooter className="p-4 pt-0 mt-auto">
                          <Button 
                            onClick={() => addToCart(product)} 
                            className="w-full"
                            variant="secondary"
                          >
                            <Plus className="w-4 h-4 mr-2" /> Add to Order
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                  {products?.filter(p => p.category === category && p.available).length === 0 && (
                    <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
                      No items available in this category.
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div className="lg:sticky lg:top-24">
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-primary/5 border-b border-border/50 py-4">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  Your Order
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[40vh] min-h-[300px] max-h-[500px]">
                  {cart.length === 0 ? (
                    <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                      <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
                      <p>Your cart is empty.</p>
                      <p className="text-sm mt-1">Add some items from the menu.</p>
                    </div>
                  ) : (
                    <div className="p-4 flex flex-col gap-4">
                      {cart.map((item) => (
                        <div key={item.product.id} className="flex flex-col gap-2 p-3 bg-secondary/50 rounded-lg border border-border/50">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-medium text-sm leading-tight">{item.product.name}</span>
                            <span className="font-bold text-sm">${(item.product.price * item.quantity).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center bg-background border border-border rounded-md">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-none rounded-l-md hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => removeFromCart(item.product.id)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-none rounded-r-md hover:bg-primary/10 hover:text-primary"
                                onClick={() => addToCart(item.product)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                              onClick={() => deleteFromCart(item.product.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 p-4 border-t border-border/50 bg-secondary/20">
                <div className="flex justify-between w-full items-center">
                  <span className="font-medium text-muted-foreground">Total</span>
                  <span className="text-2xl font-bold text-primary">${cartTotal.toFixed(2)}</span>
                </div>
                <Button 
                  className="w-full h-12 text-lg font-semibold" 
                  disabled={cart.length === 0 || createOrder.isPending}
                  onClick={handleSubmitOrder}
                >
                  {createOrder.isPending ? "Sending Order..." : "Place Order"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
