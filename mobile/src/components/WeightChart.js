import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";
import { colors, fonts, radius } from "../theme";
import { formatDate } from "../utils/format";
import Pressy from "./Pressy";

/**
 * Biểu đồ cân nặng đơn giản, dễ đọc. Chạm vào điểm để xem số liệu.
 * points: [{ date, value }] đã sắp xếp tăng dần theo ngày.
 */
export default function WeightChart({ points, height = 170, unit = "kg" }) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(points.length - 1);
  const pad = { l: 34, r: 14, t: 18, b: 24 };
  const data = useMemo(() => {
    if (!points.length || !width) return null;
    const values = points.map((p) => Number(p.value));
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (max - min < 0.5) {
      min -= 0.5;
      max += 0.5;
    }
    const span = max - min;
    const w = width - pad.l - pad.r;
    const h = height - pad.t - pad.b;
    const xy = points.map((p, i) => ({
      ...p,
      x: pad.l + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w),
      y: pad.t + h - ((Number(p.value) - min) / span) * h,
    }));
    const line = xy.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = `${line} L${xy[xy.length - 1].x},${pad.t + h} L${xy[0].x},${pad.t + h} Z`;
    const ticks = [max, (max + min) / 2, min].map((v) => ({ v, y: pad.t + h - ((v - min) / span) * h }));
    return { xy, line, area, ticks };
  }, [points, width, height]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = data?.xy[Math.min(active, (data?.xy.length || 1) - 1)];
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: height + 54 }} accessibilityLabel={`Biểu đồ cân nặng, ${points.length} lần đo`}>
      {current && (
        <View style={styles.readout} accessibilityLiveRegion="polite">
          <Text style={styles.readValue}>
            {Number(current.value).toLocaleString("vi-VN")} {unit}
          </Text>
          <Text style={styles.readDate}>{formatDate(current.date)}</Text>
        </View>
      )}
      {data && (
        <View>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="wfill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.accent} stopOpacity="0.35" />
                <Stop offset="1" stopColor={colors.accent} stopOpacity="0.02" />
              </LinearGradient>
            </Defs>
            {data.ticks.map((t, i) => (
              <Line key={i} x1={pad.l} x2={width - pad.r} y1={t.y} y2={t.y} stroke={colors.border} strokeDasharray="4 5" />
            ))}
            {points.length > 1 && <Path d={data.area} fill="url(#wfill)" />}
            {points.length > 1 && <Path d={data.line} stroke={colors.primary} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" />}
            {current && <Line x1={current.x} x2={current.x} y1={pad.t} y2={height - pad.b} stroke={colors.accent} strokeWidth={1.5} />}
            {data.xy.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={i === active ? 7 : 4.5} fill={i === active ? colors.accent : colors.surface} stroke={colors.primary} strokeWidth={2.5} />
            ))}
          </Svg>
          {data.ticks.map((t, i) => (
            <Text key={i} style={[styles.tick, { top: t.y - 8 }]}>
              {t.v.toFixed(1)}
            </Text>
          ))}
          {data.xy.map((p, i) => (
            <Pressy
              key={i}
              onPress={() => setActive(i)}
              feedback="tap"
              scaleTo={1}
              accessibilityLabel={`${formatDate(p.date)}: ${p.value} ${unit}`}
              style={[styles.hit, { left: p.x - 22, top: p.y - 22 }]}
            />
          ))}
          <View style={styles.axis}>
            <Text style={styles.axisText}>{formatDate(points[0].date, { year: false })}</Text>
            {points.length > 1 && <Text style={styles.axisText}>{formatDate(points[points.length - 1].date, { year: false })}</Text>}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 6, minHeight: 30 },
  readValue: { fontFamily: fonts.black, fontSize: 22, color: colors.primary },
  readDate: { fontFamily: fonts.bold, fontSize: 13, color: colors.inkSoft },
  tick: { position: "absolute", left: 0, width: 30, textAlign: "right", fontFamily: fonts.bold, fontSize: 10.5, color: colors.muted },
  hit: { position: "absolute", width: 44, height: 44, borderRadius: radius.pill },
  axis: { flexDirection: "row", justifyContent: "space-between", paddingLeft: 34, paddingRight: 14, marginTop: -18 },
  axisText: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
});

