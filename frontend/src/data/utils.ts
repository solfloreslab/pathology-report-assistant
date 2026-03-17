// Highlight clinical keywords in bold
export function highlightClinical(text: string): string {
  // First: highlight quoted fragments (anomalous text cited by AI)
  let result = text.replace(
    /'([^']{3,})'/g,
    '\'<strong style="color:inherit;text-decoration:underline">$1</strong>\''
  )
  // Then: highlight clinical terms
  result = result.replace(
    /(pT\w+|pN\w+|pM\w+|pTNM|MMR\/MSI|pMMR|dMMR|MSI-H|MSS|HER2|FISH|Ki-?67|BRCA\d?|PD-?L1|ganglios?\s*(?:linfáticos)?|metástasis|invasión\s+(?:linfovascular|perineural|vascular)|adenocarcinoma|carcinoma|hemicolectomía\s*\w*|colectomía\s*\w*|resección\s*\w*|colon\s+(?:sigmoide|ascendente|descendente|transverso)|recto|ciego|Breslow|Clark|Nottingham|Gleason|recurrencia|estadificación|margen\s*(?:distal|proximal|radial|circunferencial)?|\d+\/\d+\s*(?:ganglios|positivos)?|\d+\s*(?:mm|cm|mitosis))/gi,
    '<strong>$1</strong>'
  )
  return result
}
