// src/hooks/useRealtimeFeed.ts
import { useEffect } from "react";
import { supabase } from "../utils/supabase";

export function useRealtimeFeed(
  onNewPost: (row: any) => void,
  onLikeChange: (postId: string, delta: number) => void,
  onNewReply?: (row: any) => void,
) {
  useEffect(() => {
    const channel = supabase
      .channel("feed-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          const row = payload.new as any;
          if (row.parent_id === null) onNewPost(row);
          else onNewReply?.(row); // reply → notify thread view
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "likes" },
        (payload) => onLikeChange((payload.new as any).post_id, +1),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "likes" },
        (payload) => onLikeChange((payload.old as any).post_id, -1),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewPost, onLikeChange, onNewReply]);
}
