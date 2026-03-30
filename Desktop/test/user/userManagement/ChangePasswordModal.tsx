"use client";

import { useEffect } from "react";
import { Button, Input } from "@base-ui/react";
import { Dialog } from "@base-ui/react/dialog";
import { Controller, useForm } from "react-hook-form";



type ChangePasswordModalProps = {
  onClose: () => void;
  onSave: (password: string) => void;
  isLoading:boolean
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  isLoading:boolean
};

const ChangePasswordModal = ({
  onClose,
  onSave,
  isLoading
}: ChangePasswordModalProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
  } = useForm<PasswordForm>({
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    reset({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }, [reset]);

  const onSubmit = (data: PasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      alert("New password and confirm password must match!");
      return;
    }
    onSave(data.newPassword);
  };

  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 shadow-2xl backdrop-blur-md -translate-y-1/2 w-full max-w-md bg-[#17252d] rounded-lg p-6 text-white">
          {/* Close Button */}
          <div className="flex justify-end items-end">
            <button onClick={onClose} className="cursor-pointer text-xl">
              x
            </button>
          </div>

          {/* Title */}
          <Dialog.Title>
            <p className="text-white text-center text-xl font-semibold mb-4">
              Change Password
            </p>
          </Dialog.Title>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4 w-full"
          >
            <Controller
              name="newPassword"
              control={control}
              rules={{ required: "New password is required" }}
              render={({ field }) => (
                <Input
                  {...field}
                  type="password"
                  placeholder="New Password"
                  className="w-full bg-app-bg rounded-md h-12 px-4 text-white border border-gray-600"
                />
              )}
            />
            {errors.newPassword && (
              <p className="text-red-400 text-sm">
                {errors.newPassword.message}
              </p>
            )}

            <Controller
              name="confirmPassword"
              control={control}
              rules={{
                required: "Confirm password is required",
                validate: (value) =>
                  value === getValues("newPassword") || "Passwords do not match",
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  type="password"
                  placeholder="Confirm New Password"
                  className="w-full bg-app-bg rounded-md h-12 px-4 text-white border border-gray-600"
                />
              )}
            />
            {errors.confirmPassword && (
              <p className="text-red-400 text-sm">
                {errors.confirmPassword.message}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-brand text-white px-6 py-2 rounded-md cursor-pointer"
              >
               {isLoading ? "Saving" : "Save"}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ChangePasswordModal;
