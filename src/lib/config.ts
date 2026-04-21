export function getBasePath(): string {
  const env = process.env.NEXT_PUBLIC_APP_ENV;
  switch (env) {
    case "production":
      return "/medical";
    case "production-siriraj":
      return "/medical-siriraj";
    case "development":
      return "/dev-medical";
    case "development-siriraj":
      return "/dev-medical-siriraj";
    default:
      return "";
  }
}

/** Check if the base URL path contains "medical-siriraj" (e.g. base is /dev-medical-siriraj) */
export function hasMedicalSirirajInPath(): boolean {
  return getBasePath().includes("medical-siriraj");
}
