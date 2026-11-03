import React, { useEffect, useState } from "react";
import { ScrollView, RefreshControl } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "../../services/api";
import { Title, Caption, ErrorText, PrimaryButton } from "../../components/UI";
import ChoiceChips from "../../components/ChoiceChips";
import PhotoComposer from "./PhotoComposer";
import MomentCard from "./MomentCard";
import useMoments from "./useMoments";
import { palette } from "../../theme";
export default function MomentsScreen() {
  const params = useLocalSearchParams(),
    [petId, setPetId] = useState(params.petId || ""),
    [pets, setPets] = useState([]),
    [busy, setBusy] = useState(false),
    [petError, setPetError] = useState("");
  const journal = useMoments(petId);
  useEffect(() => {
    api("/pets")
      .then((r) => {
        setPets(r.items);
        if (!petId) setPetId(r.items[0]?.id || "");
      })
      .catch((e) => setPetError(e.message));
  }, []);
  return (
    <ScrollView
      style={{ backgroundColor: palette.background }}
      contentContainerStyle={{
        width: "100%",
        maxWidth: 760,
        alignSelf: "center",
        padding: 20,
        paddingBottom: 60,
      }}
      refreshControl={
        <RefreshControl
          refreshing={journal.loading}
          onRefresh={() => journal.load()}
        />
      }
    >
      <Title>Khoảnh khắc của bé</Title>
      <Caption>Những điều nhỏ bé, những kỷ niệm thật lâu.</Caption>
      <ChoiceChips
        options={pets.map((p) => ({ id: p.id, label: p.name }))}
        value={petId}
        onChange={setPetId}
        disabled={busy}
      />
      <ErrorText error={petError || journal.error} />
      {petId ? (
        <>
          <PhotoComposer
            key={petId}
            petId={petId}
            autoCapture={params.capture === "1"}
            onSaved={() => journal.load()}
            onBusy={setBusy}
          />
          {!journal.loading && !journal.items.length && (
            <Caption>
              Chưa có khoảnh khắc. Lưu bức ảnh đầu tiên của bé nhé.
            </Caption>
          )}
          {journal.items.map((item) => (
            <MomentCard
              key={item.id}
              item={item}
              onChanged={() => journal.load()}
            />
          ))}
          {journal.more && (
            <PrimaryButton
              title="Xem thêm khoảnh khắc"
              disabled={journal.loading}
              onPress={journal.next}
            />
          )}
        </>
      ) : (
        <Caption>Thêm hồ sơ thú cưng để lưu ảnh cho bé.</Caption>
      )}
    </ScrollView>
  );
}
