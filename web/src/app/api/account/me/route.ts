
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensurePlayerProfile } from "@/lib/player-profile";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await ensurePlayerProfile(user);

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name ?? null,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Profile synchronization failed:", error);

    return NextResponse.json(
      { error: "Unable to load player profile" },
      { status: 500 }
    );
  }
}
