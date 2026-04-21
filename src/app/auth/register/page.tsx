"use client";

import ErrorModal from "@/components/common/ErrorModal";
import RegisterForm from "@/components/sections/auth/RegisterForm";
import { mapErrorCodeToMessage } from "@/constant/errorCode";
import useAuth, { VERIFY_EMAIL_URL } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const RegisterPage = () => {
  const { registerEmail, login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [openErrorModal, setOpenErrorModal] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const handleSubmitRegister = async (email: string, password: string) => {
    setIsLoading(true);
    const resp = await registerEmail(email, password);
    if (!resp.ok) {
      // handle error
      const err = mapErrorCodeToMessage(resp.data.code);
      setErrorTitle(err.title);
      setErrorMessage(err.description);
      setOpenErrorModal(true);
    }

    if (resp.ok) {
      const respLogin = await login(email, password);
      if (respLogin.ok)
        // redirect to login page after successful registration
        router.push(`${VERIFY_EMAIL_URL}?email=${email}`);
    }
    setIsLoading(false);
  };

  // clean up
  useEffect(() => {
    return () => {
      setIsLoading(false);
      setOpenErrorModal(false);
      setErrorTitle("");
      setErrorMessage("");
    };
  }, []);
  return (
    <>
      <RegisterForm
        className="w-full max-w-md mx-auto"
        isLoading={isLoading}
        onHandleSubmit={(data) => {
          handleSubmitRegister(data.email, data.password);
        }}
      />
      <ErrorModal
        open={openErrorModal}
        title={errorTitle}
        description={errorMessage}
        onClose={() => setOpenErrorModal(false)}
      />
    </>
  );
};

export default RegisterPage;
