
import "server-only";

import type { User } from "@supabase/supabase-js";
import { db } from "@/db";
import { profiles } from "@/db/schema";

export async function ensurePlayerProfile(user: User) {
  const displayName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : user.email?.split("@")[0] ?? "Player";

  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;

  await db
    .insert(profiles)
    .values({
      id: user.id,
      displayName,
      avatarUrl,
    })
    .onConflictDoNothing({
      target: profiles.id,
    });
}
