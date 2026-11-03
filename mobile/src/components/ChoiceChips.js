import React from "react";
import { FilterChipRow } from "./FilterChip";

/** Tương thích ngược: ChoiceChips cũ dùng FilterChip mới (xuống dòng). */
export default function ChoiceChips({ options, value, onChange, disabled }) {
  return <FilterChipRow options={options} value={value} onChange={onChange} disabled={disabled} wrap style={{ marginVertical: 10 }} />;
}
