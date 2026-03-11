import React from "react";
import { Mail, Phone, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const ContactUsPage: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center pt-8 animate-fade-in">
            <div className="space-y-6 w-full px-4">
                <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm">
                    <div className="text-center">
                        <h2
                            className="font-display text-2xl font-bold text-foreground"
                            style={{ fontFamily: "var(--font-serif)" }}
                        >
                            {t('contact')}
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">We'd love to hear from you.</p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-4 rounded-2xl bg-muted/30 p-4 border border-border/50">
                            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email</p>
                                <p className="text-sm font-semibold text-foreground">hello@zenhouse.com</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 rounded-2xl bg-muted/30 p-4 border border-border/50">
                            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Phone className="h-5 w-5" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone</p>
                                <p className="text-sm font-semibold text-foreground">+1 (555) 123-4567</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 rounded-2xl bg-muted/30 p-4 border border-border/50">
                            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <MessageCircle className="h-5 w-5" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Socials</p>
                                <p className="text-sm font-semibold text-foreground">@zenhouse</p>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-border pt-5">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 text-left">
                            {t('studio_hours')}
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground text-left">
                            <span className="font-medium">Mon – Fri</span>
                            <span className="text-foreground font-semibold">6:00 AM – 9:00 PM</span>
                            <span className="font-medium">Saturday</span>
                            <span className="text-foreground font-semibold">7:00 AM – 6:00 PM</span>
                            <span className="font-medium">Sunday</span>
                            <span className="text-foreground font-semibold">8:00 AM – 4:00 PM</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactUsPage;
