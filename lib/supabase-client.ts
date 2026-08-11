import { createClient, SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

let supabase: SupabaseClient | null = null

export function getSupabaseClient() {
  if (!supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      )
    }
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabase
}
