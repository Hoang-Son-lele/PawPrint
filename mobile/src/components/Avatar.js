import React, { useState } from "react";
import { Image, View, Text } from "react-native";
export default function Avatar({uri,label="?",size=64}) {
  const [failed,setFailed] = useState(false);
  React.useEffect(()=>setFailed(false),[uri]);
  const style = {width:size,height:size,borderRadius:size/2};
  return uri && !failed
    ? <Image source={{uri}} style={style} resizeMode="cover" onError={()=>setFailed(true)} accessibilityLabel={`Ảnh đại diện ${label}`} />
    : <View style={[style,{backgroundColor:"#E9EEF6",alignItems:"center",justifyContent:"center"}]}><Text style={{fontSize:size*0.36,color:"#283454",fontWeight:"700"}}>{label.trim().slice(0,2).toUpperCase() || "?"}</Text></View>;
}
