import { useState } from "react";
import {
    UserPlus,
    Search,
    Mail,
    Phone,
    Shield,
    ShieldCheck,
    Edit2,
    CheckCircle2,
    XCircle,
    Loader2,
    Eye,
    EyeOff,
    AlertTriangle,
    UserCircle2
} from "lucide-react";
import {
    Button,
    Input,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Label,
    Skeleton,
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
    cn,
    toast,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@repo/ui";
import { type ApiStaffMember, useApiStaff, staffQueryKeys, api } from "@repo/store";
import { useQueryClient } from "@tanstack/react-query";


interface StaffManagementProps {
    currentUserId?: string | null;
}

const StaffManagement = ({ currentUserId = null }: StaffManagementProps) => {
    const qc = useQueryClient();
    const { data: staff = [], isLoading: loading } = useApiStaff();
    
    const [searchQuery, setSearchQuery] = useState("");
    const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<ApiStaffMember | null>(null);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [confirmMember, setConfirmMember] = useState<ApiStaffMember | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        password: "",
        role: "staff" as "admin" | "staff" | "instructor"
    });


    const filteredStaff = staff.filter(s => {
        const fullName = `${s.first_name ?? ""} ${s.last_name ?? ""}`.toLowerCase();
        const q = searchQuery.toLowerCase();
        return fullName.includes(q) || s.email.toLowerCase().includes(q);
    });

    // Count active admins so we can protect the last one
    const activeAdminCount = staff.filter(s => s.role === "admin" && s.is_active).length;
    const isLastActiveAdmin = (member: ApiStaffMember) =>
        member.role === "admin" && member.is_active && activeAdminCount <= 1;
    const isSelf = (member: ApiStaffMember) => member.id === currentUserId;

    const getInitials = (firstName: string | null, lastName: string | null) => {
        return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
    };

    const handleOpenAdd = () => {
        setEditingStaff(null);
        setFormData({ first_name: "", last_name: "", email: "", phone: "", password: "", role: "staff" });
        setShowPassword(false);
        setIsStaffDialogOpen(true);
    };

    const handleOpenEdit = (member: ApiStaffMember) => {
        setEditingStaff(member);
        setFormData({
            first_name: member.first_name ?? "",
            last_name: member.last_name ?? "",
            email: member.email,
            phone: member.phone ?? "",
            password: "",
            role: member.role
        });
        setIsStaffDialogOpen(true);
    };

    const handleSaveStaff = async () => {
        if (!formData.first_name) {
            toast.error("First name is required");
            return;
        }

        if (formData.role !== 'instructor' && !formData.email) {
            toast.error("Email is required for staff and admins");
            return;
        }

        setSaving(true);

        try {
            if (editingStaff) {
                // Update existing user
                await api.put(`/admin/users/${editingStaff.id}`, {
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    phone: formData.phone || null,
                    role: formData.role,
                });
                toast.success("Staff updated successfully");
            } else {
                // Create new staff/instructor user
                if (formData.role !== 'instructor' && (!formData.password || formData.password.length < 6)) {
                    toast.error("Password must be at least 6 characters");
                    setSaving(false);
                    return;
                }

                await api.post("/admin/users", {
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    email: formData.email || `${formData.first_name.toLowerCase()}.${Date.now()}@instructor.local`, // dummy email for instructors if empty
                    phone: formData.phone || null,
                    password: formData.role === 'instructor' ? undefined : formData.password,
                    role: formData.role,
                });
                toast.success("Staff member created successfully");
            }
            setIsStaffDialogOpen(false);
            qc.invalidateQueries({ queryKey: staffQueryKeys.all });
        } catch (err: any) {
            const message = err?.body?.message ?? "Failed to save staff member";
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (member: ApiStaffMember) => {
        // For deactivation, show confirmation first
        if (member.is_active) {
            setConfirmMember(member);
            return;
        }
        // Activation is instant — no confirmation needed
        try {
            await api.post(`/admin/users/${member.id}/activate`);
            toast.success("Staff member activated");
            qc.invalidateQueries({ queryKey: staffQueryKeys.all });
        } catch (err: any) {
            toast.error(err?.body?.message ?? "Failed to activate staff member");
        }
    };

    const handleConfirmDeactivate = async () => {
        if (!confirmMember) return;
        const member = confirmMember;
        setConfirmMember(null);
        try {
            await api.post(`/admin/users/${member.id}/deactivate`);
            toast.success(`${member.first_name} ${member.last_name} has been deactivated`);
            qc.invalidateQueries({ queryKey: staffQueryKeys.all });
        } catch (err: any) {
            toast.error(err?.body?.message ?? "Failed to deactivate staff member");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Staff Management</h2>
                    <p className="text-muted-foreground">Manage your team members and their roles in a clear list view.</p>
                </div>
                <Button onClick={handleOpenAdd} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add New Staff
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search staff by name or email..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-border bg-muted/30">
                                <tr>
                                    <th className="px-6 py-4"><Skeleton className="h-4 w-16" /></th>
                                    <th className="px-6 py-4"><Skeleton className="h-4 w-20" /></th>
                                    <th className="px-6 py-4"><Skeleton className="h-4 w-12" /></th>
                                    <th className="px-6 py-4"><Skeleton className="h-4 w-14" /></th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="h-10 w-10 rounded-full" />
                                                <Skeleton className="h-4 w-32" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-2">
                                                <Skeleton className="h-3 w-40" />
                                                <Skeleton className="h-3 w-28" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><Skeleton className="h-4 w-14" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-1">
                                                <Skeleton className="h-8 w-8 rounded-md" />
                                                <Skeleton className="h-8 w-8 rounded-md" />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-border bg-muted/30">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-muted-foreground">Name</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground">Contact</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground">Role</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground">Status</th>
                                <th className="px-6 py-4 text-right font-semibold text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredStaff.map((member) => (
                                <tr key={member.id} className="group transition-colors hover:bg-muted/30">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                                                {getInitials(member.first_name, member.last_name)}
                                            </div>
                                            <span className="font-medium text-foreground">{member.first_name} {member.last_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                <Mail className="h-3 w-3" />
                                                <span>{member.role === 'instructor' ? 'No Login Access' : member.email}</span>
                                            </div>
                                            {member.phone && (
                                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                <Phone className="h-3 w-3" />
                                                <span>{member.phone}</span>
                                            </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 font-medium">
                                            {member.role === "admin" ? (
                                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                            ) : member.role === "staff" ? (
                                                <Shield className="h-3.5 w-3.5 text-slate-400" />
                                            ) : (
                                                <UserCircle2 className="h-3.5 w-3.5 text-blue-400" />
                                            )}
                                            <span className="capitalize">{member.role}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={cn(
                                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                            member.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                        )}>
                                            {member.is_active ? "active" : "inactive"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            {/* Deactivate / Activate */}
                                            {(() => {
                                                const locked = member.is_active && (isSelf(member) || isLastActiveAdmin(member));
                                                const title = isSelf(member)
                                                    ? "You cannot deactivate your own account"
                                                    : isLastActiveAdmin(member)
                                                    ? "Cannot deactivate the last active admin"
                                                    : member.is_active ? "Deactivate" : "Activate";
                                                return (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className={cn(
                                                                    "h-8 w-8",
                                                                    locked
                                                                        ? "cursor-not-allowed text-muted-foreground/30"
                                                                        : "text-muted-foreground hover:text-foreground"
                                                                )}
                                                                disabled={locked}
                                                                onClick={() => !locked && handleToggleStatus(member)}
                                                            >
                                                                {member.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{title}</TooltipContent>
                                                    </Tooltip>
                                                );
                                            })()}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                        onClick={() => handleOpenEdit(member)}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Edit staff</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredStaff.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        No staff members found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {/* Staff Dialog (Add/Edit) */}
            <Dialog open={isStaffDialogOpen} onOpenChange={setIsStaffDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingStaff ? "Edit Staff Member" : "Add New Staff Member"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>First Name</Label>
                                <Input
                                    placeholder="John"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Last Name</Label>
                                <Input
                                    placeholder="Doe"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                />
                            </div>
                        </div>
                        {formData.role !== 'instructor' && (
                            <div className="space-y-2">
                                <Label>Email Address</Label>
                                <Input
                                    type="email"
                                    placeholder="john@zenhouse.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    disabled={!!editingStaff}
                                />
                            </div>
                        )}
                        {(!editingStaff && formData.role !== 'instructor') && (
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Min 6 characters"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        )}
                        <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input
                                placeholder="012-345-678"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            {editingStaff && isLastActiveAdmin(editingStaff) ? (
                                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    <span>Cannot demote — this is the last active admin.</span>
                                </div>
                            ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFormData({ ...formData, role: "instructor" })}
                                    disabled={!!(editingStaff && isSelf(editingStaff))}
                                    className={cn(
                                        "flex-1 rounded-lg border p-3 text-center transition-all",
                                        formData.role === "instructor" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground",
                                        editingStaff && isSelf(editingStaff) && "cursor-not-allowed opacity-40"
                                    )}
                                >
                                    <UserCircle2 className="mx-auto mb-1 h-4 w-4" />
                                    <div className="text-sm font-medium">Instructor</div>
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, role: "staff" })}
                                    disabled={!!(editingStaff && isSelf(editingStaff))}
                                    className={cn(
                                        "flex-1 rounded-lg border p-3 text-center transition-all",
                                        formData.role === "staff" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground",
                                        editingStaff && isSelf(editingStaff) && "cursor-not-allowed opacity-40"
                                    )}
                                >
                                    <Shield className="mx-auto mb-1 h-4 w-4" />
                                    <div className="text-sm font-medium">Staff</div>
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, role: "admin" })}
                                    className={cn(
                                        "flex-1 rounded-lg border p-3 text-center transition-all",
                                        formData.role === "admin" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                                    )}
                                >
                                    <ShieldCheck className="mx-auto mb-1 h-4 w-4" />
                                    <div className="text-sm font-medium">Admin</div>
                                </button>
                            </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsStaffDialogOpen(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={handleSaveStaff} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingStaff ? "Save Changes" : "Add Staff Member"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Deactivate confirmation dialog */}
            <AlertDialog open={!!confirmMember} onOpenChange={(open) => !open && setConfirmMember(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate Staff Member?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <span className="font-medium text-foreground">
                                {confirmMember?.first_name} {confirmMember?.last_name}
                            </span>{" "}
                            will no longer be able to log in. You can reactivate them at any time.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleConfirmDeactivate}
                        >
                            Deactivate
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default StaffManagement;
