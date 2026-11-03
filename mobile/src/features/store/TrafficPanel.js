import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "../../services/api";
import { Card, Caption, Title, PrimaryButton, ErrorText } from "../../components/UI";
import ChoiceChips from "../../components/ChoiceChips";
import { money } from "../../utils/format";

export default function TrafficPanel() {
  const [days, setDays] = useState(7), [data, setData] = useState(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try { setData(await api(`/admin/traffic?days=${days}`)); }
    catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }, [days]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return <View>
    <Title>Traffic & bán hàng</Title>
    <Caption>Theo ngày Việt Nam. Chỉ ghi nhận lượt mở shop/sản phẩm của khách đã đăng nhập từ khi bật tính năng; không tính lượt xem của nhân viên.</Caption>
    <ChoiceChips options={[7,30,90].map(n => ({id:n,label:`${n} ngày`}))} value={days} onChange={setDays} disabled={busy} />
    <PrimaryButton title={busy ? "Đang tải…" : "Làm mới thống kê"} disabled={busy} onPress={load} />
    <ErrorText error={error} />
    {data && <>
      <View style={{flexDirection:"row",flexWrap:"wrap",gap:12}}>
        {[["Lượt xem shop",data.shopViews],["Lượt xem sản phẩm",data.productViews],["Khách khác nhau",data.visitors],["Số đơn tạo",data.sales.orders],["Đơn chờ xử lý",data.sales.pending],["Đơn hủy",data.sales.cancelled]].map(([label,value]) =>
          <Card key={label} style={{flexGrow:1,minWidth:160}}><Caption>{label}</Caption><Text style={{fontSize:26,fontWeight:"700"}}>{value}</Text></Card>)}
      </View>
      <Card><Caption>Doanh thu từ đơn đã giao, được tạo trong kỳ</Caption><Title>{money(data.sales.revenue)}</Title></Card>
      <Card><Title>Lượt xem theo ngày</Title>
        {!data.daily.length && <Caption>Chưa có lượt truy cập được ghi nhận.</Caption>}
        {data.daily.map(row => <View key={row.day} style={{marginVertical:8}}>
          <Caption>{row.day} · {row.views} lượt xem · {row.visitors} khách</Caption>
          <View style={{height:8,borderRadius:4,backgroundColor:"#24594B",width:`${Math.max(2,100*row.views/Math.max(...data.daily.map(d=>d.views)))}%`}} />
        </View>)}
      </Card>
      <Card><Title>Sản phẩm được xem nhiều</Title>
        {!data.products.length && <Caption>Chưa có lượt xem sản phẩm.</Caption>}
        {data.products.map(row => <Caption key={row.id}>{row.name} · {row.views} lượt xem</Caption>)}
      </Card>
    </>}
  </View>;
}
