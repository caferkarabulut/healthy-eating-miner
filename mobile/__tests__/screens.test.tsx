import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import CatalogScreen from "../src/components/CatalogScreen";
import MealScreen from "../src/components/MealScreen";
import { egg, page, response } from "./fixtures";
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
jest.mock("../src/auth/context", () => ({ useSession: () => ({ state: { status: "anonymous" } }) }));
const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
beforeEach(() => { fetchMock.mockReset(); global.fetch = fetchMock; });
test("loading, selecting detail, pagination, Turkish search reset and query retention", async () => {
  const select = jest.fn();
  fetchMock.mockImplementation(async url => {
    const pageNumber = Number(new URL(String(url)).searchParams.get("page"));
    return response(page([egg], pageNumber));
  });
  await render(<CatalogScreen apiUrl="http://localhost:5080" onSelect={select} />);
  await screen.findByText("Yumurta (çiğ)");
  await fireEvent.press(screen.getByRole("button", { name: "Yumurta (çiğ), detayları aç" })); expect(select).toHaveBeenCalledWith(1);
  await fireEvent.changeText(screen.getByLabelText("Gıda ara"), "yoğurt");
  await fireEvent.press(screen.getByRole("button", { name: "Ara" }));
  await screen.findByText("Sayfa 1 / 3");
  await fireEvent.press(screen.getByRole("button", { name: "Sonraki" })); await screen.findByText("Sayfa 2 / 3");
  expect(String(fetchMock.mock.calls.at(-1)![0])).toContain("page=2&pageSize=10&search=yo%C4%9Furt");
  await fireEvent.changeText(screen.getByLabelText("Gıda ara"), "çiğ");
  await fireEvent.press(screen.getByRole("button", { name: "Ara" })); await screen.findByText("Sayfa 1 / 3");
  expect(String(fetchMock.mock.calls.at(-1)![0])).toContain("page=1&pageSize=10&search=%C3%A7i%C4%9F");
});
test("connection failure can be retried manually and empty search results are explicit", async () => {
  fetchMock.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(response(page([], 1, 0)));
  await render(<CatalogScreen apiUrl="http://localhost" onSelect={() => {}} />);
  await screen.findByText(/Kataloğa bağlanılamadı/); expect(fetchMock).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole("button", { name: "Tekrar dene" }));
  await screen.findByText("Bu sayfada gıda bulunamadı.");
  fetchMock.mockResolvedValue(response(page([], 1, 0)));
  await fireEvent.changeText(screen.getByLabelText("Gıda ara"), "bulunmayan");
  await fireEvent.press(screen.getByRole("button", { name: "Ara" }));
  await screen.findByText("Aramanızla eşleşen gıda bulunamadı. Farklı bir sözcük deneyin.");
});
test("an older response cannot replace the latest search after cancellation", async () => {
  let resolve!: (value: Response) => void;
  fetchMock.mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValueOnce(response(page([], 1, 0)));
  await render(<CatalogScreen apiUrl="http://localhost" onSelect={() => {}} />);
  expect(screen.getByRole("progressbar")).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText("Gıda ara"), "bulunmayan");
  await fireEvent.press(screen.getByRole("button", { name: "Ara" }));
  await screen.findByText(/Aramanızla eşleşen/);
  await act(async () => resolve(response(page())));
  expect(screen.queryByText("Yumurta (çiğ)")).toBeNull();
  expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
});
test("detail displays exact 100 g data, missing versus zero and supports retry", async () => {
  fetchMock.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(response(egg));
  await render(<MealScreen apiUrl="http://localhost" mealId="1" />);
  await screen.findByText(/Kataloğa bağlanılamadı/);
  await fireEvent.press(screen.getByRole("button", { name: "Tekrar dene" }));
  await screen.findByText("Yumurta (çiğ)");
  expect(screen.getByText("100 g yenilebilir kısım için yaklaşık değerler.")).toBeTruthy();
  expect(screen.getByText("12,56 g")).toBeTruthy(); expect(screen.getByText("0 g")).toBeTruthy(); expect(screen.getByText("Veri yok")).toBeTruthy();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
});
