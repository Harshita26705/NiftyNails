import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { ChatDesigner } from "./ChatDesigner";

export const metadata: Metadata = { title: "Chat design" };

export default function ChatPage() {
  return (
    <Suspense>
      <ClientOnly>
        <ChatDesigner />
      </ClientOnly>
    </Suspense>
  );
}
