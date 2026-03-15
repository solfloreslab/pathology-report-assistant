// Highlight clinical keywords in bold
export function highlightClinical(text: string): string {
  return text.replace(
    /(pT\w+|pN\w+|pM\w+|pTNM|MMR\/MSI|pMMR|dMMR|MSI-H|MSS|HER2|FISH|Ki-?67|BRCA\d?|PD-?L1|ganglios?\s*(?:linfáticos)?|metástasis|invasión\s+\w+|Breslow|Clark|Nottingham|Gleason|recurrencia|estadificación|\d+\/\d+\s*(?:ganglios|positivos)?|\d+\s*(?:mm|cm|mitosis))/gi,
    '<strong>$1</strong>'
  )
}
