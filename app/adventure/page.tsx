import type { Metadata } from "next";
import { AdventureClient } from "./AdventureClient";

export const metadata: Metadata = {
  title: "Veeraj's World",
  description: "An interactive tour through Veeraj's projects, guided by Teddy.",
};

export default function AdventurePage() {
  return <AdventureClient />;
}
