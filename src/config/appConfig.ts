const appConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001",
  appBaseUrl: process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3000",
};

export default appConfig;
