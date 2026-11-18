
"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const { data } = await supabase.auth.getUser();

      if (active) {
        setUser(data.user);
        setLoading(false);
      }
    }

    void loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (active) {
          setUser(session?.user ?? null);
        }
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn() {
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error(error);
      alert("Unable to sign in. Please try again.");
      setLoading(false);
    }
  }

  async function signOut() {
    setLoading(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error);
      alert("Unable to sign out.");
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <span className="text-sm text-zinc-400">
        Loading...
      </span>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="max-w-32 truncate text-sm text-zinc-300">
          {user.user_metadata?.full_name ?? user.email}
        </span>

        <button
          onClick={signOut}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={signIn}
      className="rounded-lg bg-[#F5EFEC] px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
    >
      Sign in 
    </button>
  );
}
