import { act, renderHook } from '@testing-library/react-native';
import { useDiaryDate } from '../src/hooks/useDiaryDate';
test('default Istanbul day follows midnight while a manually selected day is preserved', async () => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-12-31T20:59:50Z'));
  try {
    const { result, unmount } = await renderHook(() => useDiaryDate());
    expect(result.current.date).toBe('2026-12-31');
    await act(async () => { jest.advanceTimersByTime(30000); });
    expect(result.current.date).toBe('2027-01-01');
    await act(async () => { result.current.setDate('2026-10-22'); });
    await act(async () => { jest.advanceTimersByTime(86400000); });
    expect(result.current.date).toBe('2026-10-22');
    await act(async () => { result.current.today(); });
    expect(result.current.date).toBe('2027-01-02');
    await unmount();
  } finally { jest.useRealTimers(); }
});
