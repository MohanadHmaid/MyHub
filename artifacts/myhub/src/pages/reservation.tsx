import { useState, useMemo, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetTables, useCreateReservation, useGetReservations, getGetReservationsQueryKey } from "@workspace/api-client-react";
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
  ChevronRight, ChevronLeft, CheckCircle2, CreditCard, UserPlus
} from "lucide-react";

const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00",
];

const STEPS = [
  { num: 1, label: "التاريخ" },
  { num: 2, label: "الوقت" },
  { num: 3, label: "Table" },
  { num: 4, label: "Your معلومة" },
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
  const { customer, isLoggedIn } = useAuth();

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<التاريخ | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (customer) {
      if (!name) setName(customer.name);
      if (!email) setEmail(customer.email);
      if (!phone && customer.phone) setPhone(customer.phone);
    }
  }, [customer]);

  const { data: tables, isLoading: tablesLoading } = useGetTables();
  const { data: allReservations } = useGetReservations({
    query: { queryKey: getGetReservationsQueryKey() }
  });

  const TOTAL_TABLES = tables?.length ?? 8;

  // Build a map: dateStr → slotStr → count of confirmed reservations
  const reservationMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const r of allReservations ?? []) {
      if (r.status === "cancelled") continue;
      const dt = new التاريخ(r.dateTime);
      const day = format(dt, "yyyy-MM-dd");
      const slot = format(dt, "HH") + ":00";
      if (!map[day]) map[day] = {};
      map[day][slot] = (map[day][slot] || 0) + 1;
    }
    return map;
  }, [allReservations]);

  // Day status: 'free' | 'partial' | 'hasFullSlot'
  const getDayStatus = (date: التاريخ): "free" | "partial" | "hasFullSlot" => {
    const key = format(date, "yyyy-MM-dd");
    const slots = reservationMap[key];
    if (!slots) return "free";
    const maxCount = Math.max(...Object.values(slots));
    if (maxCount >= TOTAL_TABLES) return "hasFullSlot";
    return "partial";
  };

  // Is a day fully blocked (ALL slots have count >= TOTAL_TABLES)?
  const isDayFullyBlocked = (date: التاريخ): boolean => {
    const key = format(date, "yyyy-MM-dd");
    const slots = reservationMap[key];
    if (!slots) return false;
    return TIME_SLOTS.every((s) => (slots[s] ?? 0) >= TOTAL_TABLES);
  };

  // Slot counts for selected date
  const slotCounts = useMemo(() => {
    if (!selectedDate) return {} as Record<string, number>;
    const key = format(selectedDate, "yyyy-MM-dd");
    return reservationMap[key] ?? {};
  }, [reservationMap, selectedDate]);

  // Get slot status: 'available' | 'full'
  const getSlotStatus = (slot: string): "available" | "full" => {
    const count = slotCounts[slot] ?? 0;
    return count >= TOTAL_TABLES ? "full" : "available";
  };

  // Check if a time slot is in the past
  const isTimePast = (slot: string): boolean => {
    if (!selectedDate) return false;
    const now = new التاريخ();
    
    // Get year, month, date of selectedDate in local timezone
    const selYear = selectedDate.getFullYear();
    const selMonth = selectedDate.getMonth();
    const selDay = selectedDate.getDate();
    
    // Get year, month, date of now in local timezone
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    const nowDay = now.getDate();
    
    // If selected date is in the past (yesterday or older), it is past
    if (selYear < nowYear) return true;
    if (selYear > nowYear) return false;
    if (selMonth < nowMonth) return true;
    if (selMonth > nowMonth) return false;
    if (selDay < nowDay) return true;
    if (selDay > nowDay) return false;
    
    // If selectedDate is EXACTLY today, compare hours and minutes
    const [slotHour, slotMinute] = slot.split(":").map(Number);
    const nowHour = now.getHours();
    const nowMinute = now.getMinutes();
    
    if (slotHour < nowHour) return true;
    if (slotHour === nowHour && slotMinute <= nowMinute) return true;
    
    return false;
  };

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
    if (name.trim().length < 2) e.name = "يجب أن يكون الاسم حرفين على الأقل";
    if (phone.trim().length < 10) e.phone = "Please enter a valid phone number";
    if (partySize < 1 || partySize > 20) e.partySize = "Party size must be between 1 and 20";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) return;
    const [h, m] = selectedTime.split(":").map(Number);
    const dt = new التاريخ(selectedDate);
    dt.setHours(h, m, 0, 0);

    createReservation.mutate({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        customerId: customer?.id ?? undefined,
        dateTime: dt.toISOString(),
        partySize,
      },
    });
  };

  return (
    <CustomerLayout>
      <div className={`container mx-auto px-4 py-12 transition-all ${step === 1 ? "max-w-5xl" : "max-w-2xl"}`}>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">احجز طاولة</h1>
          <p className="text-muted-foreground">Complete the steps below to secure your spot at MyHUB.</p>
        </div>

        <StepIndicator current={step} />

        {/* STEP 1 — Select التاريخ */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-[480px] rounded-3xl border border-border shadow-md overflow-hidden bg-card">
            {/* Left panel — info */}
            <div className="flex flex-col justify-between p-10 bg-primary/5 border-b md:border-b-0 md:border-r border-border">
              <div>
                <div className="bg-primary/15 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <CalendarCheck className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight mb-3">Choose a التاريخ</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Pick the day you'd like to visit MyHUB. Past dates are unavailable.
                </p>

                {/* Legend */}
                <div className="mt-6 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Availability</p>
                  {[
                    { color: "#dcfce7", border: "#86efac", label: "All tables free" },
                    { color: "#fef9c3", border: "#fde047", label: "Partially booked" },
                    { color: "#fee2e2", border: "#fca5a5", label: "Heavily booked" },
                    { color: "#f3f4f6", border: "#d1d5db", label: "Fully booked / unavailable", cross: true },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-block w-5 h-5 rounded-md border flex-shrink-0" style={{ backgroundColor: item.color, borderColor: item.border }} />
                      {item.label}
                    </div>
                  ))}
                </div>

                {selectedDate && (
                  <div className="mt-6 bg-primary/10 border border-primary/20 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Selected التاريخ</p>
                    <p className="text-xl font-bold text-foreground">{format(selectedDate, "MMMM d, yyyy")}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{format(selectedDate, "EEEE")}</p>
                  </div>
                )}
              </div>

              <Button
                className="h-12 text-base font-semibold mt-8 w-full"
                disabled={!selectedDate}
                onClick={goNext}
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Right panel — calendar */}
            <div className="flex items-center justify-center p-8 bg-card">
              <div className="w-full [&_.rdp]:w-full [&_.rdp-month]:w-full [&_.rdp-table]:w-full [&_.rdp-head_cell]:text-base [&_.rdp-cell]:py-1.5 [&_.rdp-button]:text-base [&_.rdp-button]:h-11 [&_.rdp-button]:w-11 [&_.rdp-caption_label]:text-lg [&_.rdp-caption_label]:font-bold">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (d && isDayFullyBlocked(d)) return;
                    setSelectedDate(d);
                  }}
                  disabled={(date) =>
                    isBefore(startOfDay(date), startOfDay(new التاريخ())) ||
                    isDayFullyBlocked(date)
                  }
                  modifiers={{
                    dayFree: (date) => !isBefore(startOfDay(date), startOfDay(new التاريخ())) && getDayStatus(date) === "free",
                    dayPartial: (date) => !isBefore(startOfDay(date), startOfDay(new التاريخ())) && getDayStatus(date) === "partial",
                    dayFull: (date) => !isBefore(startOfDay(date), startOfDay(new التاريخ())) && getDayStatus(date) === "hasFullSlot" && !isDayFullyBlocked(date),
                  }}
                  modifiersStyles={{
                    dayFree: { backgroundColor: "#dcfce7", color: "#166534", borderRadius: "8px", fontWeight: 600 },
                    dayPartial: { backgroundColor: "#fef9c3", color: "#854d0e", borderRadius: "8px", fontWeight: 600 },
                    dayFull: { backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "8px", fontWeight: 600 },
                  }}
                  className="rounded-xl w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — Select الوقت Slot with Heatmap */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="w-5 h-5 text-primary" />
              Pick a الوقت Slot
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
                const slotStatus = getSlotStatus(slot);
                const isSlotFull = slotStatus === "full";
                const isPast = isTimePast(slot);
                const isDisabled = isSlotFull || isPast;
                
                return (
                  <button
                    key={slot}
                    onClick={() => !isDisabled && setSelectedTime(slot)}
                    disabled={isDisabled}
                    className={`py-3 px-2 rounded-xl border-2 text-sm font-medium transition-all ${
                      isPast
                        ? "bg-secondary text-muted-foreground border-border opacity-40 cursor-not-allowed"
                        : isSlotFull
                        ? "bg-red-100 border-red-300 text-red-700 opacity-50 cursor-not-allowed"
                        : isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                        : "bg-emerald-50 border-emerald-300 hover:border-primary/50 text-foreground"
                    }`}
                    title={isPast ? "الوقت has already passed" : isSlotFull ? "لا tables available" : ""}
                  >
                    {display}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={goBack} className="flex-1 h-11">
                <ChevronLeft className="w-4 h-4 mr-1" /> رجوع
              </Button>
              <Button className="flex-1 h-11" disabled={!selectedTime} onClick={goNext}>
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3 — Select Table with Dynamic الحالة */}
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
                  // For future reservations, check if table is reserved at the selected time
                  const slotReservations = selectedTime ? (slotCounts[selectedTime] ?? 0) : 0;
                  const isAvailableAtTime = slotReservations < TOTAL_TABLES;
                  // For reservations, we only care about future availability, not current live status
                  const isTableAvailable = isAvailableAtTime;
                  const isSelected = selectedTableId === table.id;
                  
                  return (
                    <button
                      key={table.id}
                      disabled={!isTableAvailable}
                      onClick={() => setSelectedTableId(isSelected ? null : table.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        !isTableAvailable
                          ? "opacity-50 cursor-not-allowed bg-amber-50 border-amber-200"
                          : isSelected
                          ? "bg-primary/10 border-primary shadow-sm"
                          : "bg-card border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{table.name}</span>
                        <div className={`w-2.5 h-2.5 rounded-full ${isTableAvailable ? "bg-emerald-500" : "bg-amber-500"}`} />
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" /> حتى {table.capacity}
                      </div>
                      {!isTableAvailable && <span className="text-xs text-amber-600 font-medium mt-1 block">محجوزة</span>}
                      {isSelected && <span className="text-xs text-primary font-semibold mt-1 block">Selected ✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={goBack} className="flex-1 h-11">
                <ChevronLeft className="w-4 h-4 mr-1" /> رجوع
              </Button>
              <Button className="flex-1 h-11" onClick={goNext}>
                {selectedTableId ? "Continue" : "Skip & Continue"} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4 — العميل معلومة */}
        {step === 4 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <User className="w-5 h-5 text-primary" />
              Your Information
            </div>

            {!isLoggedIn && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <UserPlus className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-foreground">حفظ your reservation history</p>
                  <p className="text-muted-foreground mt-0.5">
                    <Link href="/register" className="text-primary font-medium hover:underline">Create a free account</Link>{" "}
                    or{" "}
                    <Link href="/login" className="text-primary font-medium hover:underline">sign in</Link>{" "}
                    to access all your bookings anytime.
                  </p>
                </div>
              </div>
            )}

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
                <Label htmlFor="email">البريد الإلكتروني Address <span className="text-muted-foreground text-xs">(optional)</span></Label>
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
                <ChevronLeft className="w-4 h-4 mr-1" /> رجوع
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
                    التاريخ
                  </div>
                  <span className="font-semibold text-sm">
                    {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 text-primary" />
                    الوقت Slot
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

            <div className="flex gap-3">
              <Button variant="outline" onClick={goBack} className="flex-1 h-11">
                <ChevronLeft className="w-4 h-4 mr-1" /> رجوع
              </Button>
              <Button
                className="flex-1 h-11"
                onClick={handleConfirm}
                disabled={createReservation.isPending}
              >
                {createReservation.isPending ? "Confirming..." : "تأكيد Reservation"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
