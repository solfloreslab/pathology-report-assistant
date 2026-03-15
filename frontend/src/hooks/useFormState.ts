import { useState, useCallback, useMemo } from 'react'
import type { ProtocolDef, FieldDef, SectionId } from '../data/protocols'
import { sectionOrder } from '../data/protocols'

export type FormValues = Record<string, string>

export interface SectionStatus {
  id: SectionId
  total: number
  filled: number
  status: 'complete' | 'partial' | 'empty' | 'error'
}

export function useFormState(protocol: ProtocolDef | null) {
  const [values, setValues] = useState<FormValues>({})

  const setValue = useCallback((fieldName: string, value: string) => {
    setValues(prev => ({ ...prev, [fieldName]: value }))
  }, [])

  const bulkSetValues = useCallback((newValues: FormValues) => {
    setValues(prev => ({ ...prev, ...newValues }))
  }, [])

  const resetValues = useCallback(() => {
    setValues({})
  }, [])

  const filledFields = useMemo(() => {
    if (!protocol) return []
    return protocol.fields.filter(f => {
      const v = values[f.name]
      return v && v !== '' && v !== '—'
    })
  }, [protocol, values])

  const pendingFields = useMemo(() => {
    if (!protocol) return []
    return protocol.fields.filter(f => {
      const v = values[f.name]
      return !v || v === '' || v === '—'
    })
  }, [protocol, values])

  const completionPercent = useMemo(() => {
    if (!protocol || protocol.fields.length === 0) return 0
    return Math.round((filledFields.length / protocol.fields.length) * 100)
  }, [protocol, filledFields])

  const sectionStatuses = useMemo((): SectionStatus[] => {
    if (!protocol) return []
    return sectionOrder
      .map(sectionId => {
        const sectionFields = protocol.fields.filter(f => f.section === sectionId)
        if (sectionFields.length === 0) return null
        const filled = sectionFields.filter(f => {
          const v = values[f.name]
          return v && v !== '' && v !== '—'
        }).length
        const status: SectionStatus['status'] =
          filled === 0 ? 'empty' :
          filled === sectionFields.length ? 'complete' : 'partial'
        return { id: sectionId, total: sectionFields.length, filled, status }
      })
      .filter((s): s is SectionStatus => s !== null)
  }, [protocol, values])

  return {
    values,
    setValue,
    bulkSetValues,
    resetValues,
    filledFields,
    pendingFields,
    completionPercent,
    sectionStatuses,
  }
}
