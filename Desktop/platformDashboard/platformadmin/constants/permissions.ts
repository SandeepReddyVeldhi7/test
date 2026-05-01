export interface PermissionGroup {
    title: string;
    defaultChecked?: boolean;
    permissions: { key: string; label: string }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
    {
        title: "Daily Work & Field Operations",
        permissions: [
            { key: "DAY_PLAN", label: "Day Plan" },
            { key: "MY_ACTIVITY", label: "My Activity" },
            { key: "ADD_CLIENT", label: "Add Client" },
            { key: "EXPENSE", label: "Expense" },
            { key: "TOUR_PLAN", label: "Tour Plan" },
            { key: "SALE", label: "Sale/Target" },
            { key: "COMPLAINT", label: "Complaint Form" },
        ]
    },
    {
        title: "HRMS",
        permissions: [
            { key: "LEAVES", label: "Leaves" },
            { key: "HOLIDAYS", label: "Holidays" },
            { key: "PAY_SLIPS", label: "Pay Slips" },
        ]
    },
    {
        title: "Reports",
        permissions: [
            { key: "REPORTS", label: "Reports Hub" },
        ]
    },
    {
        title: "Extra Features",
        permissions: [
            { key: "CHAT", label: "Internal Chat" },
            { key: "TODO", label: "To-Do List" },
        ]
    },
    {
        title: "Administration",
        defaultChecked: true,
        permissions: [
            { key: "CREATE_USER", label: "Manage Users" },
            { key: "CREATE_ROLE", label: "Manage Roles" },
            { key: "MAP_VIEW", label: "Map View" },
            { key: "ASSESSMENT", label: "Full Assessment" },
            { key: "TARGET_VS_ACHIEVEMENT", label: "Target vs Ach." },
        ]
    }
];

export const PERMISSION_AUTO_MAP: Record<string, string[]> = {
    MY_ACTIVITY: ["DCR_APPROVE"],
    EXPENSE: ["EXPENSE_APPROVE"],
    TOUR_PLAN: ["TOUR_PLAN_APPROVE"],
    LEAVES: ["LEAVE_APPROVE"],
    SALE: ["TARGET_VIEW"]
};

export const resolvePermissions = (selectedPermissions: string[]): string[] => {
    const fullSet = new Set<string>(selectedPermissions);
    selectedPermissions.forEach(key => {
        const mapped = PERMISSION_AUTO_MAP[key];
        if (mapped) {
            mapped.forEach(mKey => fullSet.add(mKey));
        }
    });
    return Array.from(fullSet);
};

export const getInitialPermissions = (): string[] => {
    const defaults = PERMISSION_GROUPS
        .filter(group => group.defaultChecked)
        .flatMap(group => group.permissions.map(p => p.key));
    return resolvePermissions(defaults);
};
