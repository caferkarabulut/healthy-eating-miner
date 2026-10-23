import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert, type AlertButton } from "react-native";
import { useSession } from "../src/auth/context";
import { AuthError, type SessionClient } from "../src/auth/session";
import DiaryScreen from "../src/components/DiaryScreen";
import { day, entry } from "./diary-fixtures";
import { response } from "./fixtures";
jest.mock("../src/auth/context", () => ({ useSession: jest.fn() }));
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
jest.mock("expo-router", () => ({ ...jest.requireActual("expo-router"), useFocusEffect: jest.fn() }));
const session = useSession as jest.MockedFunction<typeof useSession>;
const medium = { id: 7, mealId: 1, amount: 1, gramWeight: 44, gramsPerUnit: 44, approximate: true, ...entry.portion, quantity: undefined };
let send: jest.Mock, alert: jest.SpyInstance;
const edit = () => fireEvent.press(screen.getByRole("button", { name: /66 g kaydını düzenle/ }));
const remove = () => fireEvent.press(screen.getByRole("button", { name: /66 g kaydını sil/ }));
const save = () => fireEvent.press(screen.getByRole("button", { name: "Değişiklikleri kaydet" }));
const buttons = () => alert.mock.calls.at(-1)![2] as AlertButton[];
function signedIn(userId = "a") { session.mockReturnValue({ state: { status: "authenticated", profile: { userId, email: null } }, client: { authorizedJson: send, getSessionVersion: () => 1 } as unknown as SessionClient }); }
function empty() { return { ...day, items: [], summary: { entryCount: 0, caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 } }; }
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "http://localhost";
  send = jest.fn().mockResolvedValue(day); signedIn();
  global.fetch = jest.fn().mockResolvedValue(response({ mealId: 1, items: [medium] }));
  alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});
afterEach(() => { alert.mockRestore(); });
test("saved snapshot opens correctly; changing only date/slot omits amount even if source was removed", async () => {
  global.fetch = jest.fn().mockResolvedValue(response({ mealId: 1, items: [] }));
  await render(<DiaryScreen initialDate={entry.date} />); await screen.findByText("Yumurta (çiğ)"); await edit();
  expect(screen.getByLabelText("Düzenleme miktar").props.value).toBe("1,5");
  await screen.findByText(/Kayıtlı ölçü değişmiş veya kaldırılmış/);
  await fireEvent.changeText(screen.getByLabelText("Kayıt günü"), "2026-10-23");
  await fireEvent.press(screen.getByRole("button", { name: "Akşam" }));
  send.mockResolvedValueOnce({ ...entry, date: "2026-10-23", mealSlot: "dinner" }).mockResolvedValueOnce(empty());
  await save(); await screen.findByText("Bu güne ait kayıt yok.");
  expect(JSON.parse(send.mock.calls.find(([, init]) => init?.method === "PATCH")![1].body)).toEqual({ date: "2026-10-23", mealSlot: "dinner" });
  expect(screen.getByText(/Kayıt 2026-10-23 gününe taşındı/)).toBeTruthy(); expect(screen.getByText("0 kayıt · 0 kcal")).toBeTruthy();
});
test("fractional saved portion edits refresh daily/meal totals and duplicate saves cannot send twice", async () => {
  await render(<DiaryScreen initialDate={entry.date} />); await screen.findByText("Yumurta (çiğ)"); await edit(); await screen.findByText("Güncel: Orta adet");
  await fireEvent.changeText(screen.getByLabelText("Düzenleme miktar"), "2,5");
  let resolve!: (value: unknown) => void; send.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  await save(); await save(); expect(send.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(1);
  const updated = { ...entry, grams: 110, portion: { ...entry.portion!, quantity: 2.5 }, nutrition: { ...entry.nutrition, caloriesKcal: 157.3 } };
  const summary = { entryCount: 1, ...updated.nutrition };
  send.mockResolvedValueOnce({ ...day, items: [updated], summary, mealSummaries: day.mealSummaries.map(m => m.mealSlot === "breakfast" ? { ...m, summary } : m) });
  await act(async () => resolve(updated)); await screen.findByText(/2,5 Orta adet ≈ 110 g/); expect(screen.getAllByText("1 kayıt · 157,3 kcal")).toHaveLength(2);
});
test("explicit gram switch sends grams, while changed saved source blocks quantity edits", async () => {
  global.fetch = jest.fn().mockResolvedValue(response({ mealId: 1, items: [{ ...medium, gramWeight: 50, gramsPerUnit: 50 }] }));
  await render(<DiaryScreen initialDate={entry.date} />); await screen.findByText("Yumurta (çiğ)"); await edit(); await screen.findByText(/Kayıtlı ölçü değişmiş veya kaldırılmış/);
  await fireEvent.changeText(screen.getByLabelText("Düzenleme miktar"), "2"); await save(); await screen.findByText(/Kayıtlı ölçü güncel kaynakla eşleşmiyor/);
  expect(send.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(false);
  await fireEvent.press(screen.getByRole("button", { name: "Gram" })); await fireEvent.changeText(screen.getByLabelText("Düzenleme gram"), "150,25");
  send.mockResolvedValueOnce({ ...entry, grams: 150.25, portion: null }).mockResolvedValueOnce(day); await save();
  await screen.findByText("Kayıt güncellendi."); expect(JSON.parse(send.mock.calls.find(([, init]) => init?.method === "PATCH")![1].body).grams).toBe(150.25);
});
test("delete confirmation cancels without request, confirms once and refreshes totals", async () => {
  await render(<DiaryScreen initialDate={entry.date} />); await screen.findByText("Yumurta (çiğ)"); await remove();
  await act(async () => { buttons()[0].onPress!(); }); expect(send.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
  await remove(); let resolve!: (v: unknown) => void; send.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const confirm = buttons()[1].onPress!; await act(async () => { confirm(); confirm(); });
  const onDismiss = alert.mock.calls.at(-1)![3].onDismiss; await act(async () => onDismiss());
  expect(send.mock.calls.filter(([, init]) => init?.method === "DELETE")).toHaveLength(1);
  expect(screen.getByRole("button", { name: /66 g kaydını sil/ }).props.accessibilityState.disabled).toBe(true);
  send.mockResolvedValueOnce(empty()); await act(async () => resolve(null)); await screen.findByText("Kayıt silindi."); await screen.findByText("Bu güne ait kayıt yok."); expect(screen.getByText("0 kayıt · 0 kcal")).toBeTruthy();
});
test("ambiguous mutation locks further writes and offers explicit GET inspection; missing entry is clear", async () => {
  await render(<DiaryScreen initialDate={entry.date} />); await screen.findByText("Yumurta (çiğ)");
  send.mockRejectedValueOnce(new Error("offline")); await remove(); await act(async () => { buttons()[1].onPress!(); }); await screen.findByText(/İşlem tamamlanmış olabilir/);
  await remove(); expect(send.mock.calls.filter(([, init]) => init?.method === "DELETE")).toHaveLength(1);
  send.mockResolvedValueOnce(day); await fireEvent.press(screen.getByText("Sonucu kontrol etmek için günlüğü yenile")); await screen.findByText("Yumurta (çiğ)");
  const missing = new AuthError("raw", "response"); missing.status = 404; send.mockRejectedValueOnce(missing);
  await remove(); await act(async () => { buttons()[1].onPress!(); }); await screen.findByText(/Kayıt artık bulunamıyor/);
});
test("a delete confirmation from an old account cannot send after account change", async () => {
  const view = await render(<DiaryScreen initialDate={entry.date} />); await screen.findByText("Yumurta (çiğ)"); await remove(); const confirm = buttons()[1].onPress!;
  signedIn("b"); send.mockResolvedValueOnce(empty()); await view.rerender(<DiaryScreen initialDate={entry.date} />); await screen.findByText("Bu güne ait kayıt yok.");
  await act(async () => { confirm(); }); expect(send.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
});
test("late PATCH success from an old date cannot replace current-day rows or success notices", async () => {
  const view = await render(<DiaryScreen initialDate={entry.date} />); await screen.findByText("Yumurta (çiğ)"); await edit();
  let resolve!: (value: unknown) => void; send.mockImplementationOnce(() => new Promise(r => { resolve = r; })); await save();
  send.mockResolvedValueOnce({ ...empty(), date: "2026-10-23" }); await view.rerender(<DiaryScreen initialDate="2026-10-23" />); await screen.findByText("Bu güne ait kayıt yok.");
  await act(async () => resolve(entry)); expect(screen.queryByText("Kayıt güncellendi.")).toBeNull();
  await waitFor(() => expect(screen.getByLabelText("Gün").props.value).toBe("2026-10-23"));
});
