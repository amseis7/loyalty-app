'use server'

import { createClient } from '@/lib/supabase/server'

export async function clearStampAnimation(token: string): Promise<void> {
  const supabase = await createClient()
  await supabase.rpc('clear_stamp_animation', { p_token: token })
}
