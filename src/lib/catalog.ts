import type { Branch, DeliverySettings, Product } from "@/types/store";

export const LOGO_URL = "https://files.catbox.moe/2wwdz9.png";

export const PHONE = "0672 81 30 64";
export const EMAIL = "Hdelectricdz@gmail.com";

export const WILAYAS = [
  "01 - أدرار",
  "02 - الشلف",
  "03 - الأغواط",
  "04 - أم البواقي",
  "05 - باتنة",
  "06 - بجاية",
  "07 - بسكرة",
  "08 - بشار",
  "09 - البليدة",
  "10 - البويرة",
  "11 - تمنراست",
  "12 - تبسة",
  "13 - تلمسان",
  "14 - تيارت",
  "15 - تيزي وزو",
  "16 - الجزائر",
  "17 - الجلفة",
  "18 - جيجل",
  "19 - سطيف",
  "20 - سعيدة",
  "21 - سكيكدة",
  "22 - سيدي بلعباس",
  "23 - عنابة",
  "24 - قالمة",
  "25 - قسنطينة",
  "26 - المدية",
  "27 - مستغانم",
  "28 - المسيلة",
  "29 - معسكر",
  "30 - ورقلة",
  "31 - وهران",
  "32 - البيض",
  "33 - إليزي",
  "34 - برج بوعريريج",
  "35 - بومرداس",
  "36 - الطارف",
  "37 - تندوف",
  "38 - تيسمسيلت",
  "39 - الوادي",
  "40 - خنشلة",
  "41 - سوق أهراس",
  "42 - تيبازة",
  "43 - ميلة",
  "44 - عين الدفلى",
  "45 - النعامة",
  "46 - عين تموشنت",
  "47 - غرداية",
  "48 - غليزان",
  "49 - تيميمون",
  "50 - برج باجي مختار",
  "51 - أولاد جلال",
  "52 - بني عباس",
  "53 - عين صالح",
  "54 - عين قزام",
  "55 - تقرت",
  "56 - جانت",
  "57 - المغير",
  "58 - المنيعة",
];

export const CATEGORIES = [
  "قواطع وحماية",
  "كابلات وأسلاك",
  "إضاءة LED",
  "مفاتيح ومقابس",
  "لوحات كهربائية",
  "أدوات وقياس",
];

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  defaultHome: 900,
  defaultOffice: 550,
  wilayaFees: {
    "16 - الجزائر": { home: 500, office: 300 },
    "31 - وهران": { home: 700, office: 450 },
    "19 - سطيف": { home: 700, office: 450 },
    "25 - قسنطينة": { home: 750, office: 500 },
  },
  updatedAt: Date.now(),
};

export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: "branch-algiers",
    name: "HD ELECTRIC DZ - المعرض الرئيسي",
    address: "الجزائر، يتم تحديث العنوان من لوحة الإدارة",
    imageUrl: LOGO_URL,
    mapUrl: "https://maps.google.com/?q=Algeria",
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
  },
];

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "breaker-schneider-63a",
    name: "قاطع حماية Schneider 63A",
    sku: "HD-BRK-63A",
    category: "قواطع وحماية",
    price: 4200,
    oldPrice: 4900,
    stock: 18,
    status: "متوفر",
    description:
      "قاطع حماية عالي الاعتمادية مناسب للوحات المنزلية والمهنية، يوفر حماية مستقرة ضد الحمولة الزائدة والقصر الكهربائي.",
    images: [
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80",
    ],
    bestseller: true,
    isNewArrival: false,
    createdAt: 1706745600000,
    updatedAt: 1706745600000,
  },
  {
    id: "led-panel-60x60",
    name: "لوحة إضاءة LED 60x60 اقتصادية",
    sku: "HD-LED-6060",
    category: "إضاءة LED",
    price: 2800,
    stock: 32,
    status: "متوفر",
    description:
      "إضاءة نظيفة وقوية للمكاتب والمحلات مع استهلاك منخفض وتصميم مسطح يعطي مظهرًا احترافيًا للمساحات الحديثة.",
    images: [
      "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=1200&q=80",
    ],
    bestseller: true,
    isNewArrival: true,
    createdAt: 1712102400000,
    updatedAt: 1712102400000,
  },
  {
    id: "copper-cable-2-5",
    name: "سلك نحاس 2.5mm² - لفة 100م",
    sku: "HD-CBL-25-100",
    category: "كابلات وأسلاك",
    price: 14500,
    stock: 9,
    status: "مخزون محدود",
    description:
      "سلك نحاسي مرن وعملي للتمديدات الكهربائية الداخلية، جودة ممتازة وعزل قوي للسلامة وطول العمر.",
    images: [
      "https://images.unsplash.com/photo-1609861517208-e5b7b4cd4b87?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1604709177225-055f99402ea3?auto=format&fit=crop&w=1200&q=80",
    ],
    bestseller: true,
    isNewArrival: false,
    createdAt: 1709251200000,
    updatedAt: 1709251200000,
  },
  {
    id: "industrial-panel-box",
    name: "علبة لوحة كهربائية صناعية IP65",
    sku: "HD-PNL-IP65",
    category: "لوحات كهربائية",
    price: 9800,
    stock: 14,
    status: "متوفر",
    description:
      "علبة لوحة قوية للمشاريع الصناعية والتجارية، مقاومة للغبار والرطوبة وتسمح بتركيب منظم وآمن للمكونات.",
    images: [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1581092335878-2d9ff86ca2bf?auto=format&fit=crop&w=1200&q=80",
    ],
    bestseller: false,
    isNewArrival: true,
    createdAt: 1717200000000,
    updatedAt: 1717200000000,
  },
  {
    id: "smart-wall-switch",
    name: "مفتاح جداري Premium ثلاثي",
    sku: "HD-SWT-TRI",
    category: "مفاتيح ومقابس",
    price: 1650,
    oldPrice: 1900,
    stock: 25,
    status: "متوفر",
    description:
      "مفتاح جداري بتصميم أنيق وحواف ناعمة، مناسب للبيوت الحديثة ويمنح لمسة فاخرة مع أداء ثابت.",
    images: [
      "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1545209463-4b25cc826a3b?auto=format&fit=crop&w=1200&q=80",
    ],
    bestseller: false,
    isNewArrival: true,
    createdAt: 1719792000000,
    updatedAt: 1719792000000,
  },
  {
    id: "digital-multimeter-pro",
    name: "جهاز قياس رقمي احترافي",
    sku: "HD-MTR-PRO",
    category: "أدوات وقياس",
    price: 5200,
    stock: 7,
    status: "مخزون محدود",
    description:
      "Multimeter دقيق للفنيين والكهربائيين، يقيس الجهد والمقاومة والاستمرارية مع شاشة واضحة وهيكل متين.",
    images: [
      "https://images.unsplash.com/photo-1581093588401-fbb62a02f120?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=1200&q=80",
    ],
    bestseller: true,
    isNewArrival: false,
    createdAt: 1714521600000,
    updatedAt: 1714521600000,
  },
];

export function formatDzd(value: number) {
  return new Intl.NumberFormat("ar-DZ", {
    style: "currency",
    currency: "DZD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function isProductPurchasable(product: Product) {
  return product.stock > 0 && product.status !== "نفذ المخزون";
}
