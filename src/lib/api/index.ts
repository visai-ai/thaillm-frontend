import apiKeys from "@/lib/api/apiKeys";
import user from "@/lib/api/user";
import aiChat from "./aiChat";
import appointment from "./appointments";
import arena from "./arena";
import auth from "./auth";
import chat from "./chat";
import medicalReminder from "./medicalReminder";
import pushNotification from "./pushNotification";

const api = {
  auth: auth,
  medicalReminder: medicalReminder,
  appointments: appointment,
  user: user,
  apiKeys: apiKeys,
  aiChat: aiChat,
  arena: arena,
  chat: chat,
  pushNotification: pushNotification,
};

export default api;
