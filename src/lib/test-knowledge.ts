/**
 * Curated educational test knowledge, based on MedlinePlus (U.S. National
 * Library of Medicine). Educational context only — never a cause or diagnosis
 * for a specific patient's result. Client-safe (no secrets, no AI).
 */

export type Lang = "en" | "ta" | "hi";
export type L = Record<Lang, string>;
export type LList = Record<Lang, string[]>;

export type TestKnowledge = {
  id: string;
  aliases: string[];
  category: string;
  name: L;
  what_is_this_test: L;
  why_is_it_tested: L;
  below_range_possible_significance: L;
  above_range_possible_significance: L;
  below_range_common_factors: LList;
  above_range_common_factors: LList;
  related_tests: string[];
  educational_source: "MedlinePlus";
  source_url: string;
};

const HYDRATION: L = { en: "Hydration level", ta: "உடலில் நீர்ச்சத்து அளவு", hi: "शरीर में पानी की मात्रा" };
const ILLNESS: L = { en: "Recent illness or infection", ta: "சமீபத்திய உடல்நலக்குறைவு அல்லது தொற்று", hi: "हाल की बीमारी या संक्रमण" };
const MEDS: L = { en: "Some medicines", ta: "சில மருந்துகள்", hi: "कुछ दवाएँ" };
const CHRONIC: L = { en: "Some long-term health conditions", ta: "சில நீண்டகால உடல்நல நிலைகள்", hi: "कुछ लंबे समय की स्वास्थ्य स्थितियाँ" };
const NUTRITION: L = { en: "Iron or certain nutrient levels", ta: "இரும்புச்சத்து அல்லது சில ஊட்டச்சத்து அளவுகள்", hi: "आयरन या कुछ पोषक तत्वों का स्तर" };
const BLOODLOSS: L = { en: "Blood loss", ta: "இரத்த இழப்பு", hi: "खून की कमी या रक्तस्राव" };
const ALTITUDE: L = { en: "Living at higher altitude", ta: "உயரமான இடங்களில் வசிப்பது", hi: "ऊँचाई वाले स्थानों पर रहना" };
const SMOKING: L = { en: "Smoking", ta: "புகைபிடித்தல்", hi: "धूम्रपान" };
const DIET: L = { en: "Diet and recent meals", ta: "உணவுமுறை மற்றும் சமீபத்திய உணவு", hi: "खान-पान और हाल का भोजन" };
const ACTIVITY: L = { en: "Physical activity", ta: "உடல் செயல்பாடு", hi: "शारीरिक गतिविधि" };
const SUN: L = { en: "Sun exposure", ta: "சூரிய ஒளி படுதல்", hi: "धूप में रहने का समय" };
const STRESS: L = { en: "Stress or strenuous exercise", ta: "மன அழுத்தம் அல்லது கடுமையான உடற்பயிற்சி", hi: "तनाव या भारी व्यायाम" };
const TIMING: L = { en: "Time of day the sample was taken", ta: "மாதிரி எடுக்கப்பட்ட நேரம்", hi: "नमूना लेने का समय" };
const MUSCLE: L = { en: "Muscle mass", ta: "தசை அளவு", hi: "मांसपेशियों की मात्रा" };
const FAMILY: L = { en: "Family history", ta: "குடும்ப வரலாறு", hi: "पारिवारिक इतिहास" };
const PREGNANCY: L = { en: "Pregnancy", ta: "கர்ப்பம்", hi: "गर्भावस्था" };

function list(...items: L[]): LList {
  return {
    en: items.map((i) => i.en),
    ta: items.map((i) => i.ta),
    hi: items.map((i) => i.hi),
  };
}

const BELOW_GENERIC: L = {
  en: "A result below the reference range shown on the report can have several possible explanations. It is interpreted together with other results and your overall health.",
  ta: "அறிக்கையில் காட்டப்பட்ட குறிப்பு வரம்பை விடக் குறைவான முடிவுக்குப் பல சாத்தியமான விளக்கங்கள் இருக்கலாம். இது மற்ற முடிவுகள் மற்றும் உங்கள் ஒட்டுமொத்த உடல்நலத்துடன் சேர்த்துப் புரிந்துகொள்ளப்படுகிறது.",
  hi: "रिपोर्ट में दिखाई गई संदर्भ सीमा से कम परिणाम के कई संभावित कारण हो सकते हैं। इसे अन्य परिणामों और आपके समग्र स्वास्थ्य के साथ समझा जाता है।",
};
const ABOVE_GENERIC: L = {
  en: "A result above the reference range shown on the report can have several possible explanations. It is interpreted together with other results and your overall health.",
  ta: "அறிக்கையில் காட்டப்பட்ட குறிப்பு வரம்பை விட அதிகமான முடிவுக்குப் பல சாத்தியமான விளக்கங்கள் இருக்கலாம். இது மற்ற முடிவுகள் மற்றும் உங்கள் ஒட்டுமொத்த உடல்நலத்துடன் சேர்த்துப் புரிந்துகொள்ளப்படுகிறது.",
  hi: "रिपोर्ट में दिखाई गई संदर्भ सीमा से अधिक परिणाम के कई संभावित कारण हो सकते हैं। इसे अन्य परिणामों और आपके समग्र स्वास्थ्य के साथ समझा जाता है।",
};

export const TEST_KNOWLEDGE: TestKnowledge[] = [
  {
    id: "hemoglobin",
    aliases: ["hemoglobin", "haemoglobin", "hb", "hgb"],
    category: "CBC",
    name: { en: "Hemoglobin", ta: "ஹீமோகுளோபின்", hi: "हीमोग्लोबिन" },
    what_is_this_test: {
      en: "Hemoglobin is a protein in red blood cells that carries oxygen around the body.",
      ta: "ஹீமோகுளோபின் என்பது இரத்தச் சிவப்பணுக்களில் உள்ள, உடல் முழுவதும் ஆக்சிஜனைக் கொண்டு செல்லும் ஒரு புரதம்.",
      hi: "हीमोग्लोबिन लाल रक्त कोशिकाओं में पाया जाने वाला प्रोटीन है जो पूरे शरीर में ऑक्सीजन पहुँचाता है।",
    },
    why_is_it_tested: {
      en: "It is commonly measured as part of a complete blood count (CBC).",
      ta: "இது பொதுவாக முழு இரத்தப் பரிசோதனையின் (CBC) ஒரு பகுதியாக அளக்கப்படுகிறது.",
      hi: "इसे आमतौर पर कम्प्लीट ब्लड काउंट (CBC) के हिस्से के रूप में मापा जाता है।",
    },
    below_range_possible_significance: {
      en: "A lower-than-reference result can have several possible explanations. It may be seen with different forms of anemia or with blood loss, and is interpreted together with other CBC results.",
      ta: "குறிப்பு வரம்பை விடக் குறைவான முடிவுக்குப் பல சாத்தியமான விளக்கங்கள் உண்டு. இது பல்வேறு வகை இரத்தசோகை அல்லது இரத்த இழப்புடன் காணப்படலாம்; மற்ற CBC முடிவுகளுடன் சேர்த்துப் பார்க்கப்படுகிறது.",
      hi: "संदर्भ सीमा से कम परिणाम के कई संभावित कारण हो सकते हैं। यह अलग-अलग प्रकार के एनीमिया या खून की कमी में दिख सकता है, और इसे अन्य CBC परिणामों के साथ देखा जाता है।",
    },
    above_range_possible_significance: {
      en: "A higher-than-reference result can have several possible explanations, such as reduced body water or factors affecting oxygen levels.",
      ta: "குறிப்பு வரம்பை விட அதிகமான முடிவுக்கு, உடலில் நீர் குறைவு அல்லது ஆக்சிஜன் அளவைப் பாதிக்கும் காரணிகள் போன்ற பல சாத்தியமான விளக்கங்கள் உண்டு.",
      hi: "संदर्भ सीमा से अधिक परिणाम के कई संभावित कारण हो सकते हैं, जैसे शरीर में पानी की कमी या ऑक्सीजन स्तर को प्रभावित करने वाले कारक।",
    },
    below_range_common_factors: list(BLOODLOSS, NUTRITION, CHRONIC, PREGNANCY),
    above_range_common_factors: list(HYDRATION, ALTITUDE, SMOKING, CHRONIC),
    related_tests: ["Hematocrit", "RBC", "MCV", "MCH", "MCHC"],
    educational_source: "MedlinePlus",
    source_url: "https://medlineplus.gov/lab-tests/hemoglobin-test/",
  },
  {
    id: "hematocrit",
    aliases: ["hematocrit", "haematocrit", "pcv", "hct", "packed cell volume"],
    category: "CBC",
    name: { en: "Hematocrit", ta: "ஹீமாடோகிரிட்", hi: "हेमाटोक्रिट" },
    what_is_this_test: {
      en: "Hematocrit shows how much of your blood is made up of red blood cells.",
      ta: "உங்கள் இரத்தத்தில் எவ்வளவு பகுதி இரத்தச் சிவப்பணுக்களால் ஆனது என்பதை ஹீமாடோகிரிட் காட்டுகிறது.",
      hi: "हेमाटोक्रिट बताता है कि आपके खून का कितना हिस्सा लाल रक्त कोशिकाओं से बना है।",
    },
    why_is_it_tested: {
      en: "It is part of a complete blood count and is usually read together with hemoglobin.",
      ta: "இது முழு இரத்தப் பரிசோதனையின் ஒரு பகுதி; பொதுவாக ஹீமோகுளோபினுடன் சேர்த்துப் பார்க்கப்படுகிறது.",
      hi: "यह कम्प्लीट ब्लड काउंट का हिस्सा है और आमतौर पर हीमोग्लोबिन के साथ देखा जाता है।",
    },
    below_range_possible_significance: BELOW_GENERIC,
    above_range_possible_significance: ABOVE_GENERIC,
    below_range_common_factors: list(BLOODLOSS, NUTRITION, CHRONIC, PREGNANCY),
    above_range_common_factors: list(HYDRATION, ALTITUDE, SMOKING),
    related_tests: ["Hemoglobin", "RBC", "MCV"],
    educational_source: "MedlinePlus",
    source_url: "https://medlineplus.gov/lab-tests/hematocrit-test/",
  },
  {
    id: "rbc",
    aliases: ["rbc", "red blood cell", "red blood cell count", "rbc count", "erythrocyte"],
    category: "CBC",
    name: { en: "RBC count", ta: "இரத்தச் சிவப்பணு எண்ணிக்கை", hi: "लाल रक्त कोशिका गणना" },
    what_is_this_test: {
      en: "This test counts the red blood cells, which carry oxygen through the body.",
      ta: "உடலில் ஆக்சிஜனைக் கொண்டு செல்லும் இரத்தச் சிவப்பணுக்களை இந்தப் பரிசோதனை எண்ணுகிறது.",
      hi: "यह जाँच लाल रक्त कोशिकाओं की गिनती करती है, जो शरीर में ऑक्सीजन पहुँचाती हैं।",
    },
    why_is_it_tested: {
      en: "It is part of a complete blood count.",
      ta: "இது முழு இரத்தப் பரிசோதனையின் ஒரு பகுதி.",
      hi: "यह कम्प्लीट ब्लड काउंट का हिस्सा है।",
    },
    below_range_possible_significance: BELOW_GENERIC,
    above_range_possible_significance: ABOVE_GENERIC,
    below_range_common_factors: list(BLOODLOSS, NUTRITION, CHRONIC),
    above_range_common_factors: list(HYDRATION, ALTITUDE, SMOKING),
    related_tests: ["Hemoglobin", "Hematocrit", "MCV"],
    educational_source: "MedlinePlus",
    source_url: "https://medlineplus.gov/lab-tests/red-blood-cell-rbc-count/",
  },
  {
    id: "wbc",
    aliases: ["wbc", "tlc", "total leukocyte count", "white blood cell", "white blood cell count", "leukocyte"],
    category: "CBC",
    name: { en: "White blood cell count", ta: "வெள்ளை இரத்த அணு எண்ணிக்கை", hi: "श्वेत रक्त कोशिका गणना" },
    what_is_this_test: {
      en: "This test counts white blood cells, which help the body fight infections.",
      ta: "தொற்றுகளை எதிர்த்துப் போராட உடலுக்கு உதவும் வெள்ளை இரத்த அணுக்களை இந்தப் பரிசோதனை எண்ணுகிறது.",
      hi: "यह जाँच श्वेत रक्त कोशिकाओं की गिनती करती है, जो शरीर को संक्रमण से लड़ने में मदद करती हैं।",
    },
    why_is_it_tested: {
      en: "It is part of a complete blood count.",
      ta: "இது முழு இரத்தப் பரிசோதனையின் ஒரு பகுதி.",
      hi: "यह कम्प्लीट ब्लड काउंट का हिस्सा है।",
    },
    below_range_possible_significance: BELOW_GENERIC,
    above_range_possible_significance: ABOVE_GENERIC,
    below_range_common_factors: list(ILLNESS, MEDS, CHRONIC),
    above_range_common_factors: list(ILLNESS, STRESS, SMOKING, MEDS),
    related_tests: ["WBC differential", "Platelet count"],
    educational_source: "MedlinePlus",
    source_url: "https://medlineplus.gov/lab-tests/white-blood-count-wbc/",
  },
  {
    id: "platelets",
    aliases: ["platelet", "platelets", "platelet count", "plt"],
    category: "CBC",
    name: { en: "Platelet count", ta: "தட்டணு எண்ணிக்கை", hi: "प्लेटलेट गणना" },
    what_is_this_test: {
      en: "Platelets are small blood cells that help blood to clot.",
      ta: "தட்டணுக்கள் இரத்தம் உறைய உதவும் சிறிய இரத்த அணுக்கள்.",
      hi: "प्लेटलेट्स छोटी रक्त कोशिकाएँ हैं जो खून को जमने में मदद करती हैं।",
    },
    why_is_it_tested: {
      en: "It is part of a complete blood count.",
      ta: "இது முழு இரத்தப் பரிசோதனையின் ஒரு பகுதி.",
      hi: "यह कम्प्लीट ब्लड काउंट का हिस्सा है।",
    },
    below_range_possible_significance: BELOW_GENERIC,
    above_range_possible_significance: ABOVE_GENERIC,
    below_range_common_factors: list(ILLNESS, MEDS, CHRONIC),
    above_range_common_factors: list(ILLNESS, NUTRITION, CHRONIC),
    related_tests: ["Hemoglobin", "White blood cell count"],
    educational_source: "MedlinePlus",
    source_url: "https://medlineplus.gov/lab-tests/platelet-tests/",
  },
  {
    id: "vitamin_d",
    aliases: ["vitamin d", "25-oh", "25-hydroxy", "25 hydroxy", "vit d"],
    category: "Vitamins",
    name: { en: "Vitamin D", ta: "வைட்டமின் D", hi: "विटामिन D" },
    what_is_this_test: {
      en: "This test measures vitamin D in the blood. Vitamin D helps the body use calcium for healthy bones.",
      ta: "இந்தப் பரிசோதனை இரத்தத்தில் உள்ள வைட்டமின் D-ஐ அளக்கிறது. எலும்பு நலத்திற்காக உடல் கால்சியத்தைப் பயன்படுத்த வைட்டமின் D உதவுகிறது.",
      hi: "यह जाँच खून में विटामिन D को मापती है। विटामिन D हड्डियों के लिए कैल्शियम के उपयोग में मदद करता है।",
    },
    why_is_it_tested: {
      en: "It is often checked to understand bone health or vitamin D levels.",
      ta: "எலும்பு நலம் அல்லது வைட்டமின் D அளவைப் புரிந்துகொள்ள இது அடிக்கடி சோதிக்கப்படுகிறது.",
      hi: "हड्डियों के स्वास्थ्य या विटामिन D स्तर को समझने के लिए इसकी जाँच की जाती है।",
    },
    below_range_possible_significance: BELOW_GENERIC,
    above_range_possible_significance: ABOVE_GENERIC,
    below_range_common_factors: list(SUN, DIET, CHRONIC, MEDS),
    above_range_common_factors: list(MEDS, DIET),
    related_tests: ["Calcium", "Phosphorus", "PTH"],
    educational_source: "MedlinePlus",
    source_url: "https://medlineplus.gov/lab-tests/vitamin-d-test/",
  },
  {
    id: "tsh",
    aliases: ["tsh", "thyroid stimulating hormone", "thyrotropin"],
    category: "Thyroid",
    name: { en: "TSH", ta: "TSH (தைராய்டு தூண்டும் ஹார்மோன்)", hi: "TSH (थायरॉयड उत्तेजक हार्मोन)" },
    what_is_this_test: {
      en: "TSH is a hormone that tells the thyroid gland how much thyroid hormone to make.",
      ta: "TSH என்பது தைராய்டு சுரப்பி எவ்வளவு ஹார்மோன் உற்பத்தி செய்ய வேண்டும் என்று சொல்லும் ஒரு ஹார்மோன்.",
      hi: "TSH एक हार्मोन है जो थायरॉयड ग्रंथि को बताता है कि कितना थायरॉयड हार्मोन बनाना है।",
    },
    why_is_it_tested: {
      en: "It is commonly used to check how the thyroid is working.",
      ta: "தைராய்டு எவ்வாறு செயல்படுகிறது என்பதைச் சோதிக்க இது பொதுவாகப் பயன்படுகிறது.",
      hi: "थायरॉयड कैसे काम कर रहा है, यह जाँचने के लिए इसका आमतौर पर उपयोग होता है।",
    },
    below_range_possible_significance: BELOW_GENERIC,
    above_range_possible_significance: ABOVE_GENERIC,
    below_range_common_factors: list(MEDS, ILLNESS, PREGNANCY),
    above_range_common_factors: list(MEDS, ILLNESS, TIMING, PREGNANCY),
    related_tests: ["Free T4", "T3"],
    educational_source: "MedlinePlus",
    source_url: "https://medlineplus.gov/lab-tests/tsh-thyroid-stimulating-hormone-test/",
  },
  {
    id: "creatinine",
    aliases: ["creatinine", "serum creatinine", "s. creatinine"],
    category: "Kidney",
    name: { en: "Creatinine", ta: "கிரியேட்டினின்", hi: "क्रिएटिनिन" },
    what_is_this_test: {
      en: "Creatinine is a waste product from normal muscle use. The kidneys filter it out of the blood.",
      ta: "கிரியேட்டினின் என்பது தசைகள் இயல்பாகச் செயல்படும்போது உருவாகும் கழிவுப் பொருள். சிறுநீரகங்கள் இதை இரத்தத்திலிருந்து வடிகட்டுகின்றன.",
      hi: "क्रिएटिनिन मांसपेशियों के सामान्य उपयोग से बनने वाला अपशिष्ट है। गुर्दे इसे खून से छानते हैं।",
    },
    why_is_it_tested: {
      en: "It is commonly used to understand how well the kidneys are filtering.",
      ta: "சிறுநீரகங்கள் எவ்வளவு நன்றாக வடிகட்டுகின்றன என்பதைப் புரிந்துகொள்ள இது பொதுவாகப் பயன்படுகிறது.",
      hi: "गुर्दे कितनी अच्छी तरह छान रहे हैं, यह समझने के लिए इसका आमतौर पर उपयोग होता है।",
    },
    below_range_possible_significance: BELOW_GENERIC,
    above_range_possible_significance: ABOVE_GENERIC,
    below_range_common_factors: list(MUSCLE, PREGNANCY, DIET),
    above_range_common_factors: list(HYDRATION, MUSCLE, MEDS, ACTIVITY),
    related_tests: ["BUN", "eGFR", "Urea"],
    educational_source: "MedlinePlus",
    source_url: "https://medlineplus.gov/lab-tests/creatinine-test/",
  },
  {
    id: "glucose",
    aliases: ["glucose", "blood sugar", "fasting blood sugar", "fbs", "rbs", "ppbs", "blood glucose"],
    category: "Metabolic",
    name: { en: "Blood glucose", ta: "இரத்தச் சர்க்கரை", hi: "ब्लड ग्लूकोज़" },
    what_is_this_test: {
      en: "This test measures the amount of sugar (glucose) in the blood, the body's main source of energy.",
      ta: "உடலின் முக்கிய ஆற்றல் மூலமான இரத்தச் சர்க்கரையின் (குளுக்கோஸ்) அளவை இந்தப் பரிசோதனை அளக்கிறது.",
      hi: "यह जाँच खून में शुगर (ग्लूकोज़) की मात्रा मापती है, जो शरीर की ऊर्जा का मुख्य स्रोत है।",
    },
    why_is_it_tested: {
      en: "It is commonly used to check blood sugar levels.",
      ta: "இரத்தச் சர்க்கரை அளவைச் சோதிக்க இது பொதுவாகப் பயன்படுகிறது.",
      hi: "ब्लड शुगर स्तर जाँचने के लिए इसका आमतौर पर उपयोग होता है।",
    },
    below_range_possible_significance: BELOW_GENERIC,
    above_range_possible_significance: ABOVE_GENERIC,
    below_range_common_factors: list(DIET, ACTIVITY, MEDS),
    above_range_common_factors: list(DIET, TIMING, STRESS, MEDS, ILLNESS),
    related_tests: ["HbA1c"],
    educational_source: "MedlinePlus",
    source_url: "https://medlineplus.gov/lab-tests/blood-glucose-test/",
  },
  {
    id: "ldl",
    aliases: ["ldl", "ldl cholesterol", "ldl-c", "low density lipoprotein"],
    category: "Lipids",
    name: { en: "LDL cholesterol", ta: "LDL கொழுப்பு", hi: "LDL कोलेस्ट्रॉल" },
    what_is_this_test: {
      en: "LDL is one type of cholesterol carried in the blood.",
      ta: "LDL என்பது இரத்தத்தில் கொண்டு செல்லப்படும் ஒரு வகைக் கொழுப்பு.",
      hi: "LDL खून में मौजूद कोलेस्ट्रॉल का एक प्रकार है।",
    },
    why_is_it_tested: {
      en: "It is part of a lipid profile (cholesterol test).",
      ta: "இது கொழுப்புப் பரிசோதனையின் (லிப்பிட் ப்ரொஃபைல்) ஒரு பகுதி.",
      hi: "यह लिपिड प्रोफ़ाइल (कोलेस्ट्रॉल जाँच) का हिस्सा है।",
    },
    below_range_possible_significance: BELOW_GENERIC,
    above_range_possible_significance: ABOVE_GENERIC,
    below_range_common_factors: list(DIET, MEDS, CHRONIC),
    above_range_common_factors: list(DIET, ACTIVITY, FAMILY, SMOKING, MEDS),
    related_tests: ["HDL cholesterol", "Total cholesterol", "Triglycerides"],
    educational_source: "MedlinePlus",
    source_url: "https://medlineplus.gov/lab-tests/cholesterol-levels/",
  },
];

const norm = (s: string) => s.toLowerCase().replace(/[()]/g, " ").replace(/\s+/g, " ").trim();

/** Finds curated knowledge for a report test name; null when unsupported. */
export function findKnowledge(testName: string | null | undefined): TestKnowledge | null {
  if (!testName) return null;
  const n = norm(testName);
  const words = new Set(n.split(/[\s/,-]+/));
  for (const k of TEST_KNOWLEDGE) {
    for (const a of k.aliases) {
      if (n === a || (a.length <= 4 ? words.has(a) : n.includes(a))) return k;
    }
  }
  return null;
}

/** Display name: localized name with the English report name kept alongside. */
export function displayTestName(testName: string, lang: string): string {
  const k = findKnowledge(testName);
  if (!k || lang === "en") return testName;
  const local = k.name[lang as Lang];
  if (!local) return testName;
  return local.includes(testName) ? local : `${local} (${testName})`;
}
