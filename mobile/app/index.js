import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import HomeScreen from "../src/features/home/HomeScreen";

export default function Index() {
  const { user } = useAuth();
  if (user?.role === "admin") return <Redirect href="/admin" />;
  if (["manager", "staff"].includes(user?.role)) return <Redirect href="/manage" />;
  return <HomeScreen />;
}
