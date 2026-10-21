export type FieldErrors = { email?: string; password?: string };
const codes: Record<string, [keyof FieldErrors, string]> = {
  InvalidEmail: ["email", "Geçerli bir e-posta adresi girin."],
  InvalidUserName: ["email", "E-posta adresini kontrol edin."],
  DuplicateEmail: ["email", "Bu e-posta ile kayıt oluşturulamadı. Hesabınız varsa giriş yapın."],
  DuplicateUserName: ["email", "Bu e-posta ile kayıt oluşturulamadı. Hesabınız varsa giriş yapın."],
  PasswordTooShort: ["password", "Şifre en az 8 karakter olmalı."],
  PasswordRequiresDigit: ["password", "Şifre en az bir rakam içermeli."],
  PasswordRequiresLower: ["password", "Şifre en az bir küçük harf içermeli."],
  PasswordRequiresUpper: ["password", "Şifre en az bir büyük harf içermeli."],
  PasswordRequiresNonAlphanumeric: ["password", "Şifre en az bir harf veya rakam dışı karakter içermeli."],
};
export function registrationErrors(body: unknown): FieldErrors {
  const errors = body && typeof body === "object" ? (body as { errors?: unknown }).errors : null;
  const result: FieldErrors = {};
  if (errors && typeof errors === "object") for (const code of Object.keys(errors)) {
    if (Object.hasOwn(codes, code)) { const [field, message] = codes[code]; result[field] = result[field] ? `${result[field]} ${message}` : message; }
  }
  return result;
}
