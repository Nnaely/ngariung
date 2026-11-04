import type { CheckIn } from "@/lib/types";
import { Avatar } from "./Avatar";
import { FlameIcon } from "./Icons";
import { relativeTime, timeWIB } from "@/lib/format";

export function FeedRow({ item, isMe }: { item: CheckIn; isMe?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar emoji={item.emoji} color={item.color} size={36} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[13px] font-medium">
          {item.username}
          {isMe && (
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-flame">
              kamu
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[10.5px] text-muted">
          {timeWIB(item.at)} · {relativeTime(item.at)}
        </p>
      </div>
      <span className="tabular flex items-center gap-1 text-[12px] font-medium text-fg/80">
        <FlameIcon className="h-3 w-3 text-flame/80" />
        {item.streak}
      </span>
    </div>
  );
}
