'use server'

import { createClient } from '@/lib/supabase/server'
import { addStamp, redeemReward, createCustomer } from '@/lib/customers'
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

export async function createCustomerAction(
  name: string,
  phone: string
): Promise<{ short_code: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  try {
    const customer = await createCustomer(name, phone)
    revalidatePath('/admin')
    return { short_code: customer.short_code }
  } catch (err: unknown) {
    const pgErr = err as { code?: string }
    if (pgErr.code === '23505') throw new Error('DUPLICATE_PHONE')
    throw err
  }
}
