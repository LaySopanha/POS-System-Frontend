import React from "react";
import { type ClassType, classTypes } from "@repo/store";
import { ChevronRight, Clock, Users, Check } from "lucide-react";
import { cn, Calendar } from "@repo/ui";
import { useTranslation } from "react-i18next";

interface ScheduleViewProps {
    step: string;
    selectedClassType: ClassType | null;
    handleSelectClassType: (ct: ClassType, flow: "pricing" | "schedule") => void;
    selectedDate: Date | undefined;
    setSelectedDate: (date: Date | undefined) => void;
    availableTimes: any[];
    selectedSlots: any[];
    handleSelectTime: (slot: any) => void;
    handleCompleteBooking: () => void;
    customer: any;
    sessionsRemaining: number;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({
    step,
    selectedClassType,
    handleSelectClassType,
    selectedDate,
    setSelectedDate,
    availableTimes,
    selectedSlots,
    handleSelectTime,
    handleCompleteBooking,
    customer,
    sessionsRemaining,
}) => {
    const { t } = useTranslation();

    if (step === "schedule") {
        return (
            <div className="space-y-8 pt-8 animate-fade-in">
                <div className="text-center space-y-2">
                    <h2 
                        className="text-4xl font-normal text-foreground"
                        style={{ fontFamily: "var(--font-accent)" }}
                    >
                        {t('what_book')}
                    </h2>
                    <p className="text-sm font-medium text-muted-foreground tracking-wide opacity-80 uppercase">
                        {t('choose_practice')}
                    </p>
                </div>

                <div className="grid gap-3">
                    {classTypes.map((ct) => (
                        <button
                            key={ct.id}
                            onClick={() => handleSelectClassType(ct, "schedule")}
                            className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-5 transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
                        >
                            <span 
                                className="font-display text-base font-semibold tracking-wide text-foreground uppercase"
                                style={{ fontFamily: "var(--font-serif)" }}
                            >
                                {ct.name}
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (step === "schedule-time") {
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
                                {t('select_session')}
                            </h3>
                        </div>

                        <div className="grid gap-4">
                            {availableTimes.map((slot) => {
                                const isSelected = selectedSlots.some(s => s.id === slot.id);
                                return (
                                    <button
                                        key={slot.id}
                                        disabled={slot.isFull}
                                        onClick={() => handleSelectTime(slot)}
                                        className={cn(
                                            "relative flex items-center justify-between rounded-2xl border px-6 py-4 text-left transition-all",
                                            isSelected
                                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                : "border-border bg-card hover:border-primary/20",
                                            slot.isFull && "opacity-50 grayscale cursor-not-allowed"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "flex h-5 w-5 items-center justify-center rounded-full border transition-all",
                                                isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border bg-background"
                                            )}>
                                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                            </div>
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
                                            {slot.isFull ? (
                                                <span className="rounded-full bg-muted/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    Full
                                                </span>
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground/60">
                                                        <Users className="h-3 w-3" />
                                                        {slot.spotsLeft} spots
                                                    </span>
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                            
                            {availableTimes.length === 0 && (
                                <div className="py-16 text-center rounded-[2.5rem] border border-dashed border-border flex flex-col items-center bg-muted/5">
                                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                                        <Clock className="h-7 w-7 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground">{t('no_sessions')}</p>
                                </div>
                            )}

                            {selectedSlots.length > 0 && (
                                <div className="pt-4 animate-in slide-in-from-bottom-4 duration-300">
                                    <button
                                        onClick={handleCompleteBooking}
                                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-xl transition-all hover:bg-primary/90 hover:shadow-2xl active:scale-[0.98]"
                                    >
                                        {t('done_booking')} ({selectedSlots.length}) →
                                    </button>
                                    {customer && sessionsRemaining > 0 && (
                                        <p className="mt-3 text-center text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                            {sessionsRemaining - selectedSlots.length} {t('sessions_remaining')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </div>
        );
    }

    return null;
};

export default ScheduleView;
