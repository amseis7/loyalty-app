'use server'

import { createClient } from '@/lib/supabase/server'

export async function clearStampAnimation(token: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('customers')
    .update({ stamp_animation_pending: false })
    .eq('card_token', token)
}
