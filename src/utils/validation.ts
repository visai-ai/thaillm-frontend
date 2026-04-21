export const passwordValidationRules = [
  {
    label: "ต้องมีตัวอักษร พิมพ์เล็กอย่างน้อย 1 ตัว",
    test: (password: string) => /[a-z]/.test(password),
    // regex: /[a-z]/,
  },
  {
    label: "ต้องมีตัวอักษร พิมพ์ใหญ่อย่างน้อย 1 ตัว",
    test: (password: string) => /[A-Z]/.test(password),
    // regex: /[A-Z]/,
  },
  {
    label: "ต้องมี ตัวเลขอย่างน้อย 1 ตัว",
    test: (password: string) => /\d/.test(password),
    // regex: /\d/,
  },
  {
    label: "ต้องมีความยาว อย่างน้อย 8 ตัวอักษร",
    test: (password: string) => password.length >= 8,
  },
];

export const isPasswordValid = (val: string) =>
  passwordValidationRules.every((rule) => rule.test(val));
