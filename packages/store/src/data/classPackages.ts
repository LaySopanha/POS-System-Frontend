// ─── Class types offered at Zen House ────────────────────────────────────────

export interface ClassType {
  id: string;
  name: string;
  description: string;
  image?: string;
}

export const classTypes: ClassType[] = [
  { id: "reformer", name: "Reformer Pilates", description: "Build strength and flexibility on the reformer machine." },
  { id: "cadillac", name: "Cadillac", description: "Full-body conditioning using the Cadillac apparatus." },
  { id: "hot-pilates", name: "Hot Pilates", description: "High-energy Pilates in a heated studio." },
  { id: "barre", name: "Barre", description: "Focus on small, high-rep movements to build lean muscle." },
  { id: "recovery-lounge", name: "Recovery Lounge", description: "Recovery sessions including sauna and cold plunge." },
];

// ─── Packages per class type ─────────────────────────────────────────────────

export interface ClassPackage {
  id: string;
  classTypeId: string;
  name: string;
  sessions: number;
  price: number;
  pricePerClass: number;
  validity: string;
  description: string;
  isIntro?: boolean;
  duration?: string;
}

export const classPackages: ClassPackage[] = [
  // Reformer
  { id: "ref-intro", classTypeId: "reformer", name: "Intro Offer", sessions: 3, price: 51, pricePerClass: 17, validity: "3 weeks", description: "Perfect for first-timers.", isIntro: true },
  { id: "ref-1", classTypeId: "reformer", name: "Standard 1", sessions: 1, price: 22, pricePerClass: 22, validity: "1 week", description: "Single drop-in reformer session." },
  { id: "ref-6", classTypeId: "reformer", name: "Standard 6", sessions: 6, price: 120, pricePerClass: 20, validity: "2 months", description: "6-class pack for regular practice." },
  { id: "ref-12", classTypeId: "reformer", name: "Standard 12", sessions: 12, price: 216, pricePerClass: 18, validity: "4 months", description: "12 sessions pack." },
  { id: "ref-24", classTypeId: "reformer", name: "Standard 24", sessions: 24, price: 384, pricePerClass: 16, validity: "5 months", description: "24 sessions pack." },
  { id: "ref-30", classTypeId: "reformer", name: "Standard 30", sessions: 30, price: 420, pricePerClass: 14, validity: "6 months", description: "30 sessions pack." },

  // Cadillac
  { id: "cad-intro", classTypeId: "cadillac", name: "Intro Offer", sessions: 3, price: 60, pricePerClass: 20, validity: "3 weeks", description: "Cadillac intro offer.", isIntro: true },
  { id: "cad-1", classTypeId: "cadillac", name: "Standard 1", sessions: 1, price: 25, pricePerClass: 25, validity: "1 week", description: "Single Cadillac session." },
  { id: "cad-6", classTypeId: "cadillac", name: "Standard 6", sessions: 6, price: 138, pricePerClass: 23, validity: "2 months", description: "6-class Cadillac pack." },
  { id: "cad-12", classTypeId: "cadillac", name: "Standard 12", sessions: 12, price: 252, pricePerClass: 21, validity: "4 months", description: "12 sessions Cadillac pack." },
  { id: "cad-24", classTypeId: "cadillac", name: "Standard 24", sessions: 24, price: 456, pricePerClass: 19, validity: "5 months", description: "24 sessions Cadillac pack." },
  { id: "cad-30", classTypeId: "cadillac", name: "Standard 30", sessions: 30, price: 540, pricePerClass: 18, validity: "6 months", description: "30 sessions Cadillac pack." },

  // Hot Pilates
  { id: "hot-intro", classTypeId: "hot-pilates", name: "Intro Offer", sessions: 3, price: 39, pricePerClass: 13, validity: "3 weeks", description: "Hot Pilates intro offer.", isIntro: true },
  { id: "hot-1", classTypeId: "hot-pilates", name: "Standard 1", sessions: 1, price: 20, pricePerClass: 20, validity: "1 week", description: "Single heated class." },
  { id: "hot-6", classTypeId: "hot-pilates", name: "Standard 6", sessions: 6, price: 108, pricePerClass: 18, validity: "2 months", description: "6-class heated pack." },
  { id: "hot-12", classTypeId: "hot-pilates", name: "Standard 12", sessions: 12, price: 192, pricePerClass: 16, validity: "4 months", description: "12 sessions heated pack." },
  { id: "hot-24", classTypeId: "hot-pilates", name: "Standard 24", sessions: 24, price: 336, pricePerClass: 14, validity: "5 months", description: "24 sessions heated pack." },
  { id: "hot-30", classTypeId: "hot-pilates", name: "Standard 30", sessions: 30, price: 360, pricePerClass: 12, validity: "6 months", description: "30 sessions heated pack." },

  // Barre
  { id: "barre-intro", classTypeId: "barre", name: "Intro Offer", sessions: 3, price: 36, pricePerClass: 12, validity: "3 weeks", description: "Barre intro offer.", isIntro: true },
  { id: "barre-1", classTypeId: "barre", name: "Standard 1", sessions: 1, price: 19, pricePerClass: 19, validity: "1 week", description: "Single barre class." },
  { id: "barre-6", classTypeId: "barre", name: "Standard 6", sessions: 6, price: 102, pricePerClass: 17, validity: "2 months", description: "6-class barre pack." },
  { id: "barre-12", classTypeId: "barre", name: "Standard 12", sessions: 12, price: 180, pricePerClass: 15, validity: "4 months", description: "12 sessions barre pack." },
  { id: "barre-24", classTypeId: "barre", name: "Standard 24", sessions: 24, price: 312, pricePerClass: 13, validity: "5 months", description: "24 sessions barre pack." },
  { id: "barre-30", classTypeId: "barre", name: "Standard 30", sessions: 30, price: 330, pricePerClass: 11, validity: "6 months", description: "30 sessions barre pack." },

  // Recovery Lounge
  { id: "rec-single", classTypeId: "recovery-lounge", name: "Single Pass", sessions: 1, price: 8, pricePerClass: 8, validity: "1 week", duration: "30 mins", description: "1 day access to recovery lounge." },
  { id: "rec-class", classTypeId: "recovery-lounge", name: "Class Pass", sessions: 1, price: 5, pricePerClass: 5, validity: "2 weeks", duration: "30 mins", description: "Single use after a class." },
  { id: "rec-9", classTypeId: "recovery-lounge", name: "Recovery Pass", sessions: 9, price: 35, pricePerClass: 3.88, validity: "3 months", duration: "30 mins", description: "9 recovery sessions." },
];

// ─── Membership packages ─────────────────────────────────────────────────────

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  validity: string;
  includes: string[];
  description: string;
}

export const membershipPlans: MembershipPlan[] = [
  {
    id: "mem-nourish",
    name: "Move and Nourish",
    price: 185,
    validity: "3 months",
    includes: ["8 classes", "$10 café credits"],
    description: "Combine your movement with nourishment."
  },
  {
    id: "mem-recover",
    name: "Move and Recover",
    price: 200,
    validity: "3 months",
    includes: ["8 classes", "Recovery passes"],
    description: "The perfect balance of movement and recovery."
  },
  {
    id: "mem-lifestyle",
    name: "Full Lifestyle",
    price: 250,
    validity: "5 months",
    includes: ["10 classes", "$15 café credit", "Recovery passes"],
    description: "Our most comprehensive wellness plan."
  }
];

// ─── Booking reservation type ────────────────────────────────────────────────

export interface ClassBooking {
  id: string;
  classTypeId: string;
  packageId: string;
  customerName: string;
  customerEmail: string;
  customerContact: string;
  contactMethod: "phone" | "telegram" | "whatsapp";
  selectedDate: string;
  selectedTime: string;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
}
