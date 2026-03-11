import React from "react";
import { Mail, Phone, Globe, MapPin, Clock, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePublicSettings } from "@/hooks/use-wellness-api";

const DEFAULT_HOURS = [
    { day: "Mon – Fri", hours: "6:00 AM – 9:00 PM" },
    { day: "Saturday", hours: "7:00 AM – 6:00 PM" },
    { day: "Sunday", hours: "8:00 AM – 4:00 PM" },
];

const ContactUsPage: React.FC = () => {
    const { t } = useTranslation();
    const { data: settings, isLoading } = usePublicSettings();

    const studioHours = settings?.studio_hours?.length ? settings.studio_hours : DEFAULT_HOURS;

    const contactItems = [
        {
            icon: Mail,
            label: "Email",
            value: settings?.email || "hello@zenhouse.com",
            href: settings?.email ? `mailto:${settings.email}` : undefined,
        },
        {
            icon: Phone,
            label: "Phone",
            value: settings?.phone || "+855 12 345 678",
            href: settings?.phone ? `tel:${settings.phone}` : undefined,
        },
        {
            icon: Globe,
            label: "Website",
            value: settings?.website || "zenhouse.com",
            href: settings?.website || undefined,
        },
        ...(settings?.address_line1 ? [{
            icon: MapPin,
            label: "Address",
            value: [settings.address_line1, settings.address_line2].filter(Boolean).join(", "),
            href: undefined,
        }] : []),
    ];

    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center pt-8 animate-fade-in">
            <div className="space-y-6 w-full px-4">
                <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm">
                    <div className="text-center">
                        <h2
                            className="font-display text-2xl font-bold text-foreground"
                            style={{ fontFamily: "var(--font-serif)" }}
                        >
                            {settings?.cafe_name ? settings.cafe_name : t('contact')}
                        </h2>
                        {settings?.cafe_tagline && (
                            <p className="mt-1 text-xs font-bold text-primary uppercase tracking-widest">{settings.cafe_tagline}</p>
                        )}
                        <p className="mt-2 text-sm text-muted-foreground">We'd love to hear from you.</p>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3">
                                {contactItems.map((item, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-4 rounded-2xl bg-muted/30 p-4 border border-border/50"
                                        role={item.href ? "link" : undefined}
                                        onClick={item.href ? () => window.open(item.href, '_blank') : undefined}
                                        style={item.href ? { cursor: 'pointer' } : undefined}
                                    >
                                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary flex-shrink-0">
                                            <item.icon className="h-5 w-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                                            <p className="text-sm font-semibold text-foreground">{item.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-border pt-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Clock className="h-3.5 w-3.5 text-primary" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        {t('studio_hours')}
                                    </h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground text-left">
                                    {studioHours.map((row, i) => (
                                        <React.Fragment key={i}>
                                            <span className="font-medium">{row.day}</span>
                                            <span className="text-foreground font-semibold">{row.hours}</span>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactUsPage;
