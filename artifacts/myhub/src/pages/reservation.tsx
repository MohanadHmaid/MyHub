import { useState } from "react";
import { useLocation } from "wouter";
import { useGetTables, useCreateReservation } from "@workspace/api-client-react";
import CustomerLayout from "@/components/layout/customer-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format, isBefore, startOfDay } from "date-fns";
import {
  CalendarCheck, Clock, Monitor, Users, User, Phone, Mail,
  ChevronRight, ChevronLeft, CheckCircle2, CreditCard
} from "lucide-react";

const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00",
];

const STEPS = [
  { num: 1, label: "Date" },
  { num: 2, label: "Time" },
  { num: 3, label: "Table" },
  { num: 4, label: "Your Info" },
  { num: 5, label: "Summary" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-10">
      {STEPS.map((s, i) => (
        <div key={s.num} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
              current === s.num
                ? "bg-primary text-primary-foreground border-primary"
                : current > s.num
                ? "bg-primary/20 text-primary border-primary/40"
                : "bg-secondary text-muted-foreground border-border"
            }`}>
              {current > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${current === s.num ? "text-primary" : "text-muted-foreground"}`}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 w-8 md:w-12 mx-1 mb-5 transition-all ${current > s.num ? "bg-primary/40" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Reservation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: tables, isLoading: tablesLoading } = useGetTables();

  const createReservation = useCreateReservation({
    mutation: {
      onSuccess: (data) => {
        setLocation(`/success?code=${data.code}`);
      },
      onError: (error: any) => {
        toast({
          title: "Reservation failed",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      },
    },
  });

  const selectedTable = tables?.find((t) => t.id === selectedTableId);

  const goNext = () => setStep((s) => s + 1);
  const goBack = () => setStep((s) => s - 1);

  const validateStep4 = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "Name must be at least 2 characters";
    if (phone.trim().length < 10) e.phone = "Please enter a valid phone number";
    if (partySize < 1 || partySize > 20) e.partySize = "Party size must be between 1 and 20";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) return;
    const [h, m] = selectedTime.split(":").map(Number);
    const dt = new Date(selectedDate);
    dt.setHours(h, m, 0, 0);

    createReservation.mutate({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        dateTime: dt.toISOString(),
        partySize,
      },
    });
  };

  return (
    <CustomerLayout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Reserve a Table</h1>
          <p className="text-muted-foreground">Complete the steps below to secure your spot at MyHUB.</p>
        </div>

        <StepIndicator current={step} />

        {/* STEP 1 — Select Date */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <CalendarCheck className="w-5 h-5 text-primary" />
              Choose a Date
            </div>
            <div className="border border-border rounded-2xl p-4 bg-card shadow-sm">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
                className="rounded-xl"
              />
            </div>
            <Button
              className="w-full max-w-xs h-12 text-base"
              disabled={!selectedDate}
              onClick={goNext}
            >
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* STEP 2 — Select Time Slot */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="w-5 h-5 text-primary" />
              Pick a Time Slot
              {selectedDate && (
                <span className="text-muted-foreground font-normal text-sm ml-1">
                  — {format(selectedDate, "EEE, MMM d")}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {TIME_SLOTS.map((slot) => {
                const [h] = slot.split(":").map(Number);
                const isPM = h >= 12;
                const display = h > 12 ? `${h - 12}:00 PM` : h === 12 ? "12:00 PM" : `${h}:00 AM`;
                const isSelected = selectedTime === slot;
                return (
                  <button
                    key={slot}
                    onClick={() => setSelectedTime(slot)}
                    className={`py-3 px-2 rounded-xl border-2 text-sm font-medium transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                        : "bg-card border-border hover:border-primary/50 hover:bg-primary/5 text-foreground"
                    }`}
                  >
                    {display}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={goBack} className="flex-1 h-11">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button className="flex-1 h-11" disabled={!selectedTime} onClick={goNext}>
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3 — Select Table */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Monitor className="w-5 h-5 text-primary" />
              Select a Table
              <span className="text-muted-foreground font-normal text-sm ml-1">(optional — we can auto-assign)</span>
            </div>
            {tablesLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {tables?.map((table) => {
                  const isOccupied = table.status === "occupied";
                  const isSelected = selectedTableId === table.id;
                  return (
                    <button
                      key={table.id}
                      disabled={isOccupied}
                      onClick={() => setSelectedTableId(isSelected ? null : table.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        isOccupied
                          ? "opacity-50 cursor-not-allowed bg-destructive/5 border-destructive/20"
                          : isSelected
                          ? "bg-primary/10 border-primary shadow-sm"
                          : "bg-card border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{table.name}</span>
                        <div className={`w-2.5 h-2.5 rounded-full ${isOccupied ? "bg-red-500" : "bg-emerald-500"}`} />
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" /> Up to {table.capacity}
                      </div>
                      {isOccupied && <span className="text-xs text-destructive font-medium mt-1 block">Occupied</span>}
                      {isSelected && <span className="text-xs text-primary font-semibold mt-1 block">Selected ✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={goBack} className="flex-1 h-11">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button className="flex-1 h-11" onClick={goNext}>
                {selectedTableId ? "Continue" : "Skip & Continue"} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4 — Customer Info */}
        {step === 4 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <User className="w-5 h-5 text-primary" />
              Your Information
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="John Doe"
                    className="pl-9"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
                  />
                </div>
                {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    className="pl-9"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: "" })); }}
                  />
                </div>
                {errors.phone && <p className="text-destructive text-xs">{errors.phone}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="party">Party Size <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="party"
                    type="number"
                    min={1}
                    max={20}
                    className="pl-9"
                    value={partySize}
                    onChange={(e) => { setPartySize(Number(e.target.value)); setErrors((p) => ({ ...p, partySize: "" })); }}
                  />
                </div>
                {errors.partySize && <p className="text-destructive text-xs">{errors.partySize}</p>}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={goBack} className="flex-1 h-11">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                className="flex-1 h-11"
                onClick={() => { if (validateStep4()) goNext(); }}
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5 — Billing Summary */}
        {step === 5 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <CreditCard className="w-5 h-5 text-primary" />
              Booking Summary
            </div>

            <Card className="border-2 border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarCheck className="w-4 h-4 text-primary" />
                    Date
                  </div>
                  <span className="font-semibold text-sm">
                    {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 text-primary" />
                    Time Slot
                  </div>
                  <span className="font-semibold text-sm">
                    {selectedTime ? (() => {
                      const h = parseInt(selectedTime.split(":")[0]);
                      return h > 12 ? `${h - 12}:00 PM` : h === 12 ? "12:00 PM" : `${h}:00 AM`;
                    })() : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Monitor className="w-4 h-4 text-primary" />
                    Table
                  </div>
                  <span className="font-semibold text-sm">
                    {selectedTable ? selectedTable.name : "Auto-assigned by staff"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4 text-primary" />
                    Name
                  </div>
                  <span className="font-semibold text-sm">{name}</span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4 text-primary" />
                    Party Size
                  </div>
                  <span className="font-semibold text-sm">{partySize} {partySize === 1 ? "person" : "people"}</span>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Payment
                  </div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-semibold">
                    Pay at Café
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <div className="bg-secondary/50 rounded-xl p-4 border border-border text-sm text-muted-foreground text-center">
              No payment required now. You'll settle the bill when you arrive.
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={goBack} className="flex-1 h-11">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                className="flex-1 h-12 text-base font-semibold"
                onClick={handleConfirm}
                disabled={createReservation.isPending}
              >
                {createReservation.isPending ? "Confirming..." : "Confirm Reservation"}
                {!createReservation.isPending && <CheckCircle2 className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
