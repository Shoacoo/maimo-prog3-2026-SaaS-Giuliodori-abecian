// Fallback for destinations saved before we started storing the ISO country
// code from Google Places (countryCode). Keyed by the Spanish country name
// Google Places returns, since that's what old rows have.
const COUNTRY_CODE_BY_NAME = {
  argentina: "AR",
  bolivia: "BO",
  brasil: "BR",
  chile: "CL",
  colombia: "CO",
  "costa rica": "CR",
  cuba: "CU",
  ecuador: "EC",
  "el salvador": "SV",
  guatemala: "GT",
  honduras: "HN",
  méxico: "MX",
  mexico: "MX",
  nicaragua: "NI",
  panamá: "PA",
  panama: "PA",
  paraguay: "PY",
  perú: "PE",
  peru: "PE",
  "república dominicana": "DO",
  uruguay: "UY",
  venezuela: "VE",
  españa: "ES",
  espana: "ES",
  francia: "FR",
  italia: "IT",
  alemania: "DE",
  "reino unido": "GB",
  portugal: "PT",
  "países bajos": "NL",
  "paises bajos": "NL",
  holanda: "NL",
  bélgica: "BE",
  belgica: "BE",
  suiza: "CH",
  austria: "AT",
  grecia: "GR",
  turquía: "TR",
  turquia: "TR",
  irlanda: "IE",
  noruega: "NO",
  suecia: "SE",
  dinamarca: "DK",
  finlandia: "FI",
  islandia: "IS",
  polonia: "PL",
  "república checa": "CZ",
  chequia: "CZ",
  hungría: "HU",
  hungria: "HU",
  croacia: "HR",
  rusia: "RU",
  ucrania: "UA",
  egipto: "EG",
  marruecos: "MA",
  sudáfrica: "ZA",
  sudafrica: "ZA",
  japón: "JP",
  japon: "JP",
  china: "CN",
  "corea del sur": "KR",
  tailandia: "TH",
  vietnam: "VN",
  india: "IN",
  indonesia: "ID",
  filipinas: "PH",
  singapur: "SG",
  malasia: "MY",
  australia: "AU",
  "nueva zelanda": "NZ",
  canadá: "CA",
  canada: "CA",
  "estados unidos": "US",
  israel: "IL",
  "emiratos árabes unidos": "AE",
  "emiratos arabes unidos": "AE",
};

function resolveCountryCode(countryCode, countryName) {
  if (countryCode) {
    return countryCode;
  }

  if (!countryName) {
    return null;
  }

  return COUNTRY_CODE_BY_NAME[countryName.trim().toLowerCase()] || null;
}

export function getFlagUrl(countryCode, countryName, size = "h40") {
  const code = resolveCountryCode(countryCode, countryName);
  if (!code) {
    return null;
  }

  return `https://flagcdn.com/${size}/${code.toLowerCase()}.png`;
}
