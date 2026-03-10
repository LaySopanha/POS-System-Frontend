import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export interface ApiStaffMember {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    role: "admin" | "staff" | "instructor";
    is_active: boolean;
    created_at: string;
}

export const staffQueryKeys = {
    all: ["admin-staff"] as const,
};

export function useApiStaff() {
    return useQuery({
        queryKey: staffQueryKeys.all,
        queryFn: () => 
            api.get<{ data: ApiStaffMember[] }>("/admin/users?role=admin,staff,instructor")
               .then((r) => r.data),
        staleTime: 60 * 1000, 
    });
}
