import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "../services/api";
import {
  Card,
  Title,
  Caption,
  TextField,
  PrimaryButton,
  ErrorText,
} from "./UI";
import { palette } from "../theme";
const kinds = {
  weight: "Cân nặng",
  bath: "Tắm",
  nails: "Cắt móng",
  vet: "Khám thú y",
  note: "Ghi chú",
};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export default function JournalScreen({ mode }) {
  const params = useLocalSearchParams();
  const [pets, setPets] = useState([]),
    [petId, setPetId] = useState(params.petId || ""),
    [items, setItems] = useState([]);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false);
  const [caption, setCaption] = useState(""),
    [date, setDate] = useState(today()),
    [type, setType] = useState("weight"),
    [value, setValue] = useState("");
  const [editId, setEditId] = useState(null),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false),
    [filter, setFilter] = useState("all");
  const endpoint = mode === "care" ? "care-records" : mode;
  useEffect(() => {
    api("/pets")
      .then((r) => {
        setPets(r.items);
        if (!petId) setPetId(r.items[0]?.id || "");
      })
      .catch((e) => setError(e.message));
  }, []);
  async function load(next = 1) {
    if (!petId) return;
    setBusy(true);
    setError("");
    try {
      const r = await api(
        `/pets/${petId}/${endpoint}?page=${next}&type=${filter}`,
      );
      setItems((old) => (next === 1 ? r.items : [...old, ...r.items]));
      setPage(next);
      setMore(r.hasMore);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    setItems([]);
    setEditId(null);
    setCaption("");
    setValue("");
    setMore(false);
    load();
  }, [petId, filter]);
  async function save() {
    setSaving(true);
    setError("");
    try {
      const body =
        mode === "care"
          ? {
              type,
              valueDecimal: Number(value),
              note: caption,
              occurredAt: date,
            }
          : { caption, occurredAt: date };
      await api(
        editId ? `/${endpoint}/${editId}` : `/pets/${petId}/${endpoint}`,
        { method: editId ? "PATCH" : "POST", body },
      );
      setEditId(null);
      setCaption("");
      setValue("");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  function remove(id) {
    const action = async () => {
      try {
        await api(`/${endpoint}/${id}`, { method: "DELETE" });
        if (editId === id) {
          setEditId(null);
          setCaption("");
        }
        await load();
      } catch (e) {
        setError(e.message);
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm("Xóa bản ghi này?")) action();
    } else
      Alert.alert("Xóa bản ghi?", "Thao tác này sẽ xóa bản ghi đã chọn.", [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa", style: "destructive", onPress: action },
      ]);
  }
  function chips(options, selected, change) {
    return (
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginVertical: 12,
        }}
      >
        {options.map(([id, label]) => (
          <Pressable
            disabled={saving || busy}
            key={id}
            onPress={() => change(id)}
            style={{
              padding: 12,
              borderRadius: 16,
              backgroundColor:
                selected === id ? palette.primary : palette.subtle,
            }}
          >
            <Text style={{ color: selected === id ? "white" : palette.ink }}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
    >
      <Title>
        {mode === "care"
          ? "Nhật ký chăm sóc"
          : mode === "moments"
            ? "Paw Moments"
            : "Hành trình của bé"}
      </Title>
      {chips(
        pets.map((p) => [p.id, p.name]),
        petId,
        setPetId,
      )}
      {!pets.length && !error && (
        <Caption>Thêm hồ sơ thú cưng ở trang chủ để bắt đầu.</Caption>
      )}
      <ErrorText error={error} />
      {!!petId && mode !== "timeline" && (
        <Card>
          <Text style={{ fontWeight: "700" }}>
            {editId ? "Sửa bản ghi" : "Thêm bản ghi"}
          </Text>
          {mode === "care" && (
            <>
              {chips(Object.entries(kinds), type, setType)}
              {type === "weight" && (
                <TextField
                  label="Cân nặng (kg)"
                  keyboardType="decimal-pad"
                  value={value}
                  onChangeText={setValue}
                />
              )}
            </>
          )}
          <TextField
            label="Ngày (YYYY-MM-DD)"
            value={date}
            onChangeText={setDate}
          />
          <TextField
            label={mode === "moments" ? "Chú thích khoảnh khắc" : "Ghi chú"}
            multiline
            value={caption}
            onChangeText={setCaption}
          />
          {mode === "moments" && (
            <Caption>
              Bản ghi hiện lưu chú thích và ngày; tải ảnh riêng tư cần cấu hình
              object storage.
            </Caption>
          )}
          <PrimaryButton
            title="Lưu"
            loading={saving}
            disabled={busy}
            onPress={save}
          />
          {!!editId && (
            <PrimaryButton
              title="Hủy sửa"
              variant="secondary"
              onPress={() => {
                setEditId(null);
                setCaption("");
                setValue("");
              }}
            />
          )}
        </Card>
      )}
      {mode === "timeline" &&
        chips(
          [
            ["all", "Tất cả"],
            ["moment", "Khoảnh khắc"],
            ["care", "Chăm sóc"],
            ["milestone", "Cột mốc"],
          ],
          filter,
          setFilter,
        )}
      {!!petId && (
        <PrimaryButton
          title="Tải lại"
          variant="secondary"
          disabled={busy || saving}
          onPress={() => load()}
        />
      )}
      {busy && <ActivityIndicator style={{ margin: 16 }} />}
      {!busy && !items.length && !!petId && <Caption>Chưa có bản ghi.</Caption>}
      {items.map((item) => (
        <Card key={item.id}>
          <Caption>{String(item.occurredAt).slice(0, 10)}</Caption>
          <Text style={{ color: palette.ink, fontSize: 17, marginVertical: 8 }}>
            {mode === "care"
              ? `${kinds[item.type] || item.type}${item.valueDecimal ? ` · ${item.valueDecimal} kg` : ""}`
              : item.title || item.caption}
          </Text>
          {mode === "care" && <Caption>{item.note}</Caption>}
          {mode !== "timeline" && (
            <>
              <PrimaryButton
                title="Sửa"
                variant="secondary"
                disabled={saving || busy}
                onPress={() => {
                  setEditId(item.id);
                  setCaption(item.caption || item.note || "");
                  setDate(String(item.occurredAt).slice(0, 10));
                  setType(item.type || "weight");
                  setValue(String(item.valueDecimal || ""));
                }}
              />
              <PrimaryButton
                title="Xóa"
                variant="secondary"
                disabled={saving || busy}
                onPress={() => remove(item.id)}
              />
            </>
          )}
        </Card>
      ))}
      {more && (
        <PrimaryButton
          title="Xem thêm"
          disabled={busy || saving}
          onPress={() => load(page + 1)}
        />
      )}
    </ScrollView>
  );
}
