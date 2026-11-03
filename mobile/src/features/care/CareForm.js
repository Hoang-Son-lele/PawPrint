import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { api } from "../../services/api";
import { colors, fonts, radius } from "../../theme";
import { careKinds, today } from "../../utils/format";
import BottomSheet from "../../components/BottomSheet";
import Button from "../../components/Button";
import FormField from "../../components/FormField";
import DatePickerField from "../../components/DatePickerField";
import Pressy from "../../components/Pressy";
import Icon from "../../components/Icon";
import { ConfirmSheet } from "../../components/BottomSheet";
import { ErrorBanner } from "../auth/AuthLayout";
import { parseWeight } from "../pets/petForm";

const PROMPTS = {
  weight: "Bé nặng bao nhiêu hôm nay?",
  bath: "Bé đã được tắm thơm tho!",
  nails: "Cắt móng gọn gàng cho bé",
  vet: "Ghi lại buổi khám thú y",
  note: "Điều gì đáng nhớ về sức khỏe bé?",
};

/** Biểu mẫu bản ghi chăm sóc – thay đổi theo loại; cân nặng có đơn vị kg và kiểm tra giá trị. */
export default function CareForm({ visible, onClose, pet, record, initialType = "weight", onSaved, onDeleted }) {
  const editing = !!record;
  const [type, setType] = useState(initialType);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setErrors({});
    setBanner("");
    if (record) {
      setType(record.type);
      setWeight(record.valueDecimal != null ? String(record.valueDecimal) : "");
      setNote(record.note || "");
      setDate(String(record.occurredAt).slice(0, 10));
    } else {
      setType(initialType);
      setWeight("");
      setNote("");
      setDate(today());
    }
  }, [visible, record, initialType]);

  async function save() {
    if (busy) return;
    const e = {};
    let value = null;
    if (type === "weight") {
      const w = parseWeight(weight);
      if (w.error) e.weight = w.error;
      else if (w.value == null) e.weight = "Nhập cân nặng của bé, ví dụ 4.5";
      value = w.value;
    }
    if ((type === "note" || type === "vet") && !note.trim() && type === "note") e.note = "Hãy viết vài dòng ghi chú.";
    if (note.length > 1000) e.note = "Ghi chú tối đa 1000 ký tự.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setBanner("");
    try {
      const body = { type, note: note.trim(), occurredAt: date, ...(type === "weight" ? { valueDecimal: value } : {}) };
      const r = await api(editing ? `/care-records/${record.id}` : `/pets/${pet.id}/care-records`, { method: editing ? "PATCH" : "POST", body });
      onSaved?.(editing ? record.id : r.id, type);
    } catch (err) {
      setBanner(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function destroy() {
    setBusy(true);
    try {
      await api(`/care-records/${record.id}`, { method: "DELETE" });
      setConfirm(false);
      onDeleted?.(record.id);
    } catch (err) {
      setConfirm(false);
      setBanner(err.message);
    } finally {
      setBusy(false);
    }
  }

  const k = careKinds[type];
  return (
    <>
      <BottomSheet
        visible={visible && !confirm}
        onClose={() => !busy && onClose()}
        dismissible={!busy}
        title={editing ? "Sửa bản ghi" : `Ghi chăm sóc cho ${pet?.name || "bé"}`}
        subtitle={PROMPTS[type]}
        footer={
          <View style={{ flexDirection: "row", gap: 10 }}>
            {editing && <Button title="Xóa" icon="trash-outline" variant="danger" onPress={() => setConfirm(true)} disabled={busy} style={{ flex: 1 }} />}
            <Button title={editing ? "Lưu thay đổi" : "Lưu bản ghi"} icon="checkmark" onPress={save} loading={busy} loadingText="Đang lưu…" feedback="medium" style={{ flex: 2 }} />
          </View>
        }
      >
        <ErrorBanner message={banner} onRetry={banner ? save : null} />
        <Text style={styles.label}>Loại chăm sóc</Text>
        <View style={styles.kinds} accessibilityRole="radiogroup">
          {Object.entries(careKinds).map(([id, kind]) => {
            const active = id === type;
            return (
              <Pressy
                key={id}
                onPress={() => { setType(id); setErrors({}); }}
                feedback="tap"
                scaleTo={0.94}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={kind.label}
                style={[styles.kind, { backgroundColor: active ? kind.color : kind.soft }]}
              >
                <Icon name={`mc:${kind.icon}`} size={22} color={active ? colors.white : kind.color} />
                <Text style={[styles.kindText, { color: active ? colors.white : colors.ink }]}>{kind.label}</Text>
              </Pressy>
            );
          })}
        </View>
        {type === "weight" && (
          <FormField label="Cân nặng" required icon={`mc:${k.icon}`} keyboardType="decimal-pad" suffix="kg" placeholder="Ví dụ: 4.5" value={weight} onChangeText={(v) => { setWeight(v); setErrors((x) => ({ ...x, weight: "" })); }} error={errors.weight} hint="Từ 0.01 đến 9999.99 kg" autoFocus={!editing} />
        )}
        <DatePickerField label="Ngày" value={date} onChange={(v) => setDate(v || today())} maxDate={today()} clearable={false} />
        <FormField
          label={type === "vet" ? "Kết quả / lời dặn của bác sĩ" : "Ghi chú"}
          required={type === "note"}
          multiline
          placeholder={type === "vet" ? "Ví dụ: Tiêm phòng dại, hẹn tái khám sau 1 tháng" : type === "bath" ? "Ví dụ: Dùng sữa tắm mới, bé rất hợp tác" : "Viết vài dòng…"}
          value={note}
          onChangeText={(v) => { setNote(v); setErrors((x) => ({ ...x, note: "" })); }}
          error={errors.note}
          maxLength={1000}
        />
      </BottomSheet>
      <ConfirmSheet
        visible={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={destroy}
        loading={busy}
        destructive
        title="Xóa bản ghi chăm sóc?"
        message="Bản ghi sẽ bị xóa vĩnh viễn khỏi nhật ký và biểu đồ của bé."
        confirmLabel="Xóa bản ghi"
        cancelLabel="Giữ lại"
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, marginBottom: 8 },
  kinds: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  kind: { flexBasis: "30%", flexGrow: 1, minHeight: 70, borderRadius: radius.md, alignItems: "center", justifyContent: "center", gap: 4, padding: 8 },
  kindText: { fontFamily: fonts.heavy, fontSize: 12.5 },
});

