"use client";

import { useState } from "react";

import { mapErrorCodeToMessage } from "@/constant/errorCode";
import useAuth from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/useAuthStore";

import ErrorModal from "@/components/common/ErrorModal";
import LoginForm from "@/components/sections/auth/LoginForm";
import { getBasePath } from "@/lib/config";
import { useLoadingStore } from "@/stores/useLoadingStore";

const LoginPage = () => {
  const { login } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useLoadingStore((state) => state.setLoading);
  const [openErrorModal, setOpenErrorModal] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorDescription, setErrorDescription] = useState("");

  const handleLoginSubmit = async (email: string, password: string) => {
    try {
      setLoading(true);
      const resp = await login(email, password);
      if (resp.ok) {
        setUser(resp.data.user);
        const basePath = getBasePath();
        if (resp.data.user.emailVerified) {
          const redirectTo = "/";
          window.location.href = basePath + redirectTo;
        } else {
          const redirectTo = "/auth/verify-email?email=" + resp.data.user.email;
          window.location.href = basePath + redirectTo;
        }
      } else {
        const err = mapErrorCodeToMessage(resp.data.code);
        setErrorTitle(err.title);
        setErrorDescription(err.description);
        setOpenErrorModal(true);
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <LoginForm
        className="w-full max-w-md mx-auto"
        onLoginSubmit={(email: string, password: string) =>
          handleLoginSubmit(email, password)
        }
      />
      <ErrorModal
        open={openErrorModal}
        title={errorTitle}
        description={errorDescription}
        onClose={() => setOpenErrorModal(false)}
      />
    </>
  );
};

export default LoginPage;
