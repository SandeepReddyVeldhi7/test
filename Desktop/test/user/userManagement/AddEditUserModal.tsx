"use client";

import { useEffect, useState } from "react";
import { Button, Input } from "@base-ui/react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import Image from "next/image";

import { useUsermanagement } from "@/hooks/useUsermanagement";
import { User } from "@/types/user";

type AddEditUserModalProps = {
  user: User | null;
  onSave: (user: User) => void;
  onClose: () => void;
  isLoading: boolean;
};

const AddEditUserModal = ({
  user,
  onSave,
  onClose,
  isLoading,
}: AddEditUserModalProps) => {
  const [file_field, setFile_field] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const { uploadFile } = useUsermanagement();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<User>({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      phone_number: "",
    },
  });

  useEffect(() => {
    const initialValues = user
      ? {
        id: user.id,
        username: user.username,
        email: user.email,
        password: user.password,
        phone_number: user.phone_number || "",
      }
      : {
        username: "",
        email: "",
        password: "",
        phone_number: "",
      };

    reset(initialValues);

    const timer = setTimeout(() => {
      setPreviewUrl(user?.profile_picture || "");
    }, 0);

    return () => clearTimeout(timer);
  }, [user, reset]);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile_field(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };
  const handleRemoveImage = () => {
    setFile_field(null);
    setPreviewUrl("");
  };
  const onSubmit = async (data: User) => {
    let imageUrl = previewUrl || "";
    if (file_field) {
      setIsUploading(true);
      try {
        const res = await uploadFile.mutateAsync(file_field);
        imageUrl = (res?.results?.file_field_url || res?.url || "") as string;
      } catch (error) {
        console.error("Upload failed", error);
      } finally {
        setIsUploading(false);
      }
    }

    const payload: User = {
      ...user,
      username: data.username,
      email: data.email,
      ...(user?.id ? { phone_number: data.phone_number } : {}),
      ...(data.password ? { password: data.password } : {}),
      profile_picture: imageUrl || "",
    };

    onSave(payload);
  };

  const isFormLoading = isLoading || isUploading;
  return (
    <>
      <Dialog.Root open={true} onOpenChange={onClose}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 shadow-2xl backdrop-blur-md -translate-y-1/2 w-full max-w-lg bg-[#17252d] rounded-lg p-6 text-white ">
            {/* Title */}
            <div className="flex  justify-end items-end">
              <button onClick={onClose} className="cursor-pointer text-xl">
                x
              </button>
            </div>
            <Dialog.Title>
              <p className="text-white text-center text-xl font-semibold mb-4">
                {user?.id ? "Edit User" : "Add User"}
              </p>
            </Dialog.Title>
            <div className="flex justify-center items-center flex-col mb-6">
              <div
                className="relative 
    w-24 h-24 
    sm:w-28 sm:h-28 
    md:w-32 md:h-32 
    rounded-full overflow-hidden border-2 border-gray-400 group"
              >
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Profile"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white text-xl sm:text-2xl font-semibold">
                    {user?.username
                      ? user.username
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                      : "U"}
                  </div>
                )}

                {/* 👇 Overlay (NEW, no layout change) */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                  {previewUrl ? (
                    <span className="text-white text-sm">Edit</span>
                  ) : (
                    <span className="text-white text-sm">Upload</span>
                  )}
                </div>

                {/* File input stays SAME */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <div>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="mt-2 text-red-400 text-xs hover:text-red-500"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4 w-full"
            >
              <Controller
                name="username"
                control={control}
                rules={{ required: "Username is required" }}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Username"
                    className="w-full bg-app-bg rounded-md h-12 px-4 text-white border border-gray-600"
                  />
                )}
              />
              {errors.username && (
                <p className="text-red-400 text-sm">
                  {errors.username.message}
                </p>
              )}

              <Controller
                name="email"
                control={control}
                rules={{
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Please enter a valid email!",
                  },
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Email"
                    className="w-full bg-app-bg rounded-md h-12 px-4 text-white border border-gray-600"
                  />
                )}
              />
              {errors.email && (
                <p className="text-red-400 text-sm">{errors.email.message}</p>
              )}

              {!user?.id && (
                <Controller
                  name="password"
                  control={control}
                  // rules={{
                  //   required: "Password is required",
                  //   minLength: {
                  //     value: 8,
                  //     message: "Password must be at least 8 characters long",
                  //   },
                  // }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Password"
                      className="w-full bg-app-bg rounded-md h-12 px-4 text-white border border-gray-600"
                    />
                  )}
                />
              )}
              {errors.password && (
                <p className="text-red-400 text-sm">
                  {errors.password.message}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-4">
                <Button
                  type="submit"
                  disabled={isFormLoading}
                  className={`px-6 py-2 rounded-md text-white 
    ${isFormLoading ? "bg-gray-500 cursor-not-allowed" : "bg-brand"}`}
                >
                  {isFormLoading
                    ? user?.id
                      ? "Updating..."
                      : "Creating..."
                    : user?.id
                      ? "Update"
                      : "Create"}
                </Button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};

export default AddEditUserModal;
