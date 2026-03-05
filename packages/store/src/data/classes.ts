export type ClassStatus = "upcoming" | "in-progress" | "completed" | "cancelled";

export interface Instructor {
  id: string;
  name: string;
  specialty: string;
}

export interface ClassSlot {
  id: string;
  name: string;
  instructor: Instructor;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  status: ClassStatus;
  price: number;
  classTypeId: string;
  description: string;
}

export interface Reservation {
  id: string;
  classId: string;
  className: string;
  customerName: string;
  customerId: string;
  date: string;
  time: string;
  status: "confirmed" | "waitlisted" | "cancelled" | "attended" | "no-show";
  bookedAt: string;
}


export const instructors: Instructor[] = [
  { id: "i1", name: "Maya Lin", specialty: "Reformer Pilates" },
  { id: "i2", name: "Alex Rivera", specialty: "Mat Pilates" },
  { id: "i3", name: "Suki Tanaka", specialty: "Barre & Pilates" },
];

export const classSlots: ClassSlot[] = [
  {
    id: "cl1",
    name: "Reformer",
    instructor: instructors[1],
    date: "2026-03-04",
    startTime: "07:00",
    endTime: "07:50",
    capacity: 12,
    status: "upcoming",
    price: 22.00,
    classTypeId: "reformer",
    description: "Full body reformer session.",
  },
  {
    id: "cl2",
    name: "Cadillac",
    instructor: instructors[0],
    date: "2026-03-04",
    startTime: "09:00",
    endTime: "09:50",
    capacity: 12,
    status: "upcoming",
    price: 22.00,
    classTypeId: "reformer",
    description: "Morning strength on the reformer.",
  },
  {
    id: "cl3",
    name: "Hot Pilates",
    instructor: instructors[2],
    date: "2026-03-04",
    startTime: "11:00",
    endTime: "11:50",
    capacity: 10,
    status: "upcoming",
    price: 25.00,
    classTypeId: "cadillac",
    description: "Controlled movements focus.",
  },
  {
    id: "cl4",
    name: "Barre",
    instructor: instructors[1],
    date: "2026-03-04",
    startTime: "12:30",
    endTime: "13:20",
    capacity: 15,
    status: "upcoming",
    price: 19.00,
    classTypeId: "barre",
    description: "Post-lunch high-rep conditioning.",
  },
  {
    id: "cl5",
    name: "Recovery Lounge",
    instructor: instructors[0],
    date: "2026-03-04",
    startTime: "18:00",
    endTime: "18:50",
    capacity: 12,
    status: "upcoming",
    price: 22.00,
    classTypeId: "reformer",
    description: "Evening group session.",
  },
];

export const reservations: Reservation[] = [
  {
    id: "r1",
    classId: "cl1",
    className: "Morning Flow",
    customerName: "Sarah Chen",
    customerId: "c1",
    date: "2026-02-25",
    time: "07:00",
    status: "confirmed",
    bookedAt: "2026-02-23T14:00:00",
  },
  {
    id: "r2",
    classId: "cl1",
    className: "Morning Flow",
    customerName: "Emily Wright",
    customerId: "c3",
    date: "2026-02-25",
    time: "07:00",
    status: "confirmed",
    bookedAt: "2026-02-22T10:30:00",
  },
  {
    id: "r3",
    classId: "cl2",
    className: "Power Pilates",
    customerName: "Aisha Patel",
    customerId: "c5",
    date: "2026-02-25",
    time: "09:00",
    status: "confirmed",
    bookedAt: "2026-02-24T09:00:00",
  },
  {
    id: "r4",
    classId: "cl2",
    className: "Power Pilates",
    customerName: "Liam Nguyen",
    customerId: "c6",
    date: "2026-02-25",
    time: "09:00",
    status: "waitlisted",
    bookedAt: "2026-02-24T16:00:00",
  },
  {
    id: "r5",
    classId: "cl3",
    className: "Matcha & Move",
    customerName: "Olivia Kim",
    customerId: "c7",
    date: "2026-02-25",
    time: "11:00",
    status: "confirmed",
    bookedAt: "2026-02-23T11:00:00",
  },
  {
    id: "r6",
    classId: "cl5",
    className: "Evening Reformer",
    customerName: "James Park",
    customerId: "c2",
    date: "2026-02-25",
    time: "18:00",
    status: "cancelled",
    bookedAt: "2026-02-21T20:00:00",
  },
  {
    id: "r7",
    classId: "cl1",
    className: "Morning Flow",
    customerName: "Michael Torres",
    customerId: "c4",
    date: "2026-02-25",
    time: "07:00",
    status: "no-show",
    bookedAt: "2026-02-20T12:00:00",
  },
];
