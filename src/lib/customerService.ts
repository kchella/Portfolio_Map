import { supabase } from './supabase'
import type { Customer } from '../types/par'

// Until migration 004 runs, the table still has lead_generate* and no partner GPS.
async function hasSupaPartnerColumns(): Promise<boolean> {
  const { error } = await supabase.from('customers').select('supa_partner_code').limit(1)
  return !error
}

function toLegacyRow(row: Record<string, unknown>): Record<string, unknown> {
  const {
    supa_partner_code, supa_partner_name,
    supa_partner_latitude: _lat, supa_partner_longitude: _lng, // eslint-disable-line @typescript-eslint/no-unused-vars
    ...rest
  } = row
  return { ...rest, lead_generate: supa_partner_code, lead_generate_name: supa_partner_name }
}

export async function syncCustomers(rows: Record<string, unknown>[]) {
  // Work out the schema before deleting anything — a failed insert after the
  // delete would leave the map with no customers.
  const modern = await hasSupaPartnerColumns()
  if (!modern) rows = rows.map(toLegacyRow)

  const { error: deleteError } = await supabase
    .from('customers')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`)

  const chunkSize = 500
  for (let i = 0; i < rows.length; i += chunkSize) {
    const { error } = await supabase.from('customers').insert(rows.slice(i, i + chunkSize))
    if (error) throw new Error(`Insert failed at row ${i}: ${error.message}`)
  }

  return { success: true, partnerGpsSaved: modern }
}

export async function getCustomers(): Promise<Customer[]> {
  const PAGE = 1000
  const all: Customer[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .range(from, from + PAGE - 1)

    if (error) throw error

    // Until migration 004 runs the rows still carry lead_generate* columns.
    for (const row of (data ?? []) as (Customer & { lead_generate?: string; lead_generate_name?: string })[]) {
      row.supa_partner_code ??= row.lead_generate ?? ''
      row.supa_partner_name ??= row.lead_generate_name ?? ''
      row.supa_partner_latitude ??= null
      row.supa_partner_longitude ??= null
      all.push(row)
    }

    if ((data?.length ?? 0) < PAGE) break
    from += PAGE
  }

  return all
}