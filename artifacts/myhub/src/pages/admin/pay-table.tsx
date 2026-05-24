import { useState } from "react";
import { useGetTables, getGetTablesQueryKey, useUpdateTable } from "@workspace/api-client-react";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Monitor, Users, CreditCard, CheckCircle2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const PAYIBOURAQ_BASE_URL = "https://pay.ibouraq.com/link/";

type TableItem = {
  id: number;
  name: string;
  capacity: number;
  status: string;
  bill?: number;
};

export default function AdminPayTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [amount, setAmount] = useState("");
  const [qrLink, setQrLink] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [phoneNumber] = useState("0595256882");

  const { data: tables, isLoading } = useGetTables({
    query: { queryKey: getGetTablesQueryKey(), refetchInterval: 10000 },
  });

  const updateTable = useUpdateTable({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTablesQueryKey() });
        toast({ title: "Table cleared", description: `${selectedTable?.name} is now available.` });
        setSelectedTable(null);
        setAmount("");
        setQrLink(null);
        setConfirmDialogOpen(false);
      },
      onError: () => {
        toast({ title: "Failed to clear table", variant: "destructive" });
      },
    },
  });

  const handleGenerateQR = () => {
    if (!selectedTable || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({ title: "Invalid amount", description: "Please select a table and enter a valid amount.", variant: "destructive" });
      return;
    }
    // Format: *268*1*0595256882*[Price in placeholder]#
    const link = `*268*1*${phoneNumber}*${amount}#`;
    setQrLink(link);
  };

  const handleApprovePayment = () => {
    if (!selectedTable) return;
    updateTable.mutate({ id: selectedTable.id, data: { status: "available" as any } });
  };

  const occupiedTables = tables?.filter((t) => t.status === "occupied" || t.status === "reserved") ?? [];

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pay for Table</h1>
          <p className="text-muted-foreground mt-1">
            Select an occupied table, set the amount, generate a payment QR code, then clear the table on approval.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Table Selection */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Step 1 — Select a Table</h2>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
            ) : occupiedTables.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-xl text-muted-foreground gap-2">
                <Monitor className="w-8 h-8 opacity-30" />
                <p className="text-sm">No occupied or reserved tables right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {occupiedTables.map((table) => {
                  const isSelected = selectedTable?.id === table.id;
                  return (
                    <button
                      key={table.id}
                      onClick={() => {
                        setSelectedTable(table as TableItem);
                        setQrLink(null);
                        // Auto-populate amount from table bill if available
                        if (table.bill && table.bill > 0) {
                          setAmount(table.bill.toString());
                        } else {
                          setAmount("");
                        }
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "bg-primary/10 border-primary shadow-sm"
                          : "bg-card border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{table.name}</span>
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          table.status === "occupied" ? "bg-primary" : "bg-amber-400"
                        }`} />
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <Users className="w-3 h-3" /> Up to {table.capacity}
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          table.status === "occupied"
                            ? "bg-primary/10 text-primary border-primary/30 text-xs"
                            : "bg-amber-50 text-amber-700 border-amber-300 text-xs"
                        }
                      >
                        {table.status === "occupied" ? "Occupied" : "Reserved"}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Amount + QR Generation */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Step 2 — Set Amount & Generate QR</h2>
            <Card className={`transition-all ${!selectedTable ? "opacity-50 pointer-events-none" : ""}`}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  {selectedTable ? selectedTable.name : "No table selected"}
                </CardTitle>
                <CardDescription>Enter the amount to charge and generate the payment QR code.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Amount (ILS)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 500"
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setQrLink(null); }}
                      className="h-11"
                    />
                    <Button onClick={handleGenerateQR} className="shrink-0 h-11">
                      Generate QR
                    </Button>
                  </div>
                </div>

                {qrLink && (
                  <div className="flex flex-col items-center gap-4 pt-2">
                    <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                      <QRCodeSVG value={qrLink} size={180} level="H" includeMargin={false} fgColor="#134e4a" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Customer scans this code to pay <strong>₪{amount}</strong> via iBouraq
                    </p>
                    <div className="w-full bg-secondary/60 rounded-xl border border-border px-3 py-2">
                      <span className="text-xs font-mono text-foreground break-all">{qrLink}</span>
                    </div>

                    <Button
                      className="w-full h-11 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => setConfirmDialogOpen(true)}
                      disabled={updateTable.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve Payment & Clear Table
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment Approval</DialogTitle>
            <DialogDescription>
              This will mark the payment as approved and set <strong>{selectedTable?.name}</strong> back to{" "}
              <strong>available</strong>. Make sure the customer has completed the payment before proceeding.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={handleApprovePayment}
              disabled={updateTable.isPending}
            >
              <CheckCircle2 className="w-4 h-4" />
              {updateTable.isPending ? "Clearing..." : "Confirm & Clear Table"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
