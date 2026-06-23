import { createClient } from '@/lib/supabase/server'
import { countActiveStamps, isRewardReady, StampRow, RedemptionRow } from '@/lib/stamps'

const STAMPS_REQUIRED = 10

export interface Customer {
  id: string
  name: string
  phone: string
  card_token: string
  short_code: string
  created_at: string
}

export interface CustomerWithStamps extends Customer {
  stamps: StampRow[]
  redemptions: RedemptionRow[]
  activeStamps: number
  rewardReady: boolean
}

export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', phone.trim())
    .maybeSingle()

  if (error) throw error
  return data
}

export async function findCustomerByShortCode(code: string): Promise<CustomerWithStamps | null> {
  const supabase = await createClient()

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('short_code', code)
    .maybeSingle()

  if (customerError) throw customerError
  if (!customer) return null

  const { data: stamps, error: stampsError } = await supabase
    .from('stamps')
    .select('id, created_at')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: true })

  if (stampsError) throw stampsError

  const { data: redemptions, error: redemptionsError } = await supabase
    .from('redemptions')
    .select('id, redeemed_at')
    .eq('customer_id', customer.id)
    .order('redeemed_at', { ascending: true })

  if (redemptionsError) throw redemptionsError

  const activeStamps = countActiveStamps(stamps ?? [], redemptions ?? [])

  return {
    ...customer,
    stamps: stamps ?? [],
    redemptions: redemptions ?? [],
    activeStamps,
    rewardReady: isRewardReady(activeStamps, STAMPS_REQUIRED),
  }
}

export async function findCustomerByToken(token: string): Promise<CustomerWithStamps | null> {
  const supabase = await createClient()

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('card_token', token)
    .maybeSingle()

  if (customerError) throw customerError
  if (!customer) return null

  const { data: stamps, error: stampsError } = await supabase
    .from('stamps')
    .select('id, created_at')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: true })

  if (stampsError) throw stampsError

  const { data: redemptions, error: redemptionsError } = await supabase
    .from('redemptions')
    .select('id, redeemed_at')
    .eq('customer_id', customer.id)
    .order('redeemed_at', { ascending: true })

  if (redemptionsError) throw redemptionsError

  const activeStamps = countActiveStamps(stamps ?? [], redemptions ?? [])

  return {
    ...customer,
    stamps: stamps ?? [],
    redemptions: redemptions ?? [],
    activeStamps,
    rewardReady: isRewardReady(activeStamps, STAMPS_REQUIRED),
  }
}

export async function getCustomerWithStamps(customerId: string): Promise<CustomerWithStamps | null> {
  const supabase = await createClient()

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .maybeSingle()

  if (customerError) throw customerError
  if (!customer) return null

  const { data: stamps, error: stampsError } = await supabase
    .from('stamps')
    .select('id, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true })

  if (stampsError) throw stampsError

  const { data: redemptions, error: redemptionsError } = await supabase
    .from('redemptions')
    .select('id, redeemed_at')
    .eq('customer_id', customerId)
    .order('redeemed_at', { ascending: true })

  if (redemptionsError) throw redemptionsError

  const activeStamps = countActiveStamps(stamps ?? [], redemptions ?? [])

  return {
    ...customer,
    stamps: stamps ?? [],
    redemptions: redemptions ?? [],
    activeStamps,
    rewardReady: isRewardReady(activeStamps, STAMPS_REQUIRED),
  }
}

export async function createCustomer(name: string, phone: string): Promise<Customer> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customers')
    .insert({ name: name.trim(), phone: phone.trim() })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function addStamp(customerId: string, addedBy: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('stamps')
    .insert({ customer_id: customerId, added_by: addedBy })

  if (error) throw error
}

export async function redeemReward(customerId: string, redeemedBy: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('redemptions')
    .insert({ customer_id: customerId, redeemed_by: redeemedBy })

  if (error) throw error
}
