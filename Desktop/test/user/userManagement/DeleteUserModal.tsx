"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Button } from "baseui/button";

import { User } from "@/types/user";

type DeleteUserModalProps = {
  user: User | null;
  onDelete: (userId: string) => void;
  onClose: () => void;
  isLoading: boolean;
};

const DeleteUserModal = ({
  user,
  onDelete,
  onClose,
  isLoading,
}: DeleteUserModalProps) => {
  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 shadow-2xl -translate-y-1/2 w-full h-full max-w-lg max-h-[200px] bg-[#17252d] rounded-lg p-4 text-white ">
          {/* Title */}
          <div className="flex  justify-end items-end">
            <button onClick={onClose} className="cursor-pointer text-2xl    ">
              x
            </button>
          </div>
          <Dialog.Title>
            <span className="text-white text-xl font-semibold mb-4">
              Confirm Delete
            </span>
          </Dialog.Title>

          <p className="text-white">
            Are you sure you want to delete{" "}
            <span style={{ fontWeight: 600, color: "#fff" }}>
              {user?.username}
            </span>
            ?
          </p>

          {/* Buttons */}
          <div className="flex justify-end gap-2 w-full">
            <Button
              size="compact"
              className="bg-brand! text-white!"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              size="compact"
              disabled={isLoading}
              onClick={() => user && user.id && onDelete(user.id)}
              className="bg-red-500! text-white! p-2! "
            >
              {isLoading ? "Deleting" : "Delete"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default DeleteUserModal;
