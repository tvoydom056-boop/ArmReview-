import type { SelectField } from 'payload'

import { TECHNIQUES, getTechniqueOptionLabel } from '@/lib/techniques'

// Правило ввода по пирамиде (docs/changes/technique-pyramid.md § 1)
const PYRAMID_RULE = 'Уверен в точке пирамиды — выбирай её, сомневаешься — семейство «без уточнения»'

// Техника из справочника lib/techniques.ts — у борца и у каждой стороны матча (AGENTS § 4.4)
export const techniqueField = (name: string, label: string, description?: string): SelectField => ({
  name,
  type: 'select',
  label,
  options: TECHNIQUES.map(({ value }) => ({ value, label: getTechniqueOptionLabel(value) })),
  admin: { description: description ? `${description}. ${PYRAMID_RULE}` : PYRAMID_RULE },
})
