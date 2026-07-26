import { SurfaceChat } from "@/components/surface-chat";

/** Web-chat de Colsubsidio (canal rico). Público, sin login. */
export const dynamic = "force-dynamic";

export default function WebChatPage() {
  return <SurfaceChat canal="web" accent="#ffd000" title="Asegura · Colsubsidio" />;
}
