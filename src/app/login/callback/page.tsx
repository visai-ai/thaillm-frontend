"use client";

import { LoadingFullScreen } from "@/components/common/Loading";
import appConfig from "@/config/appConfig";
import useAuth from "@/hooks/use-auth";
import { PREFIX_TOKEN } from "@/lib/api/auth";
import { setAccessToken, setRefreshToken } from "@/lib/api/util";
import { authClient } from "@/lib/auth-client";
import { getBasePath } from "@/lib/config";
import CookieStorage from "@/lib/persistance/cookie";
import { useEffect } from "react";

const persistanceStorage = new CookieStorage();

function Page() {
  const { getMe } = useAuth();
  useEffect(() => {
    // get
    const perform = async () => {
      const session = await authClient.getSession();
      if (session.data?.session.token) {
        // save to perssitance
        setAccessToken(session.data.session.token);
        setRefreshToken(session.data.session.token);
        // fetch user and persist to cookie (needed for middleware role checks)
        const response = await getMe();
        if (response.ok) {
          await persistanceStorage.setItem(
            PREFIX_TOKEN + "user",
            response.data,
          );
        }
        // redirect to app
        window.location.href = getBasePath() + "/";
      } else {
        window.location.href = getBasePath() + "/auth/login";
      }
    };
    perform();
  }, []);
  return (
    <>
      <LoadingFullScreen />
      <div className="bg-white h-screen fixed"></div>
    </>
  );
}

export default Page;
