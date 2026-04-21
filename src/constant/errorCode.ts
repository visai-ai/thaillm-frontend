export const errorCode = {
  USER_ALREADY_EXISTS: "USER_ALREADY_EXISTS",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
};

interface ErrorMessage {
  title: string;
  description: string;
}
export const mapErrorCodeToMessage = (code: string): ErrorMessage => {
  switch (code) {
    case errorCode.USER_ALREADY_EXISTS:
      return {
        title: "เกิดข้อผิดพลาด",
        description: "ผู้ใช้งานนี้มีอยู่ในระบบแล้ว",
      };
    case errorCode.INVALID_CREDENTIALS:
      return {
        title: "เกิดข้อผิดพลาด",
        description: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      };
    default:
      return {
        title: "เกิดข้อผิดพลาด",
        description: "กรุณาลองใหม่อีกครั้ง",
      };
  }
};
