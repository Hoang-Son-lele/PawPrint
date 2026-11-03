import React, { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { api } from "../src/services/api";
import {
  Title,
  Caption,
  Card,
  TextField,
  PrimaryButton,
  ErrorText,
} from "../src/components/UI";
export default function Insights() {
  const [pets, setPets] = useState([]),
    [notes, setNotes] = useState([]),
    [error, setError] = useState(""),
    [period, setPeriod] = useState(
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
    ),
    [recaps, setRecaps] = useState([]),
    [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    setError("");
    try {
      const [p, n] = await Promise.all([api("/pets"), api("/notifications")]);
      setPets(p.items);
      setNotes(n.items);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function recap() {
    setBusy(true);
    setError("");
    try {
      if (!/^\d{4}-\d{2}$/.test(period))
        throw new Error("Nhập tháng theo YYYY-MM.");
      const [year, month] = period.split("-");
      const rows = await Promise.all(
        pets.map(async (p) => ({
          ...(await api(`/pets/${p.id}/recaps?year=${year}&month=${month}`)),
          name: p.name,
        })),
      );
      setRecaps(rows);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
      <Title>Nhắc nhở</Title>
      <ErrorText error={error} />
      <PrimaryButton title="Tải lại" disabled={busy} onPress={load} />
      {!notes.length && <Caption>Chưa có nhắc nhở cân nặng quá hạn.</Caption>}
      {notes.map((n) => (
        <Card key={n.petId}>
          <Text>{n.petName}: Đã 30 ngày chưa cập nhật cân nặng.</Text>
        </Card>
      ))}
      <Title>Tổng kết tháng</Title>
      <TextField
        label="Tháng (YYYY-MM)"
        value={period}
        onChangeText={setPeriod}
      />
      <PrimaryButton title="Xem tổng kết" loading={busy} onPress={recap} />
      {recaps.map((r, i) => (
        <Card key={i}>
          <Text style={{ fontWeight: "700", fontSize: 18 }}>
            {r.name} · {r.period}
          </Text>
          <Caption>
            {r.moments} khoảnh khắc · {r.careRecords} hoạt động chăm sóc
          </Caption>
          {r.weights.map((w, j) => (
            <Text key={j}>
              {String(w.occurredAt).slice(0, 10)}: {w.weightKg} kg
            </Text>
          ))}
        </Card>
      ))}
    </ScrollView>
  );
}
