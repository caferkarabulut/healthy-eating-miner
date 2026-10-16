"use client";
import { useEffect, useState } from "react";
import { amountLabel, amountValue, snapshotPortion, type FoodPortion, type PortionSnapshot } from "@/lib/food-amount";

export function useFoodAmount(mealId: number, initialGrams = 100, snapshot?: PortionSnapshot | null) {
  const [unit, setUnit] = useState(snapshot ? String(snapshot.portionId) : "grams");
  const [input, setInput] = useState(String(snapshot?.quantity ?? initialGrams).replace(".", ","));
  const [dirty, setDirty] = useState(false);
  const [portions, setPortions] = useState<FoodPortion[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/meals/${mealId}/portions`, { cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(body => {
        if (!Array.isArray(body.items) || body.items.some((p: FoodPortion) => p.mealId !== mealId || !Number.isSafeInteger(p.id) || p.amount <= 0 || p.gramWeight <= 0)) throw new Error();
        if (!controller.signal.aborted) { setPortions(body.items); setStatus("ready"); }
      }).catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [mealId]);
  const saved = snapshot && snapshotPortion(snapshot, mealId);
  const options = saved && (!dirty || !portions.some(p => p.id === saved.id)) ? [saved, ...portions.filter(p => p.id !== saved.id)] : portions;
  const measures = !dirty && saved ? [saved, ...portions.filter(p => p.id !== saved.id)] : portions;
  const value = !dirty && snapshot ? { grams: initialGrams, payload: { portionId: snapshot.portionId, quantity: snapshot.quantity } } : amountValue(unit, input, measures);
  function reset() { setUnit(snapshot ? String(snapshot.portionId) : "grams"); setInput(String(snapshot?.quantity ?? initialGrams).replace(".", ",")); setDirty(false); }
  return { unit, input, dirty, status, options, value, reset,
    select: (value: string) => { setDirty(true); setUnit(value); setInput(value === "grams" ? String(initialGrams).replace(".", ",") : "1"); },
    change: (value: string) => { setDirty(true); setInput(value); } };
}
export default function FoodAmountInput({ id, amount, disabled }: { id: string; amount: ReturnType<typeof useFoodAmount>; disabled: boolean }) {
  const selected = amount.options.find(p => String(p.id) === amount.unit);
  return <div className="mt-4 min-w-0">
    <label htmlFor={`${id}-unit`} className="block text-sm font-medium">Ölçü</label>
    <select id={`${id}-unit`} value={amount.unit} disabled={disabled} onChange={e => amount.select(e.target.value)} className="mt-2 w-full min-w-0 rounded-lg border border-[#b8d6c2] bg-white px-3 py-2 text-sm">
      <option value="grams">Gram (g)</option>
      {amount.options.map(p => <option key={p.id} value={p.id}>{p.measureName}</option>)}
    </select>
    <label htmlFor={`${id}-quantity`} className="mt-3 block text-sm font-medium">{amount.unit === "grams" ? "Gramaj (g)" : "Miktar"}</label>
    <input id={`${id}-quantity`} type="text" inputMode="decimal" autoComplete="off" value={amount.input} disabled={disabled} onChange={e => amount.change(e.target.value)} aria-invalid={!amount.value} className="mt-2 w-full rounded-lg border border-[#b8d6c2] bg-white px-3 py-2" />
    <p className="mt-2 text-xs text-[#5b7166]">Virgül ve kesirli miktar kullanabilirsiniz. Gram karşılığı 0,01–10.000 g; gram girişinde en fazla iki ondalık.</p>
    {amount.status === "loading" && <p role="status" className="mt-2 text-xs">Ölçüler yükleniyor; gramla devam edebilirsiniz.</p>}
    {amount.status === "error" && <p role="status" className="mt-2 text-xs">Ölçüler yüklenemedi; gramla devam edebilirsiniz. Kayıtlı miktar değiştirilmezse korunur.</p>}
    {amount.status === "ready" && !amount.options.length && <p className="mt-2 text-xs">Bu gıda için doğrulanmış ölçü yok; gram kullanın.</p>}
    {amount.value && selected && <p className="mt-2 break-words text-sm">{amountLabel(amount.value.grams, { ...selected, portionId: selected.id, quantity: Number(amount.input.replace(",", ".")), sourceAmount: selected.amount, sourceGramWeight: selected.gramWeight })}</p>}
    {!amount.value && <p role="alert" className="mt-2 text-sm text-[#a33c35]">Geçerli miktar ve ölçü seçin.</p>}
  </div>;
}
