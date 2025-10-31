import type { LeadGenerique, MappedData } from '../shared/types/canonical'

export function mapSwisslifeSantePro(lead: LeadGenerique): MappedData {
  const s = lead.subscriber
  return {
    sl_nom: s.lastName,
    sl_prenom: s.firstName,
    sl_date_naiss: s.birthDate,
    sl_email: lead.contact?.email,
  }
}

