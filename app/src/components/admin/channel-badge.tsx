import { Globe, MessageCircle } from "lucide-react";

export function ChannelBadge({ canal }: { canal: "whatsapp" | "web" | null }) {
  if (canal === "whatsapp") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <MessageCircle className="h-3 w-3" strokeWidth={1.7} />
        WhatsApp
      </span>
    );
  }
  if (canal === "web") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
        <Globe className="h-3 w-3" strokeWidth={1.7} />
        Web
      </span>
    );
  }
  return null;
}
