'use server'

import { createClient } from '@/lib/supabase/server'
import { addStamp, redeemReward } from '@/lib/customers'
import { revalidatePath } from 'next/cache'

export async function addStampAction(customerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  await addStamp(customerId, user.email ?? 'staff')
  revalidatePath('/admin')
}

export async function redeemRewardAction(customerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  await redeemReward(customerId, user.email ?? 'staff')
  revalidatePath('/admin')
}
