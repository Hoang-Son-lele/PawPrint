import React from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { colors, layout } from "../theme";
import { PawLoader } from "./Decor";

/**
 * Khung màn hình cuộn chuẩn: nền kem, giới hạn độ rộng trên tablet/web,
 * kéo làm mới với dấu chân nảy, chừa chỗ cho thanh điều hướng dưới.
 */
export default function Screen({
  children,
  refreshing = false,
  onRefresh,
  header,
  footer,
  wide = false,
  padded = true,
  bottomInset = 110,
  scrollRef,
  contentStyle,
  background = colors.background,
  onScroll,
}) {
  return (
    <View style={[styles.root, { backgroundColor: background }]}>
      {header}
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { maxWidth: wide ? layout.maxWide : layout.maxContent, paddingBottom: bottomInset },
          padded && { paddingHorizontal: 18 },
          contentStyle,
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.primary, colors.accent]}
              progressBackgroundColor={colors.surface}
            />
          ) : undefined
        }
      >
        {refreshing && onRefresh ? <PawLoader /> : null}
        {children}
      </ScrollView>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { width: "100%", alignSelf: "center", paddingTop: 6 },
});

