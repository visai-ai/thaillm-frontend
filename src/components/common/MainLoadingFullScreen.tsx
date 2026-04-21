"use client";

import { useLoadingStore } from "@/stores/useLoadingStore";
import { LoadingFullScreen } from "./Loading";

const MainLoadingFullScreen = () => {
  const loading = useLoadingStore((state) => state.loading);
  return loading ? <LoadingFullScreen /> : null;
};

export default MainLoadingFullScreen;
