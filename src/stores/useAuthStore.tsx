import { create } from "zustand";

export type UserType = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Array<string>;
  createdAt?: string | null;
  updatedAt?: string | null;
  verifiedAt?: string | null;
  acceptTermOfUseAt?: string | null;
  personalInfo?: {
    age?: number;
    addressLine?: string;
    street?: string;
    subdistrict?: string;
    district?: string;
    province?: string;
    postalCode?: string;
    phone?: string;
  } | null;
  sirirajInfoSheetConsentAt?: string | null;
  sirirajConsentAt?: string | null;
  sirirajQuestionnaireSubmitted?: boolean;
};

interface AuthStore {
  user: UserType | null;
  setUser: (user: UserType | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
