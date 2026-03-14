import React from "react";
import { ChevronRight, Clock, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn, Calendar, Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface SelectTimeViewProps {
    selectedDate: Date | undefined;
    setSelectedDate: (date: Date | undefined) => void;
    availableTimes: any[];
    selectedSlots: any[];
    handleSelectTime: (slot: any) => void;
    handleCompleteBooking: () => void;
    isBookingLoading?: boolean;
    customer: any;
    sessionsRemaining: number;
    selectedClassType: any;
    bookedClasses?: any[];
}

const SelectTimePage: React.FC<SelectTimeViewProps> = ({
    selectedDate,
    setSelectedDate,
    availableTimes,
    selectedSlots,
    handleSelectTime,
    handleCompleteBooking,
    isBookingLoading,
    customer,
    sessionsRemaining,
    selectedClassType,
    bookedClasses = [],
}) => {
    const { t } = useTranslation();
    const [isConfirming, setIsConfirming] = useState(false);

    return (
        <div className="space-y-12 pt-8 animate-fade-in">
            {/* Date Selection */}
            <section className="space-y-4">
                <div className="text-center">
                    <h3
                        className="text-3xl font-normal text-foreground"
                        style={{ fontFamily: "var(--font-accent)" }}
                    >
                        {t('select_date')}
                    </h3>
                </div>
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="rounded-md mx-auto"
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                </div>
            </section>

            {/* Time Selection */}
            {selectedDate && (
                <section className="space-y-6 animate-slide-up">
                    <div className="text-center">
                        <h3
                            className="text-3xl font-normal text-foreground"
                            style={{ fontFamily: "var(--font-accent)" }}
                        >
                            {t('select_session')} {selectedClassType ? `for ${selectedClassType.name}` : ''}
                        </h3>
                    </div>

                    <div className="grid gap-4">
                        {availableTimes.length > 0 ? (
                            availableTimes.map((slot) => {
                                const isSelected = selectedSlots.some(s => s.id === slot.id);
                                const isAlreadyBooked = bookedClasses?.some(b => b.scheduleId === slot.id && b.status === "confirmed");
                                return (
                                    <button
                                        key={slot.id}
                                        disabled={slot.isFull || isAlreadyBooked}
                                        onClick={() => handleSelectTime(slot)}
                                        className={cn(
                                            "relative flex items-center justify-between rounded-2xl border px-6 py-4 text-left transition-all",
                                            isSelected
                                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                : "border-border bg-card hover:border-primary/20",
                                            (slot.isFull || isAlreadyBooked) && "opacity-50 grayscale cursor-not-allowed"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-bold text-foreground leading-none">
                                                    {slot.startTime} – {slot.endTime}
                                                </p>
                                                <p className="text-[11px] font-medium text-muted-foreground leading-tight">
                                                    {slot.name} · {slot.instructor.name}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {isAlreadyBooked ? (
                                                <div className="flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Booked
                                                </div>
                                            ) : slot.isFull ? (
                                                <span className="rounded-full bg-muted/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    Full
                                                </span>
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground/60">
                                                        <Users className="h-3 w-3" />
                                                        {slot.spotsLeft} spots
                                                    </span>
                                                    <ChevronRight className="h-4 w-4 text-primary" />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="py-16 text-center rounded-[2.5rem] border border-dashed border-border flex flex-col items-center bg-muted/5">
                                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Clock className="h-7 w-7 text-muted-foreground" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">{t('no_sessions')}</p>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* One-Click Booking Drawer */}
            <Drawer 
                open={selectedSlots.length > 0} 
                onOpenChange={(open: boolean) => {
                    if (!open && selectedSlots.length > 0) {
                        // Clear selection if user closes drawer
                        handleSelectTime(selectedSlots[0]); 
                        setIsConfirming(false);
                    }
                }}
            >
                <DrawerContent>
                    <DrawerHeader className="text-left space-y-4 pt-4 pb-0">
                        <DrawerTitle className="text-2xl font-bold font-serif text-foreground">Confirm your booking</DrawerTitle>
                                                <div className="text-muted-foreground text-sm flex items-start gap-3 bg-muted/30 p-4 rounded-2xl">
                                                     <div className="h-10 w-10 flex items-center justify-center bg-background rounded-full shrink-0 border border-border">
                                                         <Clock className="h-4 w-4 text-foreground" />
                                                     </div>
                                                     <div className="flex flex-col">
                                                         <span className="font-bold text-foreground">{selectedSlots[0]?.name}</span>
                                                         <span>{selectedDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {selectedSlots[0]?.startTime}</span>
                                                         <span className="text-xs mt-1">with {selectedSlots[0]?.instructor?.name}</span>
                                                     </div>
                                                </div>
                    </DrawerHeader>
                    <DrawerFooter className="pb-8 pt-4">
                        {!isConfirming ? (
                            <button
                                onClick={() => setIsConfirming(true)}
                                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-xl transition-all hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.98]"
                            >
                                Confirm & Book Session
                            </button>
                        ) : (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsConfirming(false)}
                                    disabled={isBookingLoading}
                                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-muted py-4 text-sm font-bold text-foreground transition-all hover:bg-muted/80 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCompleteBooking}
                                    disabled={isBookingLoading}
                                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-foreground py-4 text-sm font-bold text-background shadow-xl transition-all hover:bg-foreground/90 active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isBookingLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Yes, I'm Sure
                                </button>
                            </div>
                        )}
                        {customer && sessionsRemaining > 0 && (
                            <div className="mt-2 flex items-center justify-center gap-1.5 text-center text-[10px] font-bold text-zen-dark uppercase tracking-widest px-4 py-2 bg-matcha/10 rounded-xl mx-auto w-fit">
                                <AlertCircle className="h-3 w-3 text-matcha" />
                                {sessionsRemaining} {t('sessions_remaining')}
                            </div>
                        )}
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </div>
    );
};

export default SelectTimePage;
