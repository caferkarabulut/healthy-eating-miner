export type RegisterFieldErrors = { email?: string; password?: string };
const codes: Record<string, [keyof RegisterFieldErrors, string]> = {
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
export function registerFeedback(body: unknown) {
  const messages: Record<keyof RegisterFieldErrors, Set<string>> = { email: new Set(), password: new Set() };
  const errors = body && typeof body === "object" ? (body as { errors?: unknown }).errors : null;
  let unknown = false;
  if (errors && typeof errors === "object" && !Array.isArray(errors)) {
    for (const code of Object.keys(errors)) {
      if (Object.hasOwn(codes, code)) { const [field, text] = codes[code]; messages[field].add(text); }
      else unknown = true;
    }
  } else unknown = true;
  const fieldErrors: RegisterFieldErrors = {};
  for (const field of ["email", "password"] as const) if (messages[field].size) fieldErrors[field] = [...messages[field]].join(" ");
  return { error: unknown || !Object.keys(fieldErrors).length ? "Kayıt oluşturulamadı. Bilgilerinizi kontrol edip yeniden deneyin." : "Belirtilen alanları kontrol edin.", fieldErrors };
}

export type RegisterState = { email: string; password: string; error: string; fieldErrors: RegisterFieldErrors; loading: boolean; success: boolean };
export const initialRegisterState: RegisterState = { email: "", password: "", error: "", fieldErrors: {}, loading: false, success: false };
type Action = { type: "change"; field: "email" | "password"; value: string } | { type: "submit" } | { type: "failure"; error: string; fieldErrors?: RegisterFieldErrors } | { type: "success" };
export function registerReducer(state: RegisterState, action: Action): RegisterState {
  switch (action.type) {
    case "change": return { ...state, [action.field]: action.value, error: "", fieldErrors: { ...state.fieldErrors, [action.field]: undefined } };
    case "submit": return { ...state, error: "", fieldErrors: {}, loading: true };
    case "failure": return { ...state, loading: false, error: action.error, fieldErrors: action.fieldErrors ?? {} };
    case "success": return { ...state, password: "", loading: false, error: "", fieldErrors: {}, success: true };
  }
}
