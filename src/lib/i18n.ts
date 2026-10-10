import type { LanguageCode } from "./types";

export const LANGUAGES: Array<{ code: LanguageCode; label: string; native: string }> = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "es", label: "Spanish", native: "Español" },
];

type Dict = Record<string, string>;

const en: Dict = {
  "app.tagline": "Agentic AI Travel Concierge",
  "nav.overview": "Overview",
  "nav.dashboard": "Dashboard",
  "nav.chat": "AI Travel Chat",
  "nav.search": "Trip Search",
  "nav.compare": "Itinerary Comparison",
  "nav.disruptions": "Disruption Management",
  "nav.trips": "My Trips",
  "nav.booking": "Booking Review",
  "nav.settings": "Settings",
  "common.loading": "Loading…",
  "common.error": "Something went wrong",
  "common.retry": "Retry",
  "common.save": "Save changes",
  "common.cancel": "Cancel",
  "common.search": "Search",
  "common.submit": "Submit",
  "common.back": "Back",
  "common.results": "results",
  "common.empty": "Nothing here yet",
  "settings.language": "Language",
  "settings.accessibility": "Accessibility",
};

const hi: Dict = {
  "app.tagline": "एजेंटिक एआई ट्रैवल कॉन्सियर्ज",
  "nav.overview": "अवलोकन",
  "nav.dashboard": "डैशबोर्ड",
  "nav.chat": "एआई ट्रैवल चैट",
  "nav.search": "यात्रा खोज",
  "nav.compare": "यात्रा तुलना",
  "nav.disruptions": "व्यवधान प्रबंधन",
  "nav.trips": "मेरी यात्राएँ",
  "nav.booking": "बुकिंग समीक्षा",
  "nav.settings": "सेटिंग्स",
  "common.loading": "लोड हो रहा है…",
  "common.error": "कुछ गलत हो गया",
  "common.retry": "पुनः प्रयास करें",
  "common.save": "परिवर्तन सहेजें",
  "common.cancel": "रद्द करें",
  "common.search": "खोजें",
  "common.submit": "जमा करें",
  "common.back": "वापस",
  "common.results": "परिणाम",
  "common.empty": "यहाँ अभी कुछ नहीं है",
  "settings.language": "भाषा",
  "settings.accessibility": "पहुँच-योग्यता",
};

const te: Dict = {
  "app.tagline": "ఏజెంటిక్ ఏఐ ట్రావెల్ కాన్సియర్జ్",
  "nav.overview": "అవలోకనం",
  "nav.dashboard": "డాష్‌బోర్డ్",
  "nav.chat": "ఏఐ ట్రావెల్ చాట్",
  "nav.search": "ట్రిప్ శోధన",
  "nav.compare": "ఐటినరీ పోలిక",
  "nav.disruptions": "ఆటంకాల నిర్వహణ",
  "nav.trips": "నా ట్రిప్‌లు",
  "nav.booking": "బుకింగ్ సమీక్ష",
  "nav.settings": "సెట్టింగ్‌లు",
  "common.loading": "లోడ్ అవుతోంది…",
  "common.error": "ఏదో తప్పు జరిగింది",
  "common.retry": "మళ్లీ ప్రయత్నించండి",
  "common.save": "మార్పులను సేవ్ చేయండి",
  "common.cancel": "రద్దు చేయండి",
  "common.search": "శోధించండి",
  "common.submit": "సమర్పించండి",
  "common.back": "వెనుకకు",
  "common.results": "ఫలితాలు",
  "common.empty": "ఇక్కడ ఇంకా ఏమీ లేదు",
  "settings.language": "భాష",
  "settings.accessibility": "ప్రాప్యత",
};

const ta: Dict = {
  "app.tagline": "ஏஜென்டிக் AI பயண கன்சியர்ஜ்",
  "nav.overview": "மேலோட்டம்",
  "nav.dashboard": "டாஷ்போர்டு",
  "nav.chat": "AI பயண உரையாடல்",
  "nav.search": "பயண தேடல்",
  "nav.compare": "பயண ஒப்பீடு",
  "nav.disruptions": "இடையூறு மேலாண்மை",
  "nav.trips": "என் பயணங்கள்",
  "nav.booking": "முன்பதிவு மதிப்பாய்வு",
  "nav.settings": "அமைப்புகள்",
  "common.loading": "ஏற்றப்படுகிறது…",
  "common.error": "ஏதோ தவறு நடந்தது",
  "common.retry": "மீண்டும் முயற்சிக்கவும்",
  "common.save": "மாற்றங்களை சேமி",
  "common.cancel": "ரத்து",
  "common.search": "தேடு",
  "common.submit": "சமர்ப்பி",
  "common.back": "பின்",
  "common.results": "முடிவுகள்",
  "common.empty": "இங்கு இன்னும் ஒன்றும் இல்லை",
  "settings.language": "மொழி",
  "settings.accessibility": "அணுகல்தன்மை",
};

const es: Dict = {
  "app.tagline": "Concierge de viajes con IA agéntica",
  "nav.overview": "Resumen",
  "nav.dashboard": "Panel",
  "nav.chat": "Chat de viajes con IA",
  "nav.search": "Buscar viaje",
  "nav.compare": "Comparar itinerarios",
  "nav.disruptions": "Gestión de incidencias",
  "nav.trips": "Mis viajes",
  "nav.booking": "Revisión de reserva",
  "nav.settings": "Configuración",
  "common.loading": "Cargando…",
  "common.error": "Algo salió mal",
  "common.retry": "Reintentar",
  "common.save": "Guardar cambios",
  "common.cancel": "Cancelar",
  "common.search": "Buscar",
  "common.submit": "Enviar",
  "common.back": "Atrás",
  "common.results": "resultados",
  "common.empty": "Aún no hay nada aquí",
  "settings.language": "Idioma",
  "settings.accessibility": "Accesibilidad",
};

const dictionaries: Record<LanguageCode, Dict> = { en, hi, te, ta, es };

export function translate(lang: LanguageCode, key: string): string {
  return dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key;
}

export function createTranslator(lang: LanguageCode) {
  return (key: string) => translate(lang, key);
}
