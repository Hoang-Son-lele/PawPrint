import { parseDate, today } from "../../utils/format";

/** Chuẩn hóa & kiểm tra dữ liệu hồ sơ thú cưng (dùng chung cho Tạo mới và Cài đặt). */
export function parseWeight(text) {
  const t = String(text ?? "").trim().replace(",", ".");
  if (!t) return { value: null };
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return { error: "Cân nặng phải là số lớn hơn 0, ví dụ 4.5" };
  if (n > 9999.99) return { error: "Cân nặng tối đa 9999.99 kg." };
  return { value: Math.round(n * 100) / 100 };
}

export function validatePet(form, fields = ["name", "breed", "birthDate", "adoptedAt", "weight", "notes"]) {
  const e = {};
  const now = parseDate(today());
  if (fields.includes("name")) {
    if (!form.name.trim()) e.name = "Bé tên là gì nhỉ? Hãy nhập tên cho bé.";
    else if (form.name.trim().length > 100) e.name = "Tên tối đa 100 ký tự.";
  }
  if (fields.includes("breed") && form.breed.trim().length > 120) e.breed = "Giống tối đa 120 ký tự.";
  const birth = parseDate(form.birthDate);
  const adopted = parseDate(form.adoptedAt);
  if (fields.includes("birthDate") && birth && birth > now) e.birthDate = "Ngày sinh không thể ở tương lai.";
  if (fields.includes("adoptedAt")) {
    if (adopted && adopted > now) e.adoptedAt = "Ngày về nhà không thể ở tương lai.";
    else if (adopted && birth && adopted < birth) e.adoptedAt = "Ngày về nhà phải sau ngày sinh.";
  }
  if (fields.includes("weight")) {
    const w = parseWeight(form.weight);
    if (w.error) e.weight = w.error;
  }
  if (fields.includes("notes") && form.notes.length > 1000) e.notes = "Ghi chú tối đa 1000 ký tự.";
  return e;
}

export function toPayload(form) {
  return {
    name: form.name.trim(),
    species: form.species,
    breed: form.breed.trim() || null,
    sex: form.sex || null,
    birthDate: form.birthDate || null,
    adoptedAt: form.adoptedAt || null,
    weightKg: parseWeight(form.weight).value ?? null,
    notes: form.notes.trim() || null,
    avatarUrl: form.avatarUrl || null,
  };
}

export const emptyPetForm = { species: "", name: "", breed: "", sex: "", birthDate: "", adoptedAt: "", weight: "", notes: "", avatarUrl: null };

export function petToForm(pet) {
  return {
    species: pet.species || "other",
    name: pet.name || "",
    breed: pet.breed || "",
    sex: pet.sex || "",
    birthDate: pet.birthDate || "",
    adoptedAt: pet.adoptedAt || "",
    weight: pet.weightKg == null ? "" : String(pet.weightKg),
    notes: pet.notes || "",
    avatarUrl: pet.avatarUrl || null,
  };
}

