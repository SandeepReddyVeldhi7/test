"use client";

import { useState } from "react";
import { Button } from "@base-ui/react";
import { ShieldUser } from "lucide-react";

import UserManagementModal from "./UserManagementModal";

export default function UserManagementHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white transition hover:border-white/16 hover:bg-white/[0.07]"
      >
        <ShieldUser className="size-4 text-text-secondary" />
        <span className="hidden sm:inline">User management</span>
      </Button>
      <UserManagementModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
