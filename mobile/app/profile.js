import React, { useCallback, useState } from "react";
import { ScrollView, Alert, Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "../src/services/api";
import { useAuth } from "../src/context/AuthContext";
import { Title, Caption, TextField, PrimaryButton, ErrorText } from "../src/components/UI";
import AvatarEditor from "../src/components/AvatarEditor";

export default function Profile() {
  const {refreshUser} = useAuth();
  const [profile,setProfile]=useState({displayName:"",phone:"",bio:"",avatarUrl:null});
  const [exists,setExists]=useState(false),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false);
  const [ready,setReady]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  const load=useCallback(async()=>{
    setBusy(true);setReady(false);setError("");
    try {const r=await api('/profile');setProfile(r.profile);setExists(r.exists);setReady(true);}
    catch(e){setError(e.message);}finally{setBusy(false);}
  },[]);
  useFocusEffect(useCallback(()=>{load();},[load]));
  async function save(){
    setBusy(true);setError("");setMessage("");
    try {const r=await api('/profile',{method:exists?'PATCH':'POST',body:profile});setProfile(r.profile);setExists(true);await refreshUser();setMessage('Đã lưu hồ sơ cá nhân.');}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function remove(){
    setBusy(true);setError("");setMessage("");
    try {await api('/profile',{method:'DELETE'});await refreshUser();await load();setMessage('Đã xóa thông tin hồ sơ cá nhân.');}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  function confirmDelete(){
    const text='Xóa tên hiển thị, số điện thoại, giới thiệu và ảnh đại diện? Tài khoản đăng nhập, đơn hàng và thú cưng vẫn được giữ lại.';
    if(Platform.OS==='web'){if(window.confirm(text))remove();}
    else Alert.alert('Xóa hồ sơ cá nhân',text,[{text:'Hủy',style:'cancel'},{text:'Xóa',style:'destructive',onPress:remove}]);
  }
  const disabled=busy || uploading || !ready;
  return <ScrollView contentContainerStyle={{padding:22,maxWidth:760,width:'100%',alignSelf:'center',paddingBottom:60}}>
    <Title>Hồ sơ của tôi</Title><Caption>{profile.email}</Caption>
    <AvatarEditor value={profile.avatarUrl} onChange={avatarUrl=>setProfile(p=>({...p,avatarUrl}))} disabled={busy || !ready} onBusy={setUploading} label="Ảnh đại diện của tôi" />
    {[["displayName","Tên hiển thị *",100],["phone","Số điện thoại",30],["bio","Giới thiệu",1000]].map(([key,label,max])=>
      <TextField key={key} label={label} value={profile[key] || ''} onChangeText={value=>setProfile(p=>({...p,[key]:value}))}
        editable={!disabled} maxLength={max} multiline={key==='bio'} keyboardType={key==='phone'?'phone-pad':'default'} />)}
    <ErrorText error={error} />{!!message && <Caption>{message}</Caption>}
    {!ready && <PrimaryButton title="Tải lại hồ sơ" disabled={busy} onPress={load} />}
    <PrimaryButton title={exists?'Lưu thay đổi':'Tạo hồ sơ cá nhân'} loading={busy} disabled={disabled || !profile.displayName?.trim()} onPress={save} />
    {exists && <PrimaryButton title="Xóa hồ sơ cá nhân" variant="secondary" disabled={disabled} onPress={confirmDelete} />}
  </ScrollView>;
}
