"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "baseui/button";
import { Input } from "baseui/input";
import { TableBuilder, TableBuilderColumn } from "baseui/table-semantic";
import { KeyRound, LoaderCircle, Trash, UserPen } from "lucide-react";

import { useUsermanagement } from "@/hooks/useUsermanagement";
import { ErrorToast, SuccessToast } from "@/services/toasterServices";
import type { User } from "@/types/user";

import AddEditUserModal from "./AddEditUserModal";
import ChangePasswordModal from "./ChangePasswordModal";
import DeleteUserModal from "./DeleteUserModal";
import Pagination from "./Pagination";

type UserManagementModalProps = {
  isOpen: boolean;
  onClose: () => void;
};
const UserManagementModal = ({ isOpen, onClose }: UserManagementModalProps) => {
  const {
    addUser,
    updateUser,
    deleteUser,
    usersQuery,
    resetPassword,
  } = useUsermanagement({ enabled: isOpen });

  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editPassword, setEditPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 10;

  const allUsers = usersQuery.data || [];

  const users = useMemo(() => {
    return allUsers.map((user) => ({
      id: user.id,
      username: user.username ?? "N/A",
      phone_number: user.phone_number ?? "",
      email: user.email,
      profile_picture: user.profile_picture || "",
      is_active: user.is_active,
      is_superuser: user.is_superuser,
    }));
  }, [allUsers]);

  // Frontend Filter
  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        (u.username || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(search.toLowerCase()),
    );
  }, [users, search]);

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);

  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(
      (currentPage - 1) * rowsPerPage,
      currentPage * rowsPerPage,
    );
  }, [filteredUsers, currentPage]);

  const startIndex = (currentPage - 1) * rowsPerPage;

  const handleDelete = async (id: string) => {
    try {
      await deleteUser.mutateAsync(id);
      setUserToDelete(null);
    } catch (error) {
      console.log("error", error);
    }
  };

  const handleSubmit = async (user: User) => {
    try {
      if (user.id) {
        await updateUser.mutateAsync({
          id: user.id,
          user: user as unknown as import("@/hooks/useUsermanagement").User,
        });
      } else {
        await addUser.mutateAsync(
          user as unknown as import("@/hooks/useUsermanagement").User,
        );
      }
      setIsFormOpen(false);
    } catch (error) {
      console.log("error", error);
    }
  };
  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={onClose}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 shadow-2xl -translate-y-1/2 w-full max-w-6xl bg-[#0f1720] rounded-lg p-6 text-white ">
            {/* Title */}
            <div className="flex  justify-end items-end">
              <button onClick={onClose} className="cursor-pointer text-2xl ">
                x
              </button>
            </div>
            <Dialog.Title>
              <div className="flex justify-between items-center mt-10 mb-2  ">
                <h1 className=" text-text-white text-xl">User Management</h1>
                <div>
                  <button
                    className="bg-brand cursor-pointer  rounded p-1 px-2"
                    onClick={() => {
                      setCurrentUser({
                        username: "",
                        email: "",
                        password: "",
                      });
                      setIsFormOpen(true);
                    }}
                  >
                    Add User
                  </button>
                </div>
              </div>
            </Dialog.Title>

            <div className="flex flex-col md:flex-row gap-3  mb-4">
              <div className="flex-1">
                <Input
                  placeholder=" Search by username or email..."
                  value={search}
                  clearable
                  onChange={(e) => {
                    setSearch((e.target as HTMLInputElement).value);
                    setCurrentPage(1);
                  }}
                  overrides={{
                    Root: {
                      style: {
                        width: "100%",
                        maxHeight: "40px",
                        backgroundColor: "#0f1720",
                      },
                    },
                    InputContainer: {
                      style: { width: "100%", backgroundColor: "#0f1720" },
                    },
                    ClearIcon: {
                      style: {
                        cursor: "pointer",
                        width: "20px",
                        height: "20px",
                        color: "#ffffff",
                      },
                    },
                  }}
                />
              </div>
            </div>
            <div
              style={{
                height: "350px",
                overflowY: "auto",
              }}
              className="relative"
            >
              {usersQuery.isFetching ? (
                <div className="flex h-full items-center justify-center py-10">
                  <div className="flex flex-col items-center gap-2">
                    <LoaderCircle className="size-8 animate-spin text-brand" />
                    <p className="text-sm text-text-muted">Loading users...</p>
                  </div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="text-center text-lg text-white py-4">
                  No users found
                </p>
              ) : (
                <TableBuilder
                  data={paginatedUsers}
                  overrides={{
                    Table: {
                      style: {
                        borderCollapse: "separate",
                        width: "100%",
                        backgroundColor: "#0f1720",
                        color: "#ffffff",
                      },
                    },
                    TableHead: {
                      style: {
                        display: "table",
                        width: "100%",
                        tableLayout: "fixed",
                      },
                    },

                    TableBody: {
                      style: {
                        display: "block",
                        maxHeight: "300px",
                        overflowY: "auto",
                      },
                    },

                    TableBodyRow: {
                      style: {
                        display: "table",
                        width: "100%",
                        tableLayout: "fixed",
                        ":hover": {
                          backgroundColor: "#f9fafb",
                          color: "#ffffff",
                        },
                      },
                    },
                    TableHeadCell: {
                      style: {
                        position: "sticky",
                        top: 0,
                        zIndex: 10,
                        backgroundColor: "#17252d",
                        fontWeight: "800",
                        fontSize: "18px",
                        paddingLeft: "12px",
                        paddingRight: "12px",
                        paddingBottom: "12px",
                        paddingTop: "12px",
                        color: "#ffffff",
                      },
                    },
                    TableBodyCell: {
                      style: {
                        backgroundColor: "#0f1720",
                        paddingLeft: "12px",
                        paddingRight: "12px",
                        paddingBottom: "12px",
                        paddingTop: "12px",
                        fontSize: "14px",
                        color: "#ffffff",
                      },
                    },

                  }}
                >
                  <TableBuilderColumn<User> header="S.No">
                    {(_, index) =>
                      startIndex + (typeof index === "number" ? index : 0) + 1
                    }
                  </TableBuilderColumn>

                  <TableBuilderColumn<User> header="Username">
                    {(row) => (
                      <span style={{ fontWeight: 500 }}>{row.username}</span>
                    )}
                  </TableBuilderColumn>

                  <TableBuilderColumn<User> header="Email">
                    {(row) => row.email}
                  </TableBuilderColumn>

                  <TableBuilderColumn<User> header="Actions">
                    {(row) => (
                      <div className="flex items-center gap-2">
                        <Button
                          className="flex justify-center items-center text-white p-6  "
                          size="compact"
                          kind="tertiary"
                          onClick={() => {
                            setCurrentUser(row);
                            setIsFormOpen(true);
                          }}
                        >
                          <UserPen className="text-white" size={18} />
                        </Button>

                        <Button
                          className="flex justify-center items-center text-white p-6  "
                          size="compact"
                          kind="tertiary"
                          onClick={() => setUserToDelete(row)}
                        >
                          <Trash size={18} className="text-white" />
                        </Button>

                        <Button
                          className="flex justify-center items-center text-white p-6  "
                          size="compact"
                          kind="tertiary"
                          onClick={() => {
                            setCurrentUser(row);
                            setEditPassword(true);
                          }}
                        >
                          <KeyRound className="text-white" size={18} />
                        </Button>
                      </div>
                    )}
                  </TableBuilderColumn>
                </TableBuilder>
              )}
            </div>

            {!usersQuery.isFetching && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ADD / EDIT MODAL */}
      {isFormOpen && (
        <AddEditUserModal
          isLoading={updateUser.isPending}
          user={currentUser}
          onSave={(user: User) => {
            handleSubmit(user);
          }}
          onClose={() => setIsFormOpen(false)}
        />
      )}

      {/* DELETE MODAL */}
      {userToDelete && (
        <DeleteUserModal
          isLoading={deleteUser.isPending}
          user={userToDelete}
          onDelete={(id: string) => handleDelete(id)}
          onClose={() => setUserToDelete(null)}
        />
      )}

      {editPassword && currentUser && (
        <ChangePasswordModal
          isLoading={resetPassword.isPending}
          onClose={() => setEditPassword(false)}
          onSave={async (newPassword) => {
            try {
              if (!currentUser?.id) return;

              await resetPassword.mutateAsync({
                user_id: currentUser.id,
                new_password: newPassword,
              });
              setEditPassword(false);
              // useQuery handles refetching via invalidateQueries in hook
              SuccessToast({ message: "Password reset successfully" });
            } catch (err) {
              ErrorToast({
                message:
                  err instanceof Error
                    ? err.message
                    : "Failed to reset password",
              });
            }
          }}
        />
      )}
    </>
  );
};

export default UserManagementModal;
