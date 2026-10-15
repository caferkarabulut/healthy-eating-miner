import { MEAL_SLOTS, type MealSlot } from "@/lib/diary";

export default function MealSlotSelect({ id, value, disabled, onChange }: {
  id: string; value: MealSlot; disabled: boolean; onChange: (value: MealSlot) => void;
}) {
  return <div className="mt-4">
    <label htmlFor={id} className="block text-sm font-medium">Öğün</label>
    <select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as MealSlot)}
      className="mt-2 w-full rounded-lg border border-[#b8d6c2] bg-white px-3 py-2">
      {MEAL_SLOTS.map((slot) => <option key={slot.value} value={slot.value}>{slot.label}</option>)}
    </select>
  </div>;
}
