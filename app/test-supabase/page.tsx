"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Page() {
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    console.log("Supabase URL:", url);
    console.log("Supabase client:", supabase);

    if (!url) {
      console.error("NEXT_PUBLIC_SUPABASE_URL is undefined");
    }
  }, []);

  return <div>Testing Supabase</div>;
}
