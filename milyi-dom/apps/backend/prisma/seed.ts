import { PrismaClient, BookingStatus, ListingStatus, NotificationType } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build an Unsplash CDN URL — no server storage required */
const U = (photoId: string, w = 800) =>
  `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${w}&q=80`;

// ---------------------------------------------------------------------------
// Amenities
// ---------------------------------------------------------------------------

const amenitiesData = [
  { name: 'Wi-Fi', icon: 'wifi', category: 'Comfort' },
  { name: 'Кухня', icon: 'kitchen', category: 'Essentials' },
  { name: 'Стиральная машина', icon: 'local_laundry_service', category: 'Essentials' },
  { name: 'Кондиционер', icon: 'ac_unit', category: 'Comfort' },
  { name: 'Отопление', icon: 'thermostat', category: 'Comfort' },
  { name: 'Рабочее место', icon: 'chair', category: 'Business' },
  { name: 'Парковка', icon: 'local_parking', category: 'Travel' },
  { name: 'Бассейн', icon: 'pool', category: 'Lifestyle' },
  { name: 'Джакузи', icon: 'hot_tub', category: 'Lifestyle' },
  { name: 'Камин', icon: 'fireplace', category: 'Comfort' },
  { name: 'Балкон', icon: 'balcony', category: 'Comfort' },
  { name: 'Телевизор', icon: 'tv', category: 'Comfort' },
  { name: 'Лифт', icon: 'elevator', category: 'Travel' },
  { name: 'Детская кроватка', icon: 'crib', category: 'Family' },
];

// ---------------------------------------------------------------------------
// Seed users
// ---------------------------------------------------------------------------

export const SEED_USER_EMAILS = [
  'host@example.com',
  'host2@example.com',
  'guest@example.com',
  'admin@example.com',
];

async function seedUsers(password: string) {
  const [host, host2, guest, admin] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'host@example.com' },
      update: {},
      create: {
        email: 'host@example.com',
        phone: '+79000000001',
        password,
        role: 'HOST',
        isVerified: true,
        isSuperhost: true,
        lastActiveAt: new Date(),
        profile: {
          create: {
            firstName: 'Елена',
            lastName: 'Морозова',
            bio: 'Дизайн-ориентированный хост. Сдаю уютные апартаменты в Москве и Питере.',
            languages: ['Русский', 'English'],
            verified: true,
            responseRate: 0.97,
            responseTimeMinutes: 25,
          },
        },
      },
      include: { profile: true },
    }),
    prisma.user.upsert({
      where: { email: 'host2@example.com' },
      update: {},
      create: {
        email: 'host2@example.com',
        phone: '+79000000004',
        password,
        role: 'HOST',
        isVerified: true,
        isSuperhost: true,
        lastActiveAt: new Date(),
        profile: {
          create: {
            firstName: 'Наталья',
            lastName: 'Сорокина',
            bio: 'Хозяйка апартаментов в Сочи и Казани. Всегда на связи.',
            languages: ['Русский'],
            verified: true,
            responseRate: 0.94,
            responseTimeMinutes: 40,
          },
        },
      },
      include: { profile: true },
    }),
    prisma.user.upsert({
      where: { email: 'guest@example.com' },
      update: {},
      create: {
        email: 'guest@example.com',
        phone: '+79000000002',
        password,
        role: 'GUEST',
        isVerified: true,
        lastActiveAt: new Date(),
        profile: {
          create: {
            firstName: 'Сергей',
            lastName: 'Иванов',
            bio: 'Продакт-менеджер. Путешествую по России и миру.',
            languages: ['Русский', 'English'],
            verified: true,
          },
        },
      },
      include: { profile: true },
    }),
    prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        phone: '+79000000003',
        password,
        role: 'ADMIN',
        isVerified: true,
        lastActiveAt: new Date(),
        profile: {
          create: {
            firstName: 'Максим',
            lastName: 'Петров',
            bio: 'Администратор платформы.',
            languages: ['Русский', 'English'],
            verified: true,
          },
        },
      },
      include: { profile: true },
    }),
  ]);

  return { host, host2, guest, admin };
}

// ---------------------------------------------------------------------------
// Listing definitions
// ---------------------------------------------------------------------------

type SeedListing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  summary: string;
  propertyType: string;
  guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  basePrice: number;
  cleaningFee?: number;
  instantBook?: boolean;
  featured?: boolean;
  checkInFrom?: number;
  checkOutUntil?: number;
  minNights?: number;
  rating: number;
  reviewCount: number;
  addressLine1: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  amenityNames: string[];
  imageUrls: Array<{ url: string; description?: string; isPrimary?: boolean }>;
};

// All 15 seed listings — images served from Unsplash CDN
const listingsToSeed: SeedListing[] = [
  // ── МОСКВА ────────────────────────────────────────────────────────────────
  {
    id: 'seed_msk_loft',
    slug: 'loft-u-patriarshikh',
    title: 'Лофт у Патриарших прудов',
    description:
      'Светлый двухуровневый лофт в историческом центре Москвы. Дизайнерская мебель, ' +
      'умный климат-контроль, открытая планировка и балкон с видом на тихий бульвар.',
    summary: 'Дизайнерский лофт в 5 минутах от Патриарших прудов.',
    propertyType: 'apartment',
    guests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    basePrice: 4900,
    cleaningFee: 900,
    instantBook: true,
    featured: true,
    checkInFrom: 14,
    checkOutUntil: 12,
    minNights: 2,
    rating: 4.95,
    reviewCount: 38,
    addressLine1: 'ул. Спиридоновка, 12',
    city: 'Москва',
    country: 'Россия',
    latitude: 55.7616,
    longitude: 37.5942,
    amenityNames: ['Wi-Fi', 'Кухня', 'Стиральная машина', 'Кондиционер', 'Камин', 'Рабочее место'],
    imageUrls: [
      { url: U('1560448204-e02f11c3d0e2'), description: 'Гостиная с открытой планировкой', isPrimary: true },
      { url: U('1555041469-a586c61ea9bc'), description: 'Спальня с кроватью king-size' },
      { url: U('1556909114-f6e7ad7d3136'), description: 'Кухня в стиле лофт' },
    ],
  },
  {
    id: 'seed_msk_city',
    slug: 'studiya-moskva-siti',
    title: 'Студия в Москва-Сити с панорамным видом',
    description:
      'Стильная студия на 42 этаже башни Москва-Сити. Панорамные окна от пола до потолка, ' +
      'вид на ночной город, дизайнерский интерьер, кухня со всей техникой.',
    summary: 'Апарт на небоскрёбе — вид на весь город.',
    propertyType: 'studio',
    guests: 2,
    bedrooms: 0,
    beds: 1,
    bathrooms: 1,
    basePrice: 5200,
    cleaningFee: 700,
    instantBook: true,
    featured: true,
    checkInFrom: 15,
    checkOutUntil: 12,
    minNights: 1,
    rating: 4.88,
    reviewCount: 61,
    addressLine1: 'Пресненская наб., 6',
    city: 'Москва',
    country: 'Россия',
    latitude: 55.7495,
    longitude: 37.5396,
    amenityNames: ['Wi-Fi', 'Кухня', 'Кондиционер', 'Рабочее место', 'Телевизор', 'Лифт'],
    imageUrls: [
      { url: U('1512917774080-9991f1c4c750'), description: 'Вид на ночную Москву', isPrimary: true },
      { url: U('1502672260266-1c1ef2d93688'), description: 'Интерьер студии' },
      { url: U('1552321554-5fefe8c9ef14'), description: 'Ванная комната' },
    ],
  },
  {
    id: 'seed_msk_house',
    slug: 'dom-serebryanyi-bor',
    title: 'Дом с баней в Серебряном Бору',
    description:
      'Просторный загородный дом на берегу Москвы-реки. Русская баня, большой сад, ' +
      'барбекю зона, 4 спальни. Идеально для семьи или компании до 8 человек.',
    summary: 'Загородный дом с баней, садом и рекой.',
    propertyType: 'house',
    guests: 8,
    bedrooms: 4,
    beds: 5,
    bathrooms: 2,
    basePrice: 12000,
    cleaningFee: 2000,
    instantBook: false,
    featured: false,
    checkInFrom: 15,
    checkOutUntil: 13,
    minNights: 2,
    rating: 4.79,
    reviewCount: 22,
    addressLine1: 'Берёзовая аллея, 3',
    city: 'Москва',
    country: 'Россия',
    latitude: 55.7891,
    longitude: 37.4012,
    amenityNames: ['Wi-Fi', 'Кухня', 'Парковка', 'Камин', 'Балкон', 'Телевизор'],
    imageUrls: [
      { url: U('1564013799919-ab600027ffc6'), description: 'Дом с садом', isPrimary: true },
      { url: U('1540518614846-7eded433c457'), description: 'Уютная спальня' },
      { url: U('1565183928294-7a69de1e7f9c'), description: 'Кухня-гостиная' },
    ],
  },

  // ── САНКТ-ПЕТЕРБУРГ ───────────────────────────────────────────────────────
  {
    id: 'seed_spb_nevsky',
    slug: 'art-deco-nevskiy',
    title: 'Art Deco квартира на Невском',
    description:
      'Элегантная однокомнатная квартира с видом на главный проспект города. ' +
      'Восстановленный паркет, авторское искусство, премиальное постельное бельё.',
    summary: 'Винтажная атмосфера в самом центре Петербурга.',
    propertyType: 'apartment',
    guests: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    basePrice: 3600,
    cleaningFee: 700,
    instantBook: false,
    featured: true,
    checkInFrom: 15,
    checkOutUntil: 11,
    minNights: 1,
    rating: 4.82,
    reviewCount: 19,
    addressLine1: 'Невский пр., 56',
    city: 'Санкт-Петербург',
    country: 'Россия',
    latitude: 59.9343,
    longitude: 30.3351,
    amenityNames: ['Wi-Fi', 'Кухня', 'Отопление', 'Рабочее место'],
    imageUrls: [
      { url: U('1497366216548-37526070297c'), description: 'Гостиная с авторским декором', isPrimary: true },
      { url: U('1631049307264-da0ec9d70304'), description: 'Спальня с кроватью queen' },
      { url: U('1551836022-deb4988cc6c0'), description: 'Рабочий уголок' },
    ],
  },
  {
    id: 'seed_spb_penthouse',
    slug: 'pentkhaus-isaakiy',
    title: 'Пентхаус с видом на Исаакиевский собор',
    description:
      'Эксклюзивный пентхаус на 9 этаже в 200 метрах от Исаакиевского собора. ' +
      'Терраса 30 м², две спальни, дизайнерская кухня, панорамный вид на исторический центр.',
    summary: 'Самый впечатляющий вид в Петербурге.',
    propertyType: 'apartment',
    guests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 2,
    basePrice: 8500,
    cleaningFee: 1500,
    instantBook: false,
    featured: true,
    checkInFrom: 14,
    checkOutUntil: 12,
    minNights: 2,
    rating: 4.97,
    reviewCount: 14,
    addressLine1: 'Переулок Антоненко, 5',
    city: 'Санкт-Петербург',
    country: 'Россия',
    latitude: 59.9318,
    longitude: 30.3096,
    amenityNames: ['Wi-Fi', 'Кухня', 'Кондиционер', 'Балкон', 'Телевизор', 'Лифт'],
    imageUrls: [
      { url: U('1493809842364-78817add7ffb'), description: 'Гостиная пентхауса', isPrimary: true },
      { url: U('1507089947277-086d2a9e2e33'), description: 'Терраса с видом на собор' },
      { url: U('1555041469-a586c61ea9bc'), description: 'Основная спальня' },
    ],
  },
  {
    id: 'seed_spb_loft',
    slug: 'loft-vasilevskiy',
    title: 'Лофт на Васильевском острове',
    description:
      'Просторный лофт в бывшем заводском здании на Васильевском острове. Кирпичные стены, ' +
      'высокие потолки 4 м, студия художника, панорамные окна. Шаговая доступность от метро.',
    summary: 'Творческий лофт с характером в 10 минутах от Эрмитажа.',
    propertyType: 'loft',
    guests: 3,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    basePrice: 4200,
    cleaningFee: 800,
    instantBook: true,
    featured: false,
    checkInFrom: 14,
    checkOutUntil: 12,
    minNights: 2,
    rating: 4.71,
    reviewCount: 27,
    addressLine1: '7-я линия В.О., 34',
    city: 'Санкт-Петербург',
    country: 'Россия',
    latitude: 59.9421,
    longitude: 30.2815,
    amenityNames: ['Wi-Fi', 'Кухня', 'Стиральная машина', 'Отопление', 'Рабочее место'],
    imageUrls: [
      { url: U('1536376072261-38c75010e6c9'), description: 'Лофт с открытой планировкой', isPrimary: true },
      { url: U('1556909172-54557c7e4fb7'), description: 'Кухонная зона' },
      { url: U('1552321554-5fefe8c9ef14'), description: 'Ванная комната' },
    ],
  },

  // ── СОЧИ ─────────────────────────────────────────────────────────────────
  {
    id: 'seed_sochi_sea',
    slug: 'apart-vid-na-more-sochi',
    title: 'Апартаменты с видом на Чёрное море',
    description:
      'Светлые апартаменты в 5 минутах ходьбы от пляжа. Балкон с морской панорамой, ' +
      'современная кухня, кондиционер, парковочное место. Уютный двор с зеленью.',
    summary: 'Море — рукой подать. Балкон с панорамой.',
    propertyType: 'apartment',
    guests: 4,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    basePrice: 5500,
    cleaningFee: 1000,
    instantBook: true,
    featured: true,
    checkInFrom: 14,
    checkOutUntil: 12,
    minNights: 3,
    rating: 4.84,
    reviewCount: 43,
    addressLine1: 'ул. Конституции, 8',
    city: 'Сочи',
    country: 'Россия',
    latitude: 43.5992,
    longitude: 39.7257,
    amenityNames: ['Wi-Fi', 'Кухня', 'Кондиционер', 'Балкон', 'Парковка', 'Телевизор'],
    imageUrls: [
      { url: U('1499793983690-e29da59ef1c2'), description: 'Балкон с видом на море', isPrimary: true },
      { url: U('1497366216548-37526070297c'), description: 'Гостиная' },
      { url: U('1556909114-f6e7ad7d3136'), description: 'Кухня' },
    ],
  },
  {
    id: 'seed_sochi_villa',
    slug: 'villa-bassein-krasnaya-polyana',
    title: 'Вилла с бассейном в Красной Поляне',
    description:
      'Роскошная вилла в горах Красной Поляны. Открытый бассейн с подогревом, ' +
      'сауна, горный вид, 3 спальни, полностью оборудованная кухня. ' +
      'Зимой — лыжи в 10 минутах, летом — пешие маршруты прямо от дома.',
    summary: 'Горная вилла с бассейном: зима и лето.',
    propertyType: 'villa',
    guests: 6,
    bedrooms: 3,
    beds: 4,
    bathrooms: 2,
    basePrice: 18000,
    cleaningFee: 3000,
    instantBook: false,
    featured: true,
    checkInFrom: 15,
    checkOutUntil: 13,
    minNights: 3,
    rating: 4.93,
    reviewCount: 31,
    addressLine1: 'ул. Горная, 21',
    city: 'Красная Поляна',
    country: 'Россия',
    latitude: 43.6779,
    longitude: 40.2095,
    amenityNames: ['Wi-Fi', 'Кухня', 'Бассейн', 'Джакузи', 'Парковка', 'Камин', 'Балкон'],
    imageUrls: [
      { url: U('1583608205776-bfd35f0d9f83'), description: 'Вилла с бассейном', isPrimary: true },
      { url: U('1476514525535-07fb3b4ae5f1'), description: 'Горный вид с террасы' },
      { url: U('1540518614846-7eded433c457'), description: 'Основная спальня' },
    ],
  },

  // ── КАЗАНЬ ────────────────────────────────────────────────────────────────
  {
    id: 'seed_kazan_kreml',
    slug: 'studiya-ryadom-s-kremlom',
    title: 'Студия у Казанского Кремля',
    description:
      'Уютная студия в 3 минутах ходьбы от Казанского Кремля. Светлый интерьер, ' +
      'качественная мебель, все необходимое для комфортного проживания.',
    summary: 'Лучшее расположение в Казани — у стен Кремля.',
    propertyType: 'studio',
    guests: 2,
    bedrooms: 0,
    beds: 1,
    bathrooms: 1,
    basePrice: 2800,
    cleaningFee: 500,
    instantBook: true,
    featured: false,
    checkInFrom: 14,
    checkOutUntil: 12,
    minNights: 1,
    rating: 4.73,
    reviewCount: 52,
    addressLine1: 'ул. Баумана, 15',
    city: 'Казань',
    country: 'Россия',
    latitude: 55.7969,
    longitude: 49.1057,
    amenityNames: ['Wi-Fi', 'Кухня', 'Кондиционер', 'Телевизор', 'Лифт'],
    imageUrls: [
      { url: U('1502672260266-1c1ef2d93688'), description: 'Интерьер студии', isPrimary: true },
      { url: U('1631049307264-da0ec9d70304'), description: 'Спальная зона' },
      { url: U('1552321554-5fefe8c9ef14'), description: 'Ванная' },
    ],
  },
  {
    id: 'seed_kazan_river',
    slug: 'apart-naberezhnaya-kazan',
    title: 'Апартаменты на набережной Казанки',
    description:
      'Современные апартаменты с прямым выходом к набережной реки Казанки. ' +
      'Вид на мечеть Кул-Шариф, две спальни, просторная кухня-гостиная.',
    summary: 'Вид на мечеть и реку прямо из окна.',
    propertyType: 'apartment',
    guests: 5,
    bedrooms: 2,
    beds: 3,
    bathrooms: 1,
    basePrice: 4500,
    cleaningFee: 900,
    instantBook: false,
    featured: false,
    checkInFrom: 14,
    checkOutUntil: 12,
    minNights: 2,
    rating: 4.81,
    reviewCount: 17,
    addressLine1: 'ул. Кремлёвская, 3',
    city: 'Казань',
    country: 'Россия',
    latitude: 55.8004,
    longitude: 49.0984,
    amenityNames: ['Wi-Fi', 'Кухня', 'Стиральная машина', 'Кондиционер', 'Балкон', 'Телевизор'],
    imageUrls: [
      { url: U('1580587771525-4f3f51f17c39'), description: 'Набережная, вид из окна', isPrimary: true },
      { url: U('1560448204-e02f11c3d0e2'), description: 'Просторная гостиная' },
      { url: U('1555041469-a586c61ea9bc'), description: 'Спальня' },
    ],
  },

  // ── ЗАРУБЕЖЬЕ ─────────────────────────────────────────────────────────────
  {
    id: 'seed_tbilisi_old',
    slug: 'kvartira-stariy-tbilisi',
    title: 'Квартира в историческом Тбилиси',
    description:
      'Аутентичная квартира в Старом Тбилиси: деревянные балконы, резные ставни, ' +
      'вид на Нарикалу. Рядом термальные бани, рестораны грузинской кухни и винные бары.',
    summary: 'Дух старого Тбилиси — балкон с видом на Нарикалу.',
    propertyType: 'apartment',
    guests: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    basePrice: 2500,
    cleaningFee: 500,
    instantBook: true,
    featured: true,
    checkInFrom: 14,
    checkOutUntil: 12,
    minNights: 2,
    rating: 4.9,
    reviewCount: 76,
    addressLine1: 'ул. Котэ Афхази, 18',
    city: 'Тбилиси',
    country: 'Грузия',
    latitude: 41.6877,
    longitude: 44.8124,
    amenityNames: ['Wi-Fi', 'Кухня', 'Балкон', 'Отопление'],
    imageUrls: [
      { url: U('1579033461380-b1d5dbf39a77'), description: 'Вид на исторический квартал', isPrimary: true },
      { url: U('1497366216548-37526070297c'), description: 'Гостиная' },
      { url: U('1507089947277-086d2a9e2e33'), description: 'Балкон с видом на Нарикалу' },
    ],
  },
  {
    id: 'seed_yerevan_ararat',
    slug: 'apart-ararat-yerevan',
    title: 'Апарт с видом на гору Арарат',
    description:
      'Светлые апартаменты с прямым видом на Арарат из панорамных окон. ' +
      'В центре Еревана, рядом с площадью Республики. Кофе и завтрак включены.',
    summary: 'Просыпаться с видом на Арарат — незабываемо.',
    propertyType: 'apartment',
    guests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    basePrice: 2200,
    cleaningFee: 400,
    instantBook: true,
    featured: false,
    checkInFrom: 14,
    checkOutUntil: 11,
    minNights: 2,
    rating: 4.86,
    reviewCount: 34,
    addressLine1: 'ул. Аблояна, 7',
    city: 'Ереван',
    country: 'Армения',
    latitude: 40.1872,
    longitude: 44.5152,
    amenityNames: ['Wi-Fi', 'Кухня', 'Кондиционер', 'Телевизор'],
    imageUrls: [
      { url: U('1476514525535-07fb3b4ae5f1'), description: 'Вид на Арарат из окна', isPrimary: true },
      { url: U('1560448204-e02f11c3d0e2'), description: 'Гостиная' },
      { url: U('1552321554-5fefe8c9ef14'), description: 'Ванная' },
    ],
  },

  // ── ДРУГИЕ ГОРОДА ────────────────────────────────────────────────────────
  {
    id: 'seed_ekb_design',
    slug: 'design-apart-ekaterinburg',
    title: 'Дизайн-апартаменты в центре Екатеринбурга',
    description:
      'Стильные апартаменты с авторским дизайном в самом центре Екатеринбурга. ' +
      'Кухня, рабочая зона с монитором, скоростной интернет. Идеально для командировок.',
    summary: 'Для деловых поездок: дизайн + продуктивность.',
    propertyType: 'apartment',
    guests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    basePrice: 3200,
    cleaningFee: 600,
    instantBook: true,
    featured: false,
    checkInFrom: 15,
    checkOutUntil: 12,
    minNights: 1,
    rating: 4.77,
    reviewCount: 28,
    addressLine1: 'ул. Ленина, 24',
    city: 'Екатеринбург',
    country: 'Россия',
    latitude: 56.8389,
    longitude: 60.6057,
    amenityNames: ['Wi-Fi', 'Кухня', 'Кондиционер', 'Рабочее место', 'Телевизор', 'Лифт'],
    imageUrls: [
      { url: U('1493809842364-78817add7ffb'), description: 'Дизайнерская гостиная', isPrimary: true },
      { url: U('1551836022-deb4988cc6c0'), description: 'Рабочее место с монитором' },
      { url: U('1556909114-f6e7ad7d3136'), description: 'Кухня' },
    ],
  },
  {
    id: 'seed_kld_baltic',
    slug: 'dom-baltika-kaliningrad',
    title: 'Дом у Балтийского моря',
    description:
      'Уютный деревянный дом в 300 метрах от Балтийского пляжа в Светлогорске. ' +
      'Просторная веранда, мангал, 2 спальни, детская площадка во дворе. ' +
      'Сосновый воздух и янтарное побережье.',
    summary: 'Балтийское море, сосны, янтарный берег.',
    propertyType: 'house',
    guests: 5,
    bedrooms: 2,
    beds: 3,
    bathrooms: 1,
    basePrice: 6500,
    cleaningFee: 1200,
    instantBook: false,
    featured: false,
    checkInFrom: 14,
    checkOutUntil: 12,
    minNights: 3,
    rating: 4.83,
    reviewCount: 19,
    addressLine1: 'ул. Лесная, 12',
    city: 'Светлогорск',
    country: 'Россия',
    latitude: 54.9467,
    longitude: 20.158,
    amenityNames: ['Wi-Fi', 'Кухня', 'Парковка', 'Балкон', 'Телевизор'],
    imageUrls: [
      { url: U('1600596542815-ffad4c1539a9'), description: 'Дом в соснах', isPrimary: true },
      { url: U('1507089947277-086d2a9e2e33'), description: 'Веранда' },
      { url: U('1540518614846-7eded433c457'), description: 'Спальня' },
    ],
  },
  {
    id: 'seed_belgrade_central',
    slug: 'apart-beograd-centar',
    title: 'Апартаменты в центре Белграда',
    description:
      'Современные апартаменты в историческом центре Белграда, в квартале Савамала. ' +
      'Рядом лучшие рестораны, галереи и набережная. Удобный хаб для путешествий по Балканам.',
    summary: 'Белград — сердце Балкан, квартал Савамала.',
    propertyType: 'apartment',
    guests: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    basePrice: 2900,
    cleaningFee: 500,
    instantBook: true,
    featured: false,
    checkInFrom: 14,
    checkOutUntil: 11,
    minNights: 2,
    rating: 4.74,
    reviewCount: 45,
    addressLine1: 'Karadjordjeva 56',
    city: 'Белград',
    country: 'Сербия',
    latitude: 44.8176,
    longitude: 20.4569,
    amenityNames: ['Wi-Fi', 'Кухня', 'Кондиционер', 'Рабочее место', 'Телевизор'],
    imageUrls: [
      { url: U('1560472354-b33ff0ad4a3b'), description: 'Гостиная', isPrimary: true },
      { url: U('1631049307264-da0ec9d70304'), description: 'Спальня' },
      { url: U('1556909172-54557c7e4fb7'), description: 'Кухня' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Amenities
// ---------------------------------------------------------------------------

async function seedAmenities() {
  await prisma.amenity.createMany({ data: amenitiesData, skipDuplicates: true });
  const amenities = await prisma.amenity.findMany({
    where: { name: { in: amenitiesData.map((a) => a.name) } },
  });
  const map = new Map(amenities.map((a) => [a.name, a.id]));
  return (name: string) => map.get(name);
}

// ---------------------------------------------------------------------------
// Listings (idempotent)
// ---------------------------------------------------------------------------

async function seedListings(
  hostId: string,
  host2Id: string,
  amenityIdByName: (name: string) => number | undefined,
) {
  const created: string[] = [];

  for (const [index, def] of listingsToSeed.entries()) {
    const existing = await prisma.listing.findUnique({ where: { id: def.id } });
    if (existing) {
      console.log(`  ↳ skip ${def.id} (already exists)`);
      continue;
    }

    // Alternate listings between the two hosts
    const currentHostId = index % 3 === 2 ? host2Id : hostId;

    const listing = await prisma.listing.create({
      data: {
        id: def.id,
        slug: def.slug,
        title: def.title,
        description: def.description,
        summary: def.summary,
        propertyType: def.propertyType,
        hostId: currentHostId,
        guests: def.guests,
        bedrooms: def.bedrooms,
        beds: def.beds,
        bathrooms: def.bathrooms,
        basePrice: def.basePrice,
        cleaningFee: def.cleaningFee,
        instantBook: def.instantBook ?? false,
        featured: def.featured ?? false,
        checkInFrom: def.checkInFrom,
        checkOutUntil: def.checkOutUntil,
        minNights: def.minNights,
        rating: def.rating,
        reviewCount: def.reviewCount,
        status: ListingStatus.PUBLISHED,
        addressLine1: def.addressLine1,
        city: def.city,
        country: def.country,
        latitude: def.latitude,
        longitude: def.longitude,
        amenities: {
          create: def.amenityNames
            .map((name) => amenityIdByName(name))
            .filter((id): id is number => typeof id === 'number')
            .map((id) => ({ amenityId: id })),
        },
        images: {
          create: def.imageUrls.map((img, i) => ({
            url: img.url,
            description: img.description,
            position: i,
            isPrimary: img.isPrimary ?? i === 0,
          })),
        },
      },
    });

    // Set PostGIS geography column
    await prisma.$executeRawUnsafe(
      `UPDATE "Listing" SET "location" = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
      def.longitude,
      def.latitude,
      listing.id,
    );

    created.push(listing.id);
    console.log(`  ✓ ${def.id} — ${def.title}`);
  }

  return created;
}

// ---------------------------------------------------------------------------
// Bookings & reviews (idempotent)
// ---------------------------------------------------------------------------

async function seedBookingsAndReviews(guestId: string) {
  const reviewTargets = [
    'seed_msk_loft',
    'seed_spb_nevsky',
    'seed_tbilisi_old',
    'seed_sochi_sea',
    'seed_msk_city',
  ];

  for (const listingId of reviewTargets) {
    const alreadyHasBooking = await prisma.booking.findFirst({
      where: { listingId, guestId },
    });
    if (alreadyHasBooking) continue;

    const checkIn = new Date();
    checkIn.setMonth(checkIn.getMonth() - 1);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkIn.getDate() + 3);

    const booking = await prisma.booking.create({
      data: {
        listingId,
        guestId,
        checkIn,
        checkOut,
        status: BookingStatus.CONFIRMED,
        adults: 2,
        children: 0,
        totalPrice: 15850,
        currency: 'RUB',
      },
    });

    const listing = listingsToSeed.find((l) => l.id === listingId)!;
    await prisma.review.create({
      data: {
        rating: listing.rating,
        comment: reviewComments[listingId] ?? 'Отличное жильё, всё соответствует описанию.',
        listingId,
        bookingId: booking.id,
        authorId: guestId,
        cleanliness: 5,
        communication: 5,
        checkIn: 5,
        accuracy: 5,
        location: 5,
        value: 4,
        isPublic: true,
        isFeatured: true,
      },
    });
  }
}

const reviewComments: Record<string, string> = {
  seed_msk_loft: 'Потрясающий лофт! Атмосфера, дизайн, расположение — всё на высшем уровне. Елена ответила мгновенно, заселение прошло гладко.',
  seed_spb_nevsky: 'Видовая квартира в самом центре. Паркет скрипит как в настоящем петербургском доме — это часть шарма. Обязательно вернусь!',
  seed_tbilisi_old: 'Лучший адрес в Тбилиси для тех, кто ценит атмосферу. Балкон с видом на Нарикалу — магия. Хозяйка — золото.',
  seed_sochi_sea: 'Море в пяти минутах, балкон со звуком волн, чистота идеальная. Наталья всегда на связи. Рекомендую на 100%.',
  seed_msk_city: 'Сити во всей красе. Вид вечером — незабываемый. Всё продумано до мелочей.',
};

// ---------------------------------------------------------------------------
// Notifications (idempotent)
// ---------------------------------------------------------------------------

async function seedNotifications(hostId: string, guestId: string) {
  const count = await prisma.notification.count({ where: { userId: hostId } });
  if (count > 0) return;

  await prisma.notification.createMany({
    data: [
      {
        userId: hostId,
        type: NotificationType.NEW_REVIEW,
        title: 'Новый отзыв',
        body: 'Гость оставил 5-звёздочный отзыв о вашем объявлении.',
        data: { listingId: 'seed_msk_loft' },
      },
      {
        userId: guestId,
        type: NotificationType.BOOKING_CONFIRMATION,
        title: 'Бронирование подтверждено',
        body: 'Ваше бронирование в «Лофт у Патриарших прудов» подтверждено.',
        data: { listingId: 'seed_msk_loft' },
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n🌱  Seeding "Милый Дом" database...\n');

  const amenityIdByName = await seedAmenities();
  console.log('✓ Amenities ready');

  const password = await hash('password123', 12);
  const { host, host2, guest } = await seedUsers(password);
  console.log('✓ Seed users ready (host / host2 / guest / admin)');

  console.log('\nCreating listings:');
  await seedListings(host.id, host2.id, amenityIdByName);

  await seedBookingsAndReviews(guest.id);
  console.log('✓ Sample bookings & reviews added');

  await seedNotifications(host.id, guest.id);
  console.log('✓ Sample notifications added');

  console.log('\n✅  Seed completed.\n');
  console.log('  Credentials (password: password123):');
  console.log('  host@example.com  — HOST (Суперхост, Елена)');
  console.log('  host2@example.com — HOST (Суперхост, Наталья)');
  console.log('  guest@example.com — GUEST (Сергей)');
  console.log('  admin@example.com — ADMIN (Максим)\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
