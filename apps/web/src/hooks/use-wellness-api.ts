import { useQuery } from "@tanstack/react-query";

const API_BASE =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

// ─── Types (from backend responses) ──────────────────────────────────────────

export interface ApiServiceType {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
}

export interface ApiPackage {
    id: string;
    name: string;
    package_type: "class_pack" | "membership";
    sessions_included: number | null;
    price: string; // decimal from backend
    validity_days: number;
    description: string | null;
    is_refundable: boolean;
    is_shareable: boolean;
    is_transferable: boolean;
}

export interface ApiScheduleSlot {
    id: string;
    service_type: string;
    service_type_id?: string;
    class_date: string; // "YYYY-MM-DD"
    start_time: string; // "HH:mm"
    end_time: string;
    status: string;
    remaining_spots: number;
    location_note: string | null;
    instructor_name?: string;
}

// ─── Fetchers ────────────────────────────────────────────────────────────────

async function fetchJson<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: { Accept: "application/json" },
    });
    if (!res.ok) {
        throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    return res.json();
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetch all active wellness service types (public, no auth).
 */
export function useServiceTypes() {
    return useQuery({
        queryKey: ["wellness", "serviceTypes"],
        queryFn: () =>
            fetchJson<{ data: ApiServiceType[] }>("/wellness/services").then(
                (r) => r.data
            ),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Fetch packages for a specific service type (public, no auth).
 */
export function useServicePackages(serviceTypeId: string | null | undefined) {
    return useQuery({
        queryKey: ["wellness", "packages", serviceTypeId],
        queryFn: () =>
            fetchJson<{ data: ApiPackage[] }>(
                `/wellness/services/${serviceTypeId}/packages`
            ).then((r) => r.data),
        enabled: !!serviceTypeId,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Fetch upcoming class schedule (public, no auth).
 * Optionally filter by service_type_id.
 */
export function useSchedule(serviceTypeId?: string | null) {
    const params = serviceTypeId
        ? `?service_type_id=${serviceTypeId}`
        : "";
    return useQuery({
        queryKey: ["wellness", "schedule", serviceTypeId ?? "all"],
        queryFn: () =>
            fetchJson<{ data: ApiScheduleSlot[] }>(
                `/wellness/schedule${params}`
            ).then((r) => r.data),
        staleTime: 60 * 1000, // 1 minute (schedule changes more often)
    });
}

// ─── Public Business Settings ──────────────────────────────────────────────

export interface PublicBusinessSettings {
    cafe_name: string | null;
    cafe_tagline: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    address_line1: string | null;
    address_line2: string | null;
    studio_hours: { day: string; hours: string }[] | null;
}

/**
 * Fetch public business info for the Contact page (no auth required).
 */
export function usePublicSettings() {
    return useQuery({
        queryKey: ["settings", "public"],
        queryFn: () =>
            fetchJson<{ data: PublicBusinessSettings }>("/settings/public").then(
                (r) => r.data
            ),
        staleTime: 10 * 60 * 1000, // 10 minutes — settings change rarely
    });
}

