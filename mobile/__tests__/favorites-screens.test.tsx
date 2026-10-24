import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { FavoritesProvider } from '../src/favorites/context';
import FavoritesScreen from '../src/components/FavoritesScreen';
import FavoriteButton from '../src/components/FavoriteButton';
import { egg } from './fixtures';
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../src/auth/context', () => ({ useSession: () => mockSession }));
let version = 1;
const send = jest.fn();
let mockSession: { client: { authorizedJson: typeof send; getSessionVersion: () => number }; state: { status: string; profile?: { userId: string } } };
const list = (items: unknown[] = []) => ({ items, page: 1, pageSize: 100, totalCount: items.length });
beforeEach(() => { send.mockReset(); version = 1; mockSession = { client: { authorizedJson: send, getSessionVersion: () => version }, state: { status: 'authenticated', profile: { userId: 'A' } } }; });
const tree = (select = jest.fn()) => <FavoritesProvider><FavoritesScreen onSelect={select} /></FavoritesProvider>;
test('anonymous access asks for login without sending a personal request', async () => {
  mockSession.state = { status: 'anonymous' }; await render(tree());
  expect(screen.getByText('Favorilerinizi görmek için giriş yapın.')).toBeTruthy(); expect(send).not.toHaveBeenCalled();
});
test('loading/empty, add/remove labels, and favorite-to-diary detail navigation', async () => {
  let saved = false; const select = jest.fn();
  send.mockImplementation(async (_path, init) => { if (init?.method) { saved = init.method === 'PUT'; return null; } return list(saved ? [egg] : []); });
  await render(<FavoritesProvider><FavoriteButton mealId={1} /><FavoritesScreen onSelect={select} /></FavoritesProvider>);
  await screen.findByText(/Henüz favori gıdanız yok/);
  await fireEvent.press(screen.getByRole('button', { name: 'Favoriye ekle' })); await screen.findByText('Yumurta (çiğ)');
  await fireEvent.press(screen.getByRole('button', { name: 'Miktar seç ve günlüğe ekle' })); expect(select).toHaveBeenCalledWith(1);
  await fireEvent.press(screen.getAllByRole('button', { name: 'Favoriden çıkar' })[0]);
  await screen.findByText(/Henüz favori gıdanız yok/);
});
test('a failed list has a visible manual retry', async () => {
  send.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(list([egg]));
  await render(tree()); await screen.findByText(/Favoriler alınamadı/);
  await fireEvent.press(screen.getByRole('button', { name: 'Favorileri yenile' })); await screen.findByText('Yumurta (çiğ)');
});
test('account change clears old data immediately and ignores its late response', async () => {
  let finish!: (value: unknown) => void;
  send.mockImplementationOnce(() => new Promise(r => { finish = r; })).mockResolvedValueOnce(list());
  const rendered = await render(tree());
  expect(screen.getByRole('progressbar')).toBeTruthy();
  version = 2; mockSession.state = { status: 'authenticated', profile: { userId: 'B' } };
  await rendered.rerender(tree()); await screen.findByText(/Henüz favori gıdanız yok/);
  await act(async () => finish(list([egg]))); expect(screen.queryByText('Yumurta (çiğ)')).toBeNull();
  mockSession.state = { status: 'anonymous' }; version++;
  await rendered.rerender(tree()); expect(screen.queryByText('Henüz favori gıdanız yok. Katalogdan favori ekleyebilirsiniz.')).toBeNull();
  await waitFor(() => expect(screen.getByText('Favorilerinizi görmek için giriş yapın.')).toBeTruthy());
});
