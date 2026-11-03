import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts, radius, shadow } from "../theme";
import { species } from "../utils/format";
import SmartImage from "./SmartImage";
import Pressy from "./Pressy";
import Icon from "./Icon";
import { Paw, Sparkle } from "./Decor";

/** Card ảnh lớn cho từng bé: ảnh, tên, loài, giống và số ngày đồng hành. */
export default function PetCard({ pet, days, onPress, width = 230, height = 290 }) {
  const sp = species(pet.species);
  return (
    <Pressy
      onPress={onPress}
      feedback="light"
      scaleTo={0.965}
      accessibilityLabel={`${pet.name}, ${sp.label}${pet.breed ? `, ${pet.breed}` : ""}${days != null ? `, ${days} ngày bên nhau` : ""}. Mở hồ sơ`}
      style={[styles.card, { width, height }]}
    >
      <SmartImage uri={pet.avatarUrl} style={StyleSheet.absoluteFill} fallback={pet.species === "cat" ? "cat" : pet.species === "dog" ? "dog" : "paw"} />
      <LinearGradient colors={["rgba(7,26,58,0)", "rgba(7,26,58,0.15)", "rgba(7,26,58,0.82)"]} locations={[0.35, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.tag}>
        <Text style={styles.tagText}>
          {sp.emoji} {sp.tag}
        </Text>
      </View>
      <View style={styles.bottom}>
        <Text numberOfLines={1} style={styles.name}>
          {pet.name}
        </Text>
        <Text numberOfLines={1} style={styles.breed}>
          {pet.breed || sp.label}
        </Text>
        {days != null && (
          <View style={styles.days}>
            <Icon name="heart" size={13} color={colors.pink} />
            <Text style={styles.daysText}>
              {days === 0 ? "Ngày đầu bên nhau" : `${days} ngày bên nhau`}
            </Text>
          </View>
        )}
      </View>
    </Pressy>
  );
}

/** Card "Thêm bé" – lời mời thân thiện. */
export function AddPetCard({ onPress, width = 180, height = 290, first = false }) {
  return (
    <Pressy onPress={onPress} feedback="light" scaleTo={0.965} accessibilityLabel="Thêm bé mới" style={[styles.add, { width, height }]}>
      <Paw size={22} color={colors.accent} rotate={-20} opacity={0.5} style={{ position: "absolute", top: 18, left: 16 }} />
      <Sparkle size={14} style={{ position: "absolute", top: 26, right: 22 }} opacity={0.8} />
      <Paw size={18} color={colors.primary} rotate={25} opacity={0.18} style={{ position: "absolute", bottom: 22, right: 18 }} />
      <View style={styles.plus}>
        <Icon name="add" size={34} color={colors.primaryDark} />
      </View>
      <Text style={styles.addTitle}>{first ? "Thêm bé đầu tiên" : "Thêm bé"}</Text>
      <Text style={styles.addText}>{first ? "Bắt đầu cuốn nhật ký của bé ngay hôm nay" : "Thêm một người bạn nhỏ vào gia đình"}</Text>
    </Pressy>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, overflow: "hidden", backgroundColor: colors.primarySoft, ...shadow.soft },
  tag: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { fontFamily: fonts.heavy, fontSize: 11.5, color: colors.primary },
  bottom: { position: "absolute", left: 16, right: 16, bottom: 16 },
  name: { fontFamily: fonts.black, fontSize: 24, lineHeight: 30, color: colors.white },
  breed: { fontFamily: fonts.bold, fontSize: 13.5, color: "#E1EBFA", marginTop: 1 },
  days: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 10,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  daysText: { fontFamily: fonts.heavy, fontSize: 12, color: colors.primaryDark },
  add: {
    borderRadius: radius.xl,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#F3C77F",
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  plus: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    ...shadow.soft,
  },
  addTitle: { fontFamily: fonts.heavy, fontSize: 17, color: colors.ink, textAlign: "center" },
  addText: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.inkSoft, textAlign: "center", marginTop: 6 },
});

