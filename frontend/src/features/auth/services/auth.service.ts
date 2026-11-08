import apiClient from "@/lib/axios";
import type {
  AuthResponse,
  LoginPayload,
  User,
  ResetPasswordPayload,
} from "../types/auth.types";

export const loginUser = async (
  payload: LoginPayload,
): Promise<AuthResponse> => {
  const res = await apiClient.post<{ success: boolean; data: AuthResponse }>(
    "/auth/login",
    {
      email: payload.email,
      password: payload.password,
    }
  );

  const authData = res.data.data;
  if (authData.accessToken) {
    localStorage.setItem("accessToken", authData.accessToken);
    localStorage.setItem("refreshToken", authData.refreshToken);
  }

  return authData;
};

export const changeUserPassword = async (password: string): Promise<void> => {
  await apiClient.post("/auth/change-password", { password });
};

export const fetchCurrentUser = async (): Promise<User> => {
  const res = await apiClient.get<{ success: boolean; data: User }>("/profile/me");
  return res.data.data;
};

export const requestPasswordResetOtp = async (
  email: string
): Promise<{ success: boolean; message: string }> => {
  const res = await apiClient.post<{ success: boolean; message: string }>("/auth/forgot-password", { email });
  return res.data;
};

export const resetPasswordWithOtp = async (
  payload: ResetPasswordPayload
): Promise<{ success: boolean; message: string }> => {
  const res = await apiClient.post<{ success: boolean; message: string }>("/auth/reset-password", payload);
  return res.data;
};

