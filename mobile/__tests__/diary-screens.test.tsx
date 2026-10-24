import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { useSession } from "../src/auth/context";
import type { SessionClient } from "../src/auth/session";
import AddDiaryForm from "../src/components/AddDiaryForm";
import DiaryScreen from "../src/components/DiaryScreen";
import { day, entry } from "./diary-fixtures";
import { egg, response } from "./fixtures";
jest.mock("../src/auth/context", () => ({ useSession: jest.fn() }));
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
jest.mock("expo-router", () => ({ ...jest.requireActual("expo-router"), useFocusEffect: jest.fn(), router: { push: jest.fn() } }));
const session = useSession as jest.MockedFunction<typeof useSession>;
let send: jest.Mock;
function signedIn(userId = "a") { session.mockReturnValue({ state: { status: "authenticated", profile: { userId, email: null } }, client: { authorizedJson: send, getSessionVersion: () => 1 } as unknown as SessionClient }); }
beforeEach(() => {
  send = jest.fn().mockResolvedValue(day); signedIn(); jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue(response({ mealId: 1, items: [{ id: 7, mealId: 1, measureName: "Orta adet", amount: 1, gramWeight: 44, sourceFoodId: "171287", sourceId: "88378", sourceDescription: "medium", gramsPerUnit: 44, approximate: true, source: "USDA", sourceUrl: "https://fdc.nal.usda.gov" }] }));
});
test("anonymous diary/addition require login while detail can remain public", async () => {
  session.mockReturnValue({ state: { status: "anonymous" }, client: {} as SessionClient });
  await render(<DiaryScreen />); expect(screen.getByText("Günlüğünüzü görmek için giriş yapın.")).toBeTruthy(); expect(send).not.toHaveBeenCalled();
});
test("gram and fractional portion forms send only API inputs; pending duplicate taps are blocked", async () => {
  let resolve!: (v: unknown) => void; send.mockImplementation(() => new Promise(r => { resolve = r; }));
  await render(<AddDiaryForm meal={egg} apiUrl="http://localhost" />);
  await screen.findByText("Orta adet");
  await fireEvent.changeText(screen.getByLabelText("Gram"), "150,25");
  await fireEvent.changeText(screen.getByLabelText("Gün"), "2026-10-22");
  await fireEvent.press(screen.getByRole("button", { name: "Öğle" }));
  await fireEvent.press(screen.getByRole("button", { name: "Günlüğe ekle" }));
  await fireEvent.press(screen.getByRole("button", { name: "Ekleniyor..." }));
  expect(send).toHaveBeenCalledTimes(1);
  expect(JSON.parse(send.mock.calls[0][1].body)).toEqual({ mealId: 1, grams: 150.25, date: "2026-10-22", mealSlot: "lunch" });
  await act(async () => resolve(entry)); await screen.findByText("Kayıt eklendi.");
  expect(router.push).toHaveBeenCalledWith({ pathname: "/diary", params: { date: "2026-10-22" } });
  await fireEvent.press(screen.getByText("Kontrol ettim, yeni kayıt hazırla"));
  await fireEvent.press(screen.getByText("Orta adet"));
  await fireEvent.changeText(screen.getByLabelText("Miktar"), "1,5"); send.mockResolvedValueOnce(entry);
  await fireEvent.press(screen.getByRole("button", { name: "Günlüğe ekle" })); await screen.findByText("Kayıt eklendi.");
  expect(JSON.parse(send.mock.calls[1][1].body)).toEqual({ mealId: 1, portionId: 7, quantity: 1.5, date: "2026-10-22", mealSlot: "lunch" });
});
test("uncertain POST offers diary inspection and cannot be resubmitted by tapping", async () => {
  send.mockRejectedValue(new Error("connection lost"));
  await render(<AddDiaryForm meal={egg} apiUrl="http://localhost" />);
  await fireEvent.press(screen.getByRole("button", { name: "Günlüğe ekle" }));
  await screen.findByText(/Kayıt eklenmiş olabilir/);
  expect(screen.getByText("Göndermeden önce günlüğü kontrol et")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Günlüğe ekle" })); expect(send).toHaveBeenCalledTimes(1);
});
test("unavailable portions keep gram usable, invalid grams do not send", async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error("offline"));
  await render(<AddDiaryForm meal={egg} apiUrl="http://localhost" />);
  await screen.findByText("Ölçüler alınamadı; gramla devam edebilirsiniz.");
  await fireEvent.changeText(screen.getByLabelText("Gram"), "1,005");
  await fireEvent.press(screen.getByRole("button", { name: "Günlüğe ekle" }));
  expect(send).not.toHaveBeenCalled();
});
test("server daily and meal totals preserve missing versus zero and original group order", async () => {
  await render(<DiaryScreen initialDate={day.date} />); await screen.findByText("Yumurta (çiğ)");
  expect(screen.getByText("Kahvaltı")).toBeTruthy(); expect(screen.getAllByText(/94,4 kcal/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Yağ: Eksik veri/).length).toBe(2); expect(screen.getByText(/1,5 Orta adet ≈ 66 g/)).toBeTruthy();
  expect(screen.getAllByText(/Karbonhidrat: 0 g/).length).toBeGreaterThan(0);
});
test("late old-date response cannot replace selected date; empty/error can be retried", async () => {
  let resolve!: (v: unknown) => void;
  send.mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValueOnce({ ...day, date: "2026-10-23", items: [], summary: { entryCount: 0, caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 } });
  await render(<DiaryScreen initialDate={day.date} />);
  await fireEvent.changeText(screen.getByLabelText("Gün"), "2026-10-23"); await screen.findByText("Bu güne ait kayıt yok.");
  await act(async () => resolve(day)); expect(screen.queryByText("Yumurta (çiğ)")).toBeNull();
  send.mockRejectedValueOnce(new Error("Bağlantı hatası")); await fireEvent.press(screen.getByText("Günlüğü yenile")); await screen.findByText("Bağlantı hatası");
  send.mockResolvedValueOnce({ ...day, date: "2026-10-23", items: [] }); await fireEvent.press(screen.getByText("Tekrar dene")); await screen.findByText("Bu güne ait kayıt yok.");
});
test("account change immediately discards previous data and a late response cannot return it", async () => {
  const view = await render(<DiaryScreen initialDate={day.date} />); await screen.findByText("Yumurta (çiğ)");
  let resolve!: (v: unknown) => void; send.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  await fireEvent.press(screen.getByText("Günlüğü yenile"));
  signedIn("b"); send.mockResolvedValueOnce({ ...day, items: [] }); await view.rerender(<DiaryScreen initialDate={day.date} />);
  await screen.findByText("Bu güne ait kayıt yok."); await act(async () => resolve(day)); expect(screen.queryByText("Yumurta (çiğ)")).toBeNull();
});

test("leaving the add form before a late POST completes cannot navigate back into it", async () => {
  let resolve!: (value: unknown) => void; send.mockImplementation(() => new Promise(r => { resolve = r; }));
  const view = await render(<AddDiaryForm meal={egg} apiUrl="http://localhost" />);
  await fireEvent.press(screen.getByRole("button", { name: "Günlüğe ekle" }));
  await view.unmount(); await act(async () => resolve(entry));
  expect(router.push).not.toHaveBeenCalled();
});
