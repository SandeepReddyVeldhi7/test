"use client";

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

import { apiEndpoints } from "@/services/apiEndpoints";
import makeApiRequest from "@/services/makeApiRequest";
import { queryKeys } from "@/services/queryKeys";
import { ErrorToast, SuccessToast } from "@/services/toasterServices";

export interface User {
  id: string;
  username: string;
  email: string;
  profile_picture?: string;
  phone_number?: string;
  is_active?: boolean;
  is_superuser?: boolean;
}
export interface GetUserResponse {
  count: number;
  next: string;
  previous: string;
  results: User[];
}
type FileUploadResponse = {
  url: string;
  id: string;
  results?: {
    file_field_url: string;
  };
};

type ApiSuccessResponse = {
  message?: string;
};

type ErrorMessageResponse = {
  message?: string;
};

export function useUsermanagement(options: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: queryKeys.getUsers,
    queryFn: async () => {
      let allUsers: User[] = [];
      let offset = 0;
      const limit = 100;
      
      while (true) {
        const data = await makeApiRequest<GetUserResponse>({
          url: `${apiEndpoints.GET_USERS}?limit=${limit}&offset=${offset}`,
          method: "GET",
          service: "auth",
        });
        allUsers = [...allUsers, ...(data.results || [])];
        if (!data.next) break;
        offset += limit;
      }
      return allUsers;
    },
    enabled: options.enabled ?? false, 
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
  });

  const getUsers = useMutation({
    mutationKey: queryKeys.getUsers,
    mutationFn: ({ limit = 10, offset = 0 }: { limit?: number; offset?: number } = {}) =>
      makeApiRequest<GetUserResponse>({
        url: `${apiEndpoints.GET_USERS}?limit=${limit}&offset=${offset}`,
        method: "GET",
        service: "auth",
      }),
  });
  const addUser = useMutation({
    mutationKey: queryKeys.addUser,
    mutationFn: (user: User) =>
      makeApiRequest({
        url: apiEndpoints.ADD_USER,
        method: "POST",
        service: "auth",
        data: user,
      }),
      
    onSuccess: async (response: unknown) => {
      const successResponse = response as ApiSuccessResponse;
      SuccessToast({
        message: successResponse?.message || "User created successfully",
      });

      await queryClient.invalidateQueries({
        queryKey: queryKeys.getUsers,
      });
    },
    onError: (error: ErrorMessageResponse) => {
      ErrorToast({
        message: error?.message || "Failed to create user",
      });
    },
  });
  const updateUser = useMutation({
    mutationKey: queryKeys.updateUser,
    mutationFn: ({ id, user }: { id: string; user: User }) =>
      makeApiRequest({
        url: `${apiEndpoints.UPDATE_USER}${id}/`,
        method: "PUT",
        service: "auth",
        data: user,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.chatDirectConversationUsers,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.getUsers,
      });
    },
    onError: (error:ErrorMessageResponse) => {
      ErrorToast({
        message: error?.message || "Failed to Update user",
      });
    },
  });
  const deleteUser = useMutation({
    mutationKey: queryKeys.deleteUser,
    mutationFn: (id: string) =>
      makeApiRequest({
        url: apiEndpoints.DELETE_USER,
        method: "DELETE",
        service: "auth",
        data: {
          user_id: id,
        },
      }),
    onSuccess: async (response: unknown) => {
      const successResponse = response as ApiSuccessResponse;
      SuccessToast({
        message: successResponse?.message || "User deleted successfully",
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.chatDirectConversationUsers,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.getUsers,
      });
    },
    onError: (error: ErrorMessageResponse) => {
      ErrorToast({
        message: error?.message || "Failed to Delete user",
      });
    },
  });
  const uploadFile = useMutation({
    mutationKey: ["uploadFile"],
    mutationFn: (file_field: File) => {
      const formData = new FormData();
      formData.append("file_field", file_field);

      return makeApiRequest<FileUploadResponse>({
        url: apiEndpoints.FILE_UPLOAD,
        method: "POST",
        service: "communication",
        data: formData,
      });
    },
  });
  const resetPassword = useMutation({
    mutationKey: queryKeys.resetPassword,
    mutationFn: ({
      user_id,
      new_password,
    }: {
      user_id: string;
      new_password: string;
    }) =>
      makeApiRequest({
        url: apiEndpoints.RESET_PASSWORD,
        method: "PUT",
        service: "auth",
        data: {
          user_id,
          new_password,
        },
      }),
    onSuccess: async (response: unknown) => {
      const successResponse = response as ApiSuccessResponse;
      SuccessToast({
        message: successResponse?.message || "Password reset successfully",
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.getUsers,
      });
    },
    onError: (error: ErrorMessageResponse) => {
      ErrorToast({
        message: error?.message || "Failed to Reset password",
      });
    },
  });
  return {
    getUsers,
    usersQuery,
    addUser,
    deleteUser,
    updateUser,
    uploadFile,
    resetPassword,
  };
}
