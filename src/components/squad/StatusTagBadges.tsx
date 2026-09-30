import { Badge } from "@/components/ui/primitives";
import type { StatusTag } from "./statusTags";

export function StatusTags({ tags }: { tags: StatusTag[] }) {
  if (!tags.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {tags.map((t) => (
        <Badge key={t.key} tone={t.tone} title={t.title}>
          <span aria-hidden>{t.label}</span>
          <span className="sr-only">{t.title}</span>
        </Badge>
      ))}
    </span>
  );
}
