import React, { useState } from "react";
import { View } from "react-native";
import Avatar from "./Avatar";
import { PrimaryButton, ErrorText, Caption } from "./UI";
import { selectPhoto, uploadAvatar } from "../services/media";
export default function AvatarEditor({value,onChange,label="Ảnh đại diện",disabled=false,onBusy=()=>{}}) {
  const [busy,setBusy] = useState(false),[error,setError] = useState("");
  async function choose() {
    setError(""); setBusy(true); onBusy(true);
    try {
      const asset=await selectPhoto();
      if (asset) { const response=await uploadAvatar(asset);onChange(response.avatarUrl); }
    } catch(e) {setError(e.message);}
    finally {setBusy(false);onBusy(false);}
  }
  return <View style={{marginVertical:16}}>
    <Caption>{label}</Caption><Avatar uri={value} label={label} size={100} />
    <PrimaryButton title="Chọn ảnh đại diện" loading={busy} disabled={disabled || busy} variant="secondary" onPress={choose} />
    {!!value && <PrimaryButton title="Bỏ ảnh đại diện" disabled={disabled || busy} variant="secondary" onPress={()=>onChange(null)} />}
    <Caption>JPEG, PNG hoặc WebP, tối đa 10 MB. Bấm lưu hồ sơ để áp dụng.</Caption>
    <ErrorText error={error} />
  </View>;
}
