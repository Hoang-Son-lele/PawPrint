import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "../theme";
import { formatDate, parseDate, toISODate } from "../utils/format";
import BottomSheet from "./BottomSheet";
import Button, { IconButton } from "./Button";
import Pressy from "./Pressy";
import Icon from "./Icon";

const WEEK = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/**
 * Chọn ngày thân thiện: lịch tháng trong bottom sheet, chuyển tháng/năm nhanh,
 * chặn ngày tương lai khi `maxDate`. Giá trị dạng YYYY-MM-DD.
 */
export default function DatePickerField({
  label,
  value,
  onChange,
  required,
  error,
  hint,
  maxDate,
  minDate,
  clearable = true,
  placeholder = "Chọn ngày",
  changed,
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      {!!label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={{ color: colors.danger }}> *</Text>}
          </Text>
          {changed && (
            <View style={styles.changed}>
              <Text style={styles.changedText}>Đã sửa</Text>
            </View>
          )}
        </View>
      )}
      <Pressy
        onPress={() => setOpen(true)}
        feedback="tap"
        scaleTo={0.985}
        accessibilityLabel={`${label || "Ngày"}: ${value ? formatDate(value) : "chưa chọn"}`}
        accessibilityHint="Mở lịch để chọn ngày"
        style={[styles.box, error && { borderColor: colors.danger }]}
      >
        <Icon name="calendar-outline" size={20} color={value ? colors.primary : colors.muted} />
        <Text style={[styles.value, !value && { color: colors.muted }]}>{value ? formatDate(value, { weekday: true }) : placeholder}</Text>
        <Icon name="chevron-down" size={18} color={colors.inkSoft} />
      </Pressy>
      {error ? (
        <View style={styles.errorRow}>
          <Icon name="alert-circle" size={15} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
      <CalendarSheet
        visible={open}
        title={label || "Chọn ngày"}
        value={value}
        maxDate={maxDate}
        minDate={minDate}
        clearable={clearable && !required}
        onClose={() => setOpen(false)}
        onSelect={(v) => {
          onChange(v);
          setOpen(false);
        }}
      />
    </View>
  );
}

export function CalendarSheet({ visible, onClose, onSelect, value, maxDate, minDate, title, clearable }) {
  const max = parseDate(maxDate);
  const min = parseDate(minDate);
  const initial = parseDate(value) || max || new Date();
  const [cursor, setCursor] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [yearMode, setYearMode] = useState(false);
  const selectedKey = value ? toISODate(parseDate(value)) : "";
  const todayKey = toISODate(new Date());

  const days = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
    const total = new Date(y, m + 1, 0).getDate();
    const cells = Array.from({ length: firstDow }).map(() => null);
    for (let d = 1; d <= total; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [cursor]);

  const shift = (n) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  const disabledDay = (d) => (max && d > max) || (min && d < min);
  const nowYear = (max || new Date()).getFullYear();
  const years = Array.from({ length: 40 }).map((_, i) => nowYear - i);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} subtitle={value ? `Đang chọn: ${formatDate(value)}` : "Chạm vào một ngày"}>
      <View style={styles.monthRow}>
        <IconButton icon="chevron-back" label="Tháng trước" onPress={() => shift(-1)} variant="outline" />
        <Pressy onPress={() => setYearMode((v) => !v)} style={styles.monthBtn} accessibilityLabel="Chọn năm">
          <Text style={styles.month}>
            Tháng {cursor.getMonth() + 1}, {cursor.getFullYear()}
          </Text>
          <Icon name={yearMode ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
        </Pressy>
        <IconButton
          icon="chevron-forward"
          label="Tháng sau"
          onPress={() => shift(1)}
          variant="outline"
          disabled={!!max && new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) > max}
        />
      </View>
      {yearMode ? (
        <View style={styles.yearGrid}>
          {years.map((y) => (
            <Pressy
              key={y}
              onPress={() => {
                setCursor(new Date(y, Math.min(cursor.getMonth(), max && y === max.getFullYear() ? max.getMonth() : 11), 1));
                setYearMode(false);
              }}
              style={[styles.year, y === cursor.getFullYear() && styles.yearActive]}
              accessibilityLabel={`Năm ${y}`}
            >
              <Text style={[styles.yearText, y === cursor.getFullYear() && { color: colors.white }]}>{y}</Text>
            </Pressy>
          ))}
        </View>
      ) : (
        <>
          <View style={styles.weekRow}>
            {WEEK.map((w) => (
              <Text key={w} style={styles.week}>
                {w}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {days.map((d, i) => {
              if (!d) return <View key={i} style={styles.cell} />;
              const key = toISODate(d);
              const selected = key === selectedKey;
              const disabled = disabledDay(d);
              return (
                <Pressy
                  key={i}
                  disabled={disabled}
                  onPress={() => onSelect(key)}
                  feedback="tap"
                  scaleTo={0.88}
                  accessibilityLabel={formatDate(d, { weekday: true })}
                  accessibilityState={{ selected, disabled }}
                  style={styles.cell}
                >
                  <View style={[styles.day, key === todayKey && styles.today, selected && styles.selected]}>
                    <Text style={[styles.dayText, selected && { color: colors.white }, disabled && { color: "#C9CFD9" }]}>{d.getDate()}</Text>
                  </View>
                </Pressy>
              );
            })}
          </View>
        </>
      )}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <Button title="Hôm nay" variant="secondary" icon="today-outline" style={{ flex: 1 }} onPress={() => onSelect(todayKey)} disabled={!!min && new Date() < min} />
        {clearable && <Button title="Bỏ trống" variant="ghost" style={{ flex: 1 }} onPress={() => onSelect("")} />}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 },
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  changed: { backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  changedText: { fontFamily: fonts.heavy, fontSize: 10.5, color: colors.warning },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  value: { flex: 1, fontFamily: fonts.bold, fontSize: 15.5, color: colors.ink },
  errorRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  error: { flex: 1, fontFamily: fonts.bold, fontSize: 13, color: colors.danger },
  hint: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted, marginTop: 6 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  monthBtn: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 12 },
  month: { fontFamily: fonts.heavy, fontSize: 17, color: colors.ink },
  weekRow: { flexDirection: "row" },
  week: { flex: 1, textAlign: "center", fontFamily: fonts.heavy, fontSize: 12, color: colors.inkSoft, paddingVertical: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, maxHeight: 52, alignItems: "center", justifyContent: "center" },
  day: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  today: { borderWidth: 2, borderColor: colors.accent },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  yearGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", paddingVertical: 4 },
  year: { width: 76, minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  yearActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  yearText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
});

