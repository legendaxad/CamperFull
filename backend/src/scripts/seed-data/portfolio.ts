/*
 * Portfolio demo data for `SEED_PROFILE=portfolio npm run seed:dev`.
 *
 * Three categories (Motorhome, Camper Van, Caravan) with ten campers each,
 * plus customers, trips, reviews and supporting records. People, emails and
 * phone numbers are fictional (example.com / .test, 555 numbers). Locations
 * are real Korean cities and regions; rental companies are invented.
 *
 * Passwords are not stored here: the seeder generates them once and keeps
 * them in backend/.local (git-ignored).
 */
import { ExtraChargeType, FuelType, LicenseType, Transmission } from "../../constants/enums";
import * as development from "./development";

const photo = (id: string) => `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`;

/* Every id below was downloaded and checked visually before use. */
const P = {
  // motorhomes
  rvNightCampsite: photo("1513311068348-19c8fbdc0bb6"),
  classCForest: photo("1596470689751-54f9687c1b7f"),
  classCSunrise: photo("1596470693312-9a3686a0af0f"),
  classCDesertRoad: photo("1597327190279-43b91807c7a5"),
  whiteMotorhomeMeadow: photo("1626680114529-3f6ffa002b80"),
  motorhomeGardenPark: photo("1629222247198-00b164054719"),
  classAAwning: photo("1652904276139-878ff8f3c9ab"),
  classCRedRocks: photo("1655827268198-aee7f7ace729"),
  motorhomeCampground: photo("1781211901352-390b93468b01"),
  motorhomePrairie: photo("1775641080262-1a4e3978a4b5"),
  // camper vans
  sprinterSnowPeaks: photo("1576793048000-494aaa93d160"),
  orangeVwMountains: photo("1594495894542-a46cc73e081a"),
  greenVanForest: photo("1625492995811-646c41068abe"),
  vanguardDriveway: photo("1762568722985-ff6f68936bc3"),
  vanNightCampsite: photo("1766083639110-ec7c4ad90490"),
  vanForestPicnic: photo("1780886661843-abc65352bd01"),
  popTopCoast: photo("1527786356703-4b100091cd2c"),
  vwOnDesertRoad: photo("1469854523086-cc02fe5d8800"),
  vanAtSunset: photo("1515876305430-f06edab8282a"),
  vintageBusBeach: photo("1561361513-2d000a50f0dc"),
  // caravans
  greyCaravanAwning: photo("1563783850023-077d97825802"),
  retroCaravanHills: photo("1566847838496-c670dd0ec05e"),
  caravanRow: photo("1591447722629-2d3ecd3b2d62"),
  vintageCaravanMeadow: photo("1592351763700-b9b35a6465ea"),
  trailerAtDusk: photo("1635787501769-10b8e23b3ded"),
  caravanByLake: photo("1759752783876-a7016334eb34"),
  airstreamPatio: photo("1760982136283-4d65075ac619"),
  airstreamEvening: photo("1523987355523-c7b5b0dd90a7"),
  tentTrailerCamp: photo("1525811902-f2342640856e"),
  trailerCliffSea: photo("1574260031597-bcd9eb192b4f"),
  // scenery & interiors (gallery images)
  camperWindowLake: photo("1782520788496-6650adca4059"),
  viewFromVan: photo("1563299796-17596ed6b017"),
  mountainLake: photo("1568555013133-1a59503c7667"),
  forestValley: photo("1721931248510-9d3e07c6b522"),
  alpineCampground: photo("1781209595017-cd87877a7fd8"),
  starTrails: photo("1778402620479-64bb441d5826"),
  forestTentView: photo("1504280390367-361c6d9f38f4"),
  campfire: photo("1478131143081-80f7f84ca84d"),
  mistyMeadow: photo("1533873984035-25970ab07461"),
  mountainSunset: photo("1510312305653-8ed496efae75"),
  lakesideTent: photo("1537905569824-f89f14cceb68"),
  meadowTent: photo("1571863533956-01c88e79957e"),
  tentWithView: photo("1532339142463-fd0a8979791a"),
  milkyWayTent: photo("1517824806704-9040b037703b"),
  forestTentsNight: photo("1487730116645-74489c95b41b"),
} as const;

/** The admin account visitors can use to explore the dashboard (role ADMIN, never SUPER_ADMIN). */
export const ADMINS = [
  { key: "demo", firstName: "Demo", lastName: "Admin", email: "demo.admin@fullcamper.test", phone: "010-5550-9101", role: "ADMIN" as const },
];

export const CUSTOMERS = development.CUSTOMERS;
export const FEATURES = development.FEATURES;
export const CAMPING_PLACES = development.CAMPING_PLACES;
export const couponFixtures = development.couponFixtures;
export const SETTINGS = development.SETTINGS;

export const CATEGORIES = [
  { name: "Motorhome", description: "Self-contained motorhomes with a kitchen, bathroom and proper beds for the whole family.", sortOrder: 1 },
  { name: "Camper Van", description: "Compact camper vans that drive like a car, park anywhere and sleep two to four.", sortOrder: 2 },
  { name: "Caravan", description: "Towable caravans and trailers for relaxed stays at one beautiful campsite.", sortOrder: 3 },
];

// Feature indexes into FEATURES:
// 0 heating · 1 solar · 2 kitchenette · 3 shower · 4 air con · 5 awning · 6 toilet · 7 pets · 8 bike rack · 9 rear camera
const EX = {
  bedding: { name: "Bedding kit (per person)", price: 15000, chargeType: ExtraChargeType.PER_BOOKING, maxQuantity: 6 },
  chairs: { name: "Camping chairs & table", price: 10000, chargeType: ExtraChargeType.PER_NIGHT, maxQuantity: 1 },
  grill: { name: "Charcoal BBQ grill set", price: 25000, chargeType: ExtraChargeType.PER_BOOKING, maxQuantity: 1 },
  power: { name: "Portable power station", price: 20000, chargeType: ExtraChargeType.PER_NIGHT, maxQuantity: 1 },
  bikes: { name: "Bicycle rental", price: 12000, chargeType: ExtraChargeType.PER_NIGHT, maxQuantity: 4 },
  childSeat: { name: "Child car seat", price: 10000, chargeType: ExtraChargeType.PER_BOOKING, maxQuantity: 2 },
  kayak: { name: "Inflatable kayak", price: 30000, chargeType: ExtraChargeType.PER_BOOKING, maxQuantity: 2 },
  delivery: { name: "Delivery & set-up at your campsite", price: 60000, chargeType: ExtraChargeType.PER_BOOKING, maxQuantity: 1 },
  awningRoom: { name: "Awning side room", price: 15000, chargeType: ExtraChargeType.PER_NIGHT, maxQuantity: 1 },
};

const motorSpecs = (lengthMm: number, weightKg: number, engine: string, mileageKm: number, fuelType = FuelType.DIESEL) => ({
  lengthMm, widthMm: 2300, heightMm: 3050, weightKg, fuelType, transmission: Transmission.AUTOMATIC, engine, mileageKm,
});
const vanSpecs = (lengthMm: number, heightMm: number, engine: string, mileageKm: number, transmission = Transmission.AUTOMATIC, fuelType = FuelType.DIESEL) => ({
  lengthMm, widthMm: 1990, heightMm, weightKg: 2900, fuelType, transmission, engine, mileageKm,
});
const trailerSpecs = (lengthMm: number, weightKg: number) => ({
  lengthMm, widthMm: 2250, heightMm: 2600, weightKg, fuelType: FuelType.NONE, transmission: Transmission.NONE,
});

export const CAMPERS = [
  /* ---------------- Motorhome (category 0) ---------------- */
  {
    name: "Hanbit Cruiser M7", category: 0, features: [0, 1, 2, 3, 6, 9], isFeatured: true,
    brand: "Hyundai", company: "Hanbit Camping Rentals", baseVehicle: "Hyundai Porter II", modelYear: 2024,
    licenseType: LicenseType.CLASS1_ORDINARY, capacity: { seats: 4, sleeps: 4 }, specifications: motorSpecs(5900, 3480, "2.5L CRDi", 18400),
    location: { region: "Gyeonggi-do", city: "Goyang", address: "Ilsan Lake Park east car park", pickupNotes: "Pickup at the green container office next to Ilsan Lake Park. Bring your driving licence." },
    pricing: { dailyRate: 170000, weekendDailyRate: 210000, cleaningFee: 50000, securityDeposit: 300000 },
    extras: [EX.bedding, EX.chairs, EX.childSeat], minNights: 2, maxNights: 14,
    description: "A family motorhome on the reliable Porter II chassis, built for weekend escapes from Seoul. The over-cab double and the convertible dinette sleep four, the kitchenette has a two-burner hob and fridge, and the washroom includes a hot shower and cassette toilet.",
    highlights: [
      { title: "Warm in every season", description: "Diesel heating runs while driving and when parked, so winter trips to Gangwon-do stay comfortable." },
      { title: "Easy first motorhome", description: "Compact enough for city streets, with a rear camera and a full walkthrough at pickup." },
    ],
    images: [P.classCForest, P.camperWindowLake, P.forestTentView],
  },
  {
    name: "Seorak Explorer 650", category: 0, features: [0, 1, 2, 3, 5, 6, 9], isFeatured: false,
    brand: "Fiat", company: "Seorak Motorhome Co.", baseVehicle: "Fiat Ducato", modelYear: 2023,
    licenseType: LicenseType.CLASS1_ORDINARY, capacity: { seats: 4, sleeps: 4 }, specifications: motorSpecs(6500, 3500, "2.2L MultiJet", 26900),
    location: { region: "Gangwon-do", city: "Sokcho", address: "Seorak-daero rental depot, Sokcho", pickupNotes: "Ten minutes from Sokcho Express Bus Terminal. Free parking for your car." },
    pricing: { dailyRate: 230000, weekendDailyRate: 270000, cleaningFee: 60000, securityDeposit: 400000 },
    extras: [EX.bedding, EX.chairs, EX.grill], minNights: 2, maxNights: 14,
    description: "Pick up on the east coast and wake up beside Seoraksan. This 6.5 m motorhome has a rear lounge with sea-facing windows, a drop-down bed over the dinette and a separate shower. It is a favourite for autumn foliage trips along the Hangyeryeong pass.",
    highlights: [
      { title: "Panoramic rear lounge", description: "Wraparound windows turn the back of the van into a viewing room." },
      { title: "Coast and mountains", description: "Beaches, Seoraksan National Park and Naksansa temple are all within 30 minutes." },
    ],
    images: [P.classCSunrise, P.mountainSunset, P.mistyMeadow],
  },
  {
    name: "Jeju Island Voyager", category: 0, features: [0, 2, 3, 4, 6, 9], isFeatured: true,
    brand: "Hymer", company: "Jeju Island Campers", baseVehicle: "Mercedes-Benz Sprinter", modelYear: 2024,
    licenseType: LicenseType.CLASS1_ORDINARY, capacity: { seats: 4, sleeps: 3 }, specifications: motorSpecs(6990, 3500, "2.0L OM654", 14200),
    location: { region: "Jeju-do", city: "Jeju-si", address: "Jeju Airport rental village, zone B", pickupNotes: "Free shuttle from the airport arrivals hall every 15 minutes." },
    pricing: { dailyRate: 280000, weekendDailyRate: 330000, cleaningFee: 70000, securityDeposit: 500000 },
    extras: [EX.bedding, EX.chairs, EX.bikes], minNights: 2, maxNights: 21,
    description: "A Hymer motorhome with twin single beds that convert into one large bed, roof air conditioning and a bright, spacious washroom. Collect it at Jeju Airport and follow the coastal road past Hyeopjae Beach, Seongsan Ilchulbong and the Seogwipo waterfalls.",
    highlights: [
      { title: "Twin or king bed", description: "Two 2 m singles at the back, or one large bed with the filler cushion." },
      { title: "Island itinerary included", description: "Our team shares a five-day Jeju route with campsites that welcome motorhomes." },
    ],
    images: [P.motorhomeCampground, P.mountainLake, P.lakesideTent],
  },
  {
    name: "Gangneung Coastline 590", category: 0, features: [0, 1, 2, 3, 6, 7], isFeatured: false,
    brand: "Kia", company: "East Sea Leisure Vehicles", baseVehicle: "Kia Bongo III", modelYear: 2023,
    licenseType: LicenseType.CLASS1_ORDINARY, capacity: { seats: 4, sleeps: 4 }, specifications: motorSpecs(5900, 3350, "2.5L diesel", 31500),
    location: { region: "Gangwon-do", city: "Gangneung", address: "Gyeongpo Beach rental lot", pickupNotes: "A five-minute walk from Gyeongpo Beach. Late returns until 13:00 on request." },
    pricing: { dailyRate: 180000, weekendDailyRate: 220000, cleaningFee: 50000, securityDeposit: 300000 },
    extras: [EX.bedding, EX.chairs, EX.grill], minNights: 1, maxNights: 10,
    description: "A pet-friendly motorhome based by Gyeongpo Beach. Coffee Street at Anmok, Jeongdongjin sunrise and the Odaesan forest roads are all an easy drive away. The layout has a permanent rear bed, a dinette that converts for two more, and a compact wet room.",
    highlights: [
      { title: "Dogs welcome", description: "Washable seat covers, a water bowl and a lead hook by the door." },
      { title: "Sunrise spots", description: "We mark three legal overnight car parks facing the East Sea." },
    ],
    images: [P.whiteMotorhomeMeadow, P.campfire, P.tentWithView],
  },
  {
    name: "Busan Harbour Grand", category: 0, features: [0, 1, 2, 3, 4, 5, 6, 9], isFeatured: true,
    brand: "Thor", company: "Blue Coast RV", baseVehicle: "Ford E-450", modelYear: 2022,
    licenseType: LicenseType.CLASS1_LARGE, capacity: { seats: 6, sleeps: 6 }, specifications: motorSpecs(8800, 5900, "7.3L V8", 38800, FuelType.GASOLINE),
    location: { region: "Busan", city: "Haeundae-gu", address: "Songjeong Beach RV centre", pickupNotes: "Large vehicle: allow 40 minutes for the handover and a short practice drive." },
    pricing: { dailyRate: 450000, weekendDailyRate: 520000, cleaningFee: 100000, securityDeposit: 1000000 },
    extras: [EX.bedding, EX.chairs, EX.grill, EX.kayak], minNights: 3, maxNights: 21,
    description: "Our largest American-style RV, with a slide-out lounge, a queen bedroom at the back and bunk space for children over the cab. It suits families or two couples travelling together along the southern coast from Busan to Tongyeong and Namhae.",
    highlights: [
      { title: "Slide-out living room", description: "At the push of a button the lounge widens by 60 cm." },
      { title: "Sleeps six", description: "Queen bedroom, convertible dinette and over-cab bunk." },
    ],
    images: [P.classAAwning, P.mountainSunset, P.campfire],
  },
  {
    name: "Andong Heritage Tourer", category: 0, features: [0, 2, 3, 6, 9], isFeatured: false,
    brand: "Hyundai", company: "Gyeongbuk Camping Partners", baseVehicle: "Hyundai Porter II", modelYear: 2022,
    licenseType: LicenseType.CLASS1_ORDINARY, capacity: { seats: 4, sleeps: 3 }, specifications: motorSpecs(5800, 3300, "2.5L CRDi", 42100),
    location: { region: "Gyeongsangbuk-do", city: "Andong", address: "Andong Station rental office", pickupNotes: "Opposite Andong KTX station. Arrive by train and drive straight off." },
    pricing: { dailyRate: 160000, weekendDailyRate: 195000, cleaningFee: 45000, securityDeposit: 300000 },
    extras: [EX.bedding, EX.chairs], minNights: 1, maxNights: 10,
    description: "A comfortable motorhome for slow travel through Korea's heritage heartland. Visit Hahoe Folk Village, Byeongsanseowon and the temples of Gyeongju, then park up beside the Nakdonggang river for the night. It sleeps three in a fixed double and a single over the cab.",
    highlights: [
      { title: "Heritage route", description: "A suggested Andong–Yeongju–Gyeongju loop with campsites near each UNESCO site." },
      { title: "Train and drive", description: "Arrive by KTX from Seoul and collect the motorhome across the road." },
    ],
    images: [P.motorhomeGardenPark, P.alpineCampground, P.meadowTent],
  },
  {
    name: "Taean Sunset Liner", category: 0, features: [0, 1, 2, 3, 5, 6], isFeatured: false,
    brand: "Adria", company: "West Coast Motorhomes", baseVehicle: "Fiat Ducato", modelYear: 2023,
    licenseType: LicenseType.CLASS1_ORDINARY, capacity: { seats: 4, sleeps: 4 }, specifications: motorSpecs(6700, 3500, "2.2L MultiJet", 21300),
    location: { region: "Chungcheongnam-do", city: "Taean", address: "Anmyeon-do island depot", pickupNotes: "On Anmyeon-do, two hours from Seoul. Beach campsites are five minutes away." },
    pricing: { dailyRate: 210000, weekendDailyRate: 250000, cleaningFee: 55000, securityDeposit: 400000 },
    extras: [EX.bedding, EX.chairs, EX.grill], minNights: 2, maxNights: 14,
    description: "Built for the west coast and its famous sunsets. The Adria layout has a fixed French bed, an L-shaped lounge and an awning for long evenings outside. The Taean peninsula has more than 20 beaches, pine forests and the Kkotji Beach sunset rocks.",
    highlights: [
      { title: "Best seat for sunset", description: "Wind out the awning, set up the chairs and watch the sun drop into the Yellow Sea." },
      { title: "Close to Seoul", description: "About two hours from Seoul, so a Friday departure still leaves a full weekend." },
    ],
    images: [P.classCDesertRoad, P.mountainSunset, P.mistyMeadow],
  },
  {
    name: "Yeosu Night Sea Deluxe", category: 0, features: [0, 1, 2, 3, 4, 6, 9], isFeatured: false,
    brand: "Hyundai", company: "Namdo Leisure Rentals", baseVehicle: "Hyundai Solati", modelYear: 2024,
    licenseType: LicenseType.CLASS1_ORDINARY, capacity: { seats: 5, sleeps: 4 }, specifications: motorSpecs(6200, 3500, "2.5L CRDi", 12700),
    location: { region: "Jeollanam-do", city: "Yeosu", address: "Yeosu Expo station rental centre", pickupNotes: "Next to Yeosu Expo KTX station. Evening pickups until 21:00 by arrangement." },
    pricing: { dailyRate: 240000, weekendDailyRate: 290000, cleaningFee: 60000, securityDeposit: 400000 },
    extras: [EX.bedding, EX.chairs, EX.childSeat], minNights: 2, maxNights: 14,
    description: "A modern motorhome on the Solati platform, with five belted seats, a rear double and a drop-down bed. It is ideal for exploring Yeosu's night sea, Odongdo island and the reed fields of Suncheon Bay. Air conditioning keeps summer nights on the south coast comfortable.",
    highlights: [
      { title: "Five travel seats", description: "Rare in a motorhome this size, so a family of five can travel together." },
      { title: "South coast nights", description: "Watch the Dolsan Bridge lights from the campsite at Odongdo." },
    ],
    images: [P.rvNightCampsite, P.starTrails, P.milkyWayTent],
  },
  {
    name: "Gyeongju Royal Road 700", category: 0, features: [0, 1, 2, 3, 5, 6, 8, 9], isFeatured: false,
    brand: "Dethleffs", company: "Silla Motorhome Rentals", baseVehicle: "Fiat Ducato", modelYear: 2022,
    licenseType: LicenseType.CLASS1_ORDINARY, capacity: { seats: 4, sleeps: 4 }, specifications: motorSpecs(7000, 3500, "2.3L MultiJet", 35600),
    location: { region: "Gyeongsangbuk-do", city: "Gyeongju", address: "Bomun Lake resort car park", pickupNotes: "At the Bomun Lake resort area. Bikes for the lake path can be added." },
    pricing: { dailyRate: 250000, weekendDailyRate: 295000, cleaningFee: 60000, securityDeposit: 400000 },
    extras: [EX.bedding, EX.chairs, EX.bikes], minNights: 2, maxNights: 14,
    description: "A German motorhome with a lift-down bed over the lounge and a fixed rear bed, so nobody has to remake beds each night. Explore the tombs and temples of ancient Silla by day, then ride the bikes around Bomun Lake at sunset.",
    highlights: [
      { title: "No bed making", description: "Two permanent doubles: one fixed at the rear and one that lowers electrically over the lounge." },
      { title: "Bike rack included", description: "Carries four bikes. Gyeongju is one of Korea's best cycling cities." },
    ],
    images: [P.classCRedRocks, P.forestValley, P.forestTentView],
  },
  {
    name: "Chuncheon Lakeside Family", category: 0, features: [0, 2, 3, 6, 7, 9], isFeatured: false,
    brand: "Kia", company: "Lakeside Camping Rentals", baseVehicle: "Kia Bongo III", modelYear: 2021,
    licenseType: LicenseType.CLASS1_ORDINARY, capacity: { seats: 6, sleeps: 5 }, specifications: motorSpecs(6000, 3500, "2.5L diesel", 54200),
    location: { region: "Gangwon-do", city: "Chuncheon", address: "Uiam Lake rental base", pickupNotes: "Beside Uiam Lake, one hour from Seoul by ITX train." },
    pricing: { dailyRate: 175000, weekendDailyRate: 215000, cleaningFee: 50000, securityDeposit: 300000 },
    extras: [EX.bedding, EX.chairs, EX.kayak, EX.childSeat], minNights: 1, maxNights: 10,
    description: "Plenty of room for a family of five, with bunk beds for the children and a separate double for the parents. Chuncheon's lakes, Nami Island and the Soyang River skywalk are right on your doorstep, and the kayak add-on is popular in summer.",
    highlights: [
      { title: "Kids' bunks", description: "Two bunks with their own reading lights and safety nets." },
      { title: "Lake adventures", description: "Add a kayak and launch from the campsite slipway on Uiam Lake." },
    ],
    images: [P.motorhomePrairie, P.lakesideTent, P.alpineCampground],
  },

  /* ---------------- Camper Van (category 1) ---------------- */
  {
    name: "Coastline Van 2", category: 1, features: [1, 2, 5, 9], isFeatured: true,
    brand: "Mercedes-Benz", company: "Busan Coast Campers", baseVehicle: "Mercedes-Benz Sprinter 316", modelYear: 2023,
    licenseType: LicenseType.CLASS2_ORDINARY, capacity: { seats: 3, sleeps: 2 }, specifications: vanSpecs(5930, 2760, "2.1L CDI", 28300),
    location: { region: "Busan", city: "Haeundae-gu", address: "Songjeong Beach rental lot", pickupNotes: "Free parking for your own car during the trip." },
    pricing: { dailyRate: 150000, weekendDailyRate: 180000, cleaningFee: 40000, securityDeposit: 250000 },
    extras: [EX.bedding, EX.chairs], minNights: 1, maxNights: 10,
    description: "A high-roof Sprinter van with a cross-wise double bed, a slide-out kitchen and a solar-powered fridge. It suits couples following the southern coastline from Busan. You can stand up inside, yet it still fits most parking spaces.",
    highlights: [
      { title: "Standing height", description: "1.9 m of headroom inside, rare for a van this size." },
      { title: "Off-grid power", description: "200 W of solar keeps the fridge and lights running for days." },
    ],
    images: [P.sprinterSnowPeaks, P.viewFromVan, P.lakesideTent],
  },
  {
    name: "Seaside Pop-top T6", category: 1, features: [0, 1, 2, 5, 8], isFeatured: true,
    brand: "Volkswagen", company: "Jeju Island Vans", baseVehicle: "Volkswagen Transporter T6.1", modelYear: 2022,
    licenseType: LicenseType.CLASS2_ORDINARY, capacity: { seats: 4, sleeps: 4 }, specifications: vanSpecs(4904, 1990, "2.0L TDI", 41200),
    location: { region: "Jeju-do", city: "Jeju-si", address: "Jeju Airport rental village, zone C", pickupNotes: "Free shuttle from the airport arrivals hall." },
    pricing: { dailyRate: 190000, weekendDailyRate: 230000, cleaningFee: 45000, securityDeposit: 300000 },
    extras: [EX.bedding, EX.chairs, EX.bikes], minNights: 2, maxNights: 14,
    description: "The classic pop-top experience on Jeju. Lift the roof for a second double bed and standing room, slide open the side door to the ocean, and cook on the two-burner hob. It also fits into underground car parks when the roof is down.",
    highlights: [
      { title: "Roof bed with a view", description: "The pop-top sleeps two more under a canvas with zip-open windows." },
      { title: "Island ready", description: "Bike rack included. Jeju's coastal cycle path starts at pickup." },
    ],
    images: [P.popTopCoast, P.meadowTent, P.tentWithView],
  },
  {
    name: "Sunrise Bulli Classic", category: 1, features: [2, 5, 8], isFeatured: false,
    brand: "Volkswagen", company: "Retro Road Busan", baseVehicle: "Volkswagen Type 2 (T2)", modelYear: 1979,
    licenseType: LicenseType.CLASS2_ORDINARY, capacity: { seats: 4, sleeps: 2 }, specifications: vanSpecs(4505, 2040, "2.0L air-cooled", 186000, Transmission.MANUAL, FuelType.GASOLINE),
    location: { region: "Busan", city: "Suyeong-gu", address: "Gwangalli retro garage", pickupNotes: "Manual gearbox. A 20-minute driving lesson is included." },
    pricing: { dailyRate: 140000, weekendDailyRate: 170000, cleaningFee: 30000, securityDeposit: 300000 },
    extras: [EX.chairs, EX.bedding], minNights: 1, maxNights: 7,
    description: "A lovingly restored 1979 Volkswagen bus in two-tone green, with its original interior and a rock-and-roll bed. Drive it slowly along Gwangalli and Haeundae, stop for coffee at Cheongsapo and turn heads wherever you park.",
    highlights: [
      { title: "Pure nostalgia", description: "Original interior, restored chrome and a working cassette player." },
      { title: "Photo-ready", description: "The most photographed van in our fleet, and a favourite for pre-wedding shoots." },
    ],
    images: [P.vintageBusBeach, P.vanAtSunset, P.campfire],
  },
  {
    name: "Nightfox Custom Starex", category: 1, features: [0, 1, 2, 4, 9], isFeatured: false,
    brand: "Hyundai", company: "Nightfox Custom Works", baseVehicle: "Hyundai Grand Starex", modelYear: 2021,
    licenseType: LicenseType.CLASS2_ORDINARY, capacity: { seats: 4, sleeps: 2 }, specifications: vanSpecs(5150, 2300, "2.5L VGT", 63800),
    location: { region: "Jeollanam-do", city: "Suncheon", address: "Suncheon Bay wetland car park", pickupNotes: "Late pickups until 21:00 by arrangement." },
    pricing: { dailyRate: 135000, weekendDailyRate: 165000, cleaningFee: 40000, securityDeposit: 250000 },
    extras: [EX.bedding, EX.chairs], minNights: 1, maxNights: 14,
    description: "A workshop-tuned Grand Starex with walnut cabinetry, ambient lighting, a swivel passenger seat and a fold-out double bed. It is based near Suncheon Bay's reed fields and handles the narrow coastal roads of Jeollanam-do with ease.",
    highlights: [
      { title: "Custom interior", description: "Hand-built by Nightfox Custom Works in Gwangju." },
      { title: "Swivel seat lounge", description: "The passenger seat turns to make a four-seat dinette." },
    ],
    images: [P.vanAtSunset, P.milkyWayTent, P.forestTentView],
  },
  {
    name: "Trailhead 4x4 Expedition", category: 1, features: [0, 1, 2, 3, 5, 9], isFeatured: true,
    brand: "Mercedes-Benz", company: "Trailhead Overland", baseVehicle: "Mercedes-Benz Sprinter 4x4", modelYear: 2023,
    licenseType: LicenseType.CLASS1_ORDINARY, capacity: { seats: 4, sleeps: 3 }, specifications: vanSpecs(5932, 2920, "3.0L V6 CDI", 22700),
    location: { region: "Gangwon-do", city: "Inje", address: "Inje riverside base", pickupNotes: "Recovery kit and satellite messenger included. A 4x4 briefing is given at pickup." },
    pricing: { dailyRate: 230000, weekendDailyRate: 270000, cleaningFee: 60000, securityDeposit: 600000 },
    extras: [EX.bedding, EX.power, EX.chairs], minNights: 2, maxNights: 21,
    description: "A 4x4 Sprinter for forest roads and remote valleys. A fixed rear bed, a hot shower and 150 L of water mean you can stay several days away from campsites, deep in the mountains of Inje and Hongcheon.",
    highlights: [
      { title: "Go further", description: "Permanent 4x4, raised suspension and all-terrain tyres." },
      { title: "Days off-grid", description: "400 Ah lithium battery and 300 W of solar." },
    ],
    images: [P.greenVanForest, P.forestValley, P.alpineCampground],
  },
  {
    name: "Sokcho Surf Van", category: 1, features: [1, 2, 5, 8], isFeatured: false,
    brand: "Volkswagen", company: "Yangyang Surf Campers", baseVehicle: "Volkswagen Transporter T6", modelYear: 2020,
    licenseType: LicenseType.CLASS2_ORDINARY, capacity: { seats: 3, sleeps: 2 }, specifications: vanSpecs(4904, 1990, "2.0L TDI", 72400),
    location: { region: "Gangwon-do", city: "Yangyang", address: "Jukdo Beach surf village", pickupNotes: "Board racks fit two longboards. Rinse tank included." },
    pricing: { dailyRate: 130000, weekendDailyRate: 160000, cleaningFee: 35000, securityDeposit: 250000 },
    extras: [EX.chairs, EX.bedding], minNights: 1, maxNights: 10,
    description: "A surfer's van parked minutes from Jukdo and Ingu beaches, Korea's surf capital. It has roof racks for two boards, a rear shower with a rinse tank for wetsuits, and a fold-flat bed with a sea-view tailgate.",
    highlights: [
      { title: "Made for surfers", description: "Roof racks, a wetsuit rinse tank and a hook rail for drying gear." },
      { title: "Yangyang base", description: "Ten surf breaks within 20 minutes of pickup." },
    ],
    images: [P.orangeVwMountains, P.tentWithView, P.mistyMeadow],
  },
  {
    name: "Gapyeong Weekender", category: 1, features: [0, 1, 2, 7], isFeatured: false,
    brand: "Kia", company: "Gapyeong Mini Campers", baseVehicle: "Kia Carnival", modelYear: 2023,
    licenseType: LicenseType.CLASS2_ORDINARY, capacity: { seats: 4, sleeps: 2 }, specifications: vanSpecs(5155, 1800, "2.2L diesel", 19800),
    location: { region: "Gyeonggi-do", city: "Gapyeong", address: "Gapyeong station camp hub", pickupNotes: "Two minutes from Gapyeong ITX station." },
    pricing: { dailyRate: 110000, weekendDailyRate: 140000, cleaningFee: 30000, securityDeposit: 200000 },
    extras: [EX.chairs, EX.grill, EX.bedding], minNights: 1, maxNights: 7,
    description: "The easiest way to try van camping. This converted Carnival drives exactly like a family car, has a fold-out bed for two and a pull-out kitchen box. It is perfect for a first night at Jaraseom or the Bukhangang riverside.",
    highlights: [
      { title: "Drives like a car", description: "Fits any car park and is easy for first-time campers." },
      { title: "Riverside weekends", description: "Jaraseom island campsite is ten minutes from pickup." },
    ],
    images: [P.vanForestPicnic, P.lakesideTent, P.campfire],
  },
  {
    name: "Incheon Airport Nomad", category: 1, features: [0, 1, 2, 4, 9], isFeatured: false,
    brand: "Renault", company: "Nomad Van Korea", baseVehicle: "Renault Master", modelYear: 2024,
    licenseType: LicenseType.CLASS2_ORDINARY, capacity: { seats: 3, sleeps: 2 }, specifications: vanSpecs(5575, 2500, "2.3L dCi", 8900),
    location: { region: "Incheon", city: "Jung-gu", address: "Unseo-dong rental park near Incheon Airport", pickupNotes: "Shuttle pickup from both airport terminals. English-speaking staff." },
    pricing: { dailyRate: 160000, weekendDailyRate: 190000, cleaningFee: 40000, securityDeposit: 300000 },
    extras: [EX.bedding, EX.chairs, EX.power], minNights: 3, maxNights: 30,
    description: "Land at Incheon and start your Korea road trip the same afternoon. This new Renault Master van has a fixed bed, a compact galley and air conditioning, and it comes with an English route guide to the west coast islands and Seoraksan.",
    highlights: [
      { title: "Fly and drive", description: "Collect at the airport with English-speaking support throughout your trip." },
      { title: "Long-trip ready", description: "Discounted cleaning fee for stays of 14 nights or more." },
    ],
    images: [P.vanguardDriveway, P.viewFromVan, P.mountainLake],
  },
  {
    name: "Jirisan Forest Van", category: 1, features: [0, 1, 2, 5, 7], isFeatured: false,
    brand: "Hyundai", company: "Jirisan Outdoor Rentals", baseVehicle: "Hyundai Staria", modelYear: 2023,
    licenseType: LicenseType.CLASS2_ORDINARY, capacity: { seats: 4, sleeps: 2 }, specifications: vanSpecs(5253, 2050, "2.2L diesel", 24600),
    location: { region: "Jeollabuk-do", city: "Namwon", address: "Jirisan Dalgung valley base", pickupNotes: "Mountain roads: we check tyre chains in winter." },
    pricing: { dailyRate: 145000, weekendDailyRate: 175000, cleaningFee: 40000, securityDeposit: 250000 },
    extras: [EX.chairs, EX.grill, EX.bedding], minNights: 1, maxNights: 10,
    description: "A Staria camper with a pop-up roof tent and a heated interior bed, based at the foot of Jirisan. Hike Nogodan by day and sleep beside a mountain stream at night. Dogs are welcome on board.",
    highlights: [
      { title: "Heated bed", description: "The diesel heater warms the bed platform on cold mountain nights." },
      { title: "Trailhead access", description: "Seongsamjae and Nogodan trailheads are within 30 minutes." },
    ],
    images: [P.vanNightCampsite, P.forestTentView, P.starTrails],
  },
  {
    name: "Seoul City Escape", category: 1, features: [1, 2, 4, 9], isFeatured: false,
    brand: "Volkswagen", company: "Han River Campers", baseVehicle: "Volkswagen Crafter", modelYear: 2022,
    licenseType: LicenseType.CLASS2_ORDINARY, capacity: { seats: 3, sleeps: 2 }, specifications: vanSpecs(5986, 2590, "2.0L TDI", 33100),
    location: { region: "Seoul", city: "Mapo-gu", address: "Mangwon Han River Park rental point", pickupNotes: "Pick up at Mangwon and be on the Gyeongui expressway in ten minutes." },
    pricing: { dailyRate: 170000, weekendDailyRate: 205000, cleaningFee: 45000, securityDeposit: 300000 },
    extras: [EX.bedding, EX.chairs, EX.bikes], minNights: 1, maxNights: 14,
    description: "A design-led Crafter van for city dwellers who need a quick escape. It has an oak interior, a queen-size rear bed, an induction hob and air conditioning. Leave Seoul after work and wake up by the sea at Eurwangni or in the hills of Yangpyeong.",
    highlights: [
      { title: "Escape after work", description: "Pick up in Mapo until 20:00 and be at a beach or river campsite by nightfall." },
      { title: "Induction kitchen", description: "Cooks on battery power, with no gas bottles to change." },
    ],
    images: [P.vwOnDesertRoad, P.camperWindowLake, P.meadowTent],
  },

  /* ---------------- Caravan (category 2) ---------------- */
  {
    name: "Adria Altea 4-Berth", category: 2, features: [2, 3, 5, 6, 7], isFeatured: true,
    brand: "Adria", company: "Gangwon Caravan Park", baseVehicle: "Single-axle caravan", modelYear: 2022,
    licenseType: LicenseType.SPECIAL_TRAILER, capacity: { seats: 4, sleeps: 4 }, specifications: trailerSpecs(6900, 1350),
    location: { region: "Gangwon-do", city: "Pyeongchang", address: "Daegwallyeong camp depot", pickupNotes: "Towing hitch check takes 20 minutes. Delivery to nearby campsites available." },
    pricing: { dailyRate: 140000, weekendDailyRate: 170000, cleaningFee: 60000, securityDeposit: 400000 },
    extras: [EX.delivery, EX.awningRoom, EX.bedding], minNights: 2, maxNights: 21,
    description: "A bright European caravan with a fixed double bed, a dinette that converts into a second bed and a full washroom. Pyeongchang's cool summer air and snowy winters make it a year-round base, and pets are welcome.",
    highlights: [
      { title: "Room to spread out", description: "Large windows, a separate washroom and a proper wardrobe." },
      { title: "We can deliver it", description: "No tow bar? We deliver and set up the caravan at your campsite." },
    ],
    images: [P.greyCaravanAwning, P.mistyMeadow, P.alpineCampground],
  },
  {
    name: "Airstream Bambi Silver", category: 2, features: [2, 4, 5, 6], isFeatured: true,
    brand: "Airstream", company: "Silver Bullet Glamping", baseVehicle: "Airstream Bambi 22FB", modelYear: 2021,
    licenseType: LicenseType.SPECIAL_TRAILER, capacity: { seats: 2, sleeps: 2 }, specifications: trailerSpecs(6700, 1600),
    location: { region: "Gyeonggi-do", city: "Yangpyeong", address: "Dumulmeori riverside glamping site", pickupNotes: "Stays on site at Yangpyeong. No towing needed: the Airstream is already pitched." },
    pricing: { dailyRate: 200000, weekendDailyRate: 250000, cleaningFee: 50000, securityDeposit: 300000 },
    extras: [EX.grill, EX.chairs, EX.bikes], minNights: 1, maxNights: 7,
    description: "An iconic polished-aluminium Airstream, permanently pitched by the river at Yangpyeong. Inside is a queen bed, a galley kitchen and air conditioning; outside are a deck, string lights and a fire pit. Dumulmeori's misty mornings are a short walk away.",
    highlights: [
      { title: "Glamping, no towing", description: "Already set up on a riverside pitch, so you just arrive and relax." },
      { title: "Misty mornings", description: "Dumulmeori's famous sunrise is a ten-minute walk away." },
    ],
    images: [P.airstreamPatio, P.camperWindowLake, P.campfire],
  },
  {
    name: "Knaus Sport 460", category: 2, features: [2, 5, 6, 7], isFeatured: false,
    brand: "Knaus", company: "Chungbuk Caravan Hire", baseVehicle: "Single-axle caravan", modelYear: 2023,
    licenseType: LicenseType.SPECIAL_TRAILER, capacity: { seats: 4, sleeps: 4 }, specifications: trailerSpecs(6600, 1300),
    location: { region: "Chungcheongbuk-do", city: "Danyang", address: "Danyang Sobaeksan camp base", pickupNotes: "Paragliding pick-up point and Gosu Cave are both nearby." },
    pricing: { dailyRate: 120000, weekendDailyRate: 150000, cleaningFee: 50000, securityDeposit: 300000 },
    extras: [EX.delivery, EX.awningRoom, EX.chairs], minNights: 2, maxNights: 21,
    description: "A light, modern German caravan with a large rear washroom, a front lounge with panoramic windows and two double beds. It is based in Danyang, where the Namhangang river, limestone caves and paragliding over the valley make for an active weekend.",
    highlights: [
      { title: "Light to tow", description: "Only 1,300 kg, so most mid-size SUVs can tow it." },
      { title: "Adventure base", description: "Paragliding, river rafting and caves within 15 minutes." },
    ],
    images: [P.retroCaravanHills, P.mountainLake, P.forestTentView],
  },
  {
    name: "Pebble Teardrop Mini", category: 2, features: [1, 5, 7], isFeatured: false,
    brand: "Pebble", company: "Gapyeong Mini Trailers", baseVehicle: "Teardrop trailer", modelYear: 2023,
    licenseType: LicenseType.CLASS2_ORDINARY, capacity: { seats: 2, sleeps: 2 }, specifications: trailerSpecs(3600, 620),
    location: { region: "Gyeonggi-do", city: "Gapyeong", address: "Gapyeong station camp hub", pickupNotes: "Under 750 kg, so no trailer licence is needed. We check your hitch at pickup." },
    pricing: { dailyRate: 75000, weekendDailyRate: 95000, cleaningFee: 25000, securityDeposit: 150000 },
    extras: [EX.chairs, EX.grill], minNights: 1, maxNights: 14,
    description: "A cosy two-person teardrop with a queen mattress inside and an outdoor galley kitchen under the rear hatch. It is light enough for most SUVs and needs no trailer licence, which makes it the easiest way to try caravanning.",
    highlights: [
      { title: "No trailer licence", description: "At 620 kg it can be towed on a standard licence." },
      { title: "Outdoor galley", description: "The rear hatch kitchen has a gas stove, cool box and storage." },
    ],
    images: [P.tentTrailerCamp, P.forestTentsNight, P.lakesideTent],
  },
  {
    name: "Bürstner Premio Lake", category: 2, features: [0, 2, 3, 5, 6], isFeatured: false,
    brand: "Bürstner", company: "Uiam Lake Caravans", baseVehicle: "Single-axle caravan", modelYear: 2022,
    licenseType: LicenseType.SPECIAL_TRAILER, capacity: { seats: 4, sleeps: 3 }, specifications: trailerSpecs(6400, 1250),
    location: { region: "Gangwon-do", city: "Chuncheon", address: "Jungdo island caravan park", pickupNotes: "Pitched on site at Jungdo island or delivered within 30 km." },
    pricing: { dailyRate: 130000, weekendDailyRate: 160000, cleaningFee: 50000, securityDeposit: 300000 },
    extras: [EX.delivery, EX.kayak, EX.chairs], minNights: 2, maxNights: 14,
    description: "A stylish lakeside caravan with a rear lounge facing the water, a fixed double bed and a heated shower room. The Jungdo island pitch is surrounded by Uiam Lake, ideal for kayaking at dawn and quiet evenings by the fire.",
    highlights: [
      { title: "Lake-view lounge", description: "The rear lounge window frames Uiam Lake." },
      { title: "Heated washroom", description: "Comfortable in spring and autumn when lake nights turn cold." },
    ],
    images: [P.caravanByLake, P.camperWindowLake, P.mistyMeadow],
  },
  {
    name: "Vintage Eriba Touring", category: 2, features: [2, 5], isFeatured: false,
    brand: "Hymer", company: "Retro Caravan Club Jeonju", baseVehicle: "Eriba Touring", modelYear: 1988,
    licenseType: LicenseType.CLASS2_ORDINARY, capacity: { seats: 2, sleeps: 2 }, specifications: trailerSpecs(4200, 740),
    location: { region: "Jeollabuk-do", city: "Jeonju", address: "Jeonju hanok village outskirts", pickupNotes: "Restored classic: please read the short care guide at pickup." },
    pricing: { dailyRate: 95000, weekendDailyRate: 120000, cleaningFee: 30000, securityDeposit: 250000 },
    extras: [EX.chairs, EX.grill], minNights: 1, maxNights: 7,
    description: "A charming 1988 Eriba with a pop-up roof and its original wood interior, restored in mint and cream. It is light enough to tow with a small car. Park it near Jeonju's hanok village and spend the evenings at the food market.",
    highlights: [
      { title: "Restored classic", description: "Original wood interior, new upholstery and modern safety equipment." },
      { title: "Food lover's base", description: "Jeonju's bibimbap and Nambu Market are 15 minutes away." },
    ],
    images: [P.vintageCaravanMeadow, P.campfire, P.meadowTent],
  },
  {
    name: "Tongyeong Island Hopper", category: 2, features: [2, 3, 4, 5, 6], isFeatured: false,
    brand: "Dethleffs", company: "Hallyeo Waterway Caravans", baseVehicle: "Single-axle caravan", modelYear: 2023,
    licenseType: LicenseType.SPECIAL_TRAILER, capacity: { seats: 4, sleeps: 4 }, specifications: trailerSpecs(7100, 1450),
    location: { region: "Gyeongsangnam-do", city: "Tongyeong", address: "Mireuk-do caravan terrace", pickupNotes: "Terrace pitch overlooking Hallyeo Waterway. Ferries to the islands nearby." },
    pricing: { dailyRate: 150000, weekendDailyRate: 185000, cleaningFee: 55000, securityDeposit: 350000 },
    extras: [EX.delivery, EX.awningRoom, EX.kayak], minNights: 2, maxNights: 14,
    description: "A family caravan with sea views over the Hallyeo Waterway, Korea's Napoli of the east. It has two double beds, air conditioning and a full washroom. Take day ferries to Somaemuldo and Bijindo, or ride the cable car up Mireuksan.",
    highlights: [
      { title: "Sea-view terrace", description: "Breakfast on the deck overlooking the islands." },
      { title: "Island hopping", description: "Ferries to Bijindo and Somaemuldo leave 10 minutes away." },
    ],
    images: [P.trailerCliffSea, P.tentWithView, P.mountainSunset],
  },
  {
    name: "Airstream Classic Sunset", category: 2, features: [0, 2, 3, 4, 5, 6], isFeatured: true,
    brand: "Airstream", company: "Silver Bullet Glamping", baseVehicle: "Airstream Classic 30", modelYear: 2022,
    licenseType: LicenseType.SPECIAL_TRAILER, capacity: { seats: 4, sleeps: 4 }, specifications: trailerSpecs(9100, 3500),
    location: { region: "Jeju-do", city: "Seogwipo", address: "Pyoseon seaside glamping park", pickupNotes: "Already pitched on site in Seogwipo. Check-in from 15:00." },
    pricing: { dailyRate: 260000, weekendDailyRate: 320000, cleaningFee: 70000, securityDeposit: 400000 },
    extras: [EX.grill, EX.chairs, EX.bikes], minNights: 2, maxNights: 10,
    description: "The flagship of our glamping fleet: a 30 ft Airstream Classic with a separate bedroom, a full bathroom and a lounge with sofa bed. It is permanently pitched by the sea in Seogwipo, with an outdoor dining area, string lights and views of Hallasan on clear days.",
    highlights: [
      { title: "Luxury on wheels", description: "Separate bedroom, full-size shower and underfloor heating." },
      { title: "Seogwipo seaside", description: "Pyoseon Beach and Jeju Folk Village are within walking distance." },
    ],
    images: [P.airstreamEvening, P.starTrails, P.lakesideTent],
  },
  {
    name: "Caravan Park Family Six", category: 2, features: [0, 2, 3, 5, 6, 7], isFeatured: false,
    brand: "Bailey", company: "Geoje Family Caravans", baseVehicle: "Twin-axle caravan", modelYear: 2021,
    licenseType: LicenseType.SPECIAL_TRAILER, capacity: { seats: 6, sleeps: 6 }, specifications: trailerSpecs(8000, 1700),
    location: { region: "Gyeongsangnam-do", city: "Geoje", address: "Hakdong pebble beach caravan park", pickupNotes: "Pitched on site with electricity. Delivery elsewhere on Geoje on request." },
    pricing: { dailyRate: 170000, weekendDailyRate: 210000, cleaningFee: 60000, securityDeposit: 350000 },
    extras: [EX.awningRoom, EX.grill, EX.childSeat], minNights: 2, maxNights: 14,
    description: "A twin-axle caravan that sleeps six, with fixed bunk beds for children, a front lounge and a large washroom. It is pitched at a family caravan park a short stroll from Hakdong's black pebble beach and the Windy Hill lookout.",
    highlights: [
      { title: "Fixed bunks", description: "Children get their own bunk room, with no beds to make up." },
      { title: "Beach on foot", description: "Hakdong pebble beach is a three-minute walk." },
    ],
    images: [P.caravanRow, P.meadowTent, P.campfire],
  },
  {
    name: "Starlight Pod Trailer", category: 2, features: [1, 5], isFeatured: false,
    brand: "Hana", company: "Starlight Camping Co.", baseVehicle: "Compact off-road trailer", modelYear: 2024,
    licenseType: LicenseType.CLASS2_ORDINARY, capacity: { seats: 2, sleeps: 2 }, specifications: trailerSpecs(4100, 700),
    location: { region: "Gyeongsangbuk-do", city: "Yeongyang", address: "Yeongyang Firefly Eco Park", pickupNotes: "Pitched in Korea's first International Dark Sky Park. A red-light torch is provided." },
    pricing: { dailyRate: 85000, weekendDailyRate: 110000, cleaningFee: 25000, securityDeposit: 150000 },
    extras: [EX.chairs, EX.power], minNights: 1, maxNights: 7,
    description: "A compact off-road trailer with a skylight bed for stargazing, pitched in the Yeongyang Firefly Eco Park, Korea's International Dark Sky Park. On clear nights the Milky Way is visible from your pillow.",
    highlights: [
      { title: "Skylight bed", description: "A panoramic roof window above the mattress." },
      { title: "Dark Sky Park", description: "Yeongyang is one of the darkest places in Korea, perfect for astronomy." },
    ],
    images: [P.trailerAtDusk, P.milkyWayTent, P.starTrails],
  },
];

/* Trips: completed trips use 20 different campers so dates never overlap. */
export const PAST_TRIPS = [
  { customer: 0, camper: 0, startDaysAgo: 320, nights: 3, leadDays: 21, extras: [0], rating: 5, comment: "Spotless motorhome and a very clear handover. The diesel heater was a lifesaver on a frosty night in Pyeongchang." },
  { customer: 1, camper: 10, startDaysAgo: 300, nights: 2, leadDays: 14, extras: [], rating: 4, comment: "Perfect size for the two of us along the Busan coast. The fridge is a little small, but everything else was great." },
  { customer: 2, camper: 20, startDaysAgo: 285, nights: 4, leadDays: 30, extras: [0], rating: 5, comment: "They delivered and set up the caravan at our campsite. Our dog loved it as much as we did." },
  { customer: 3, camper: 11, startDaysAgo: 260, nights: 3, leadDays: 10, extras: [2], rating: 3, comment: "Lovely van and a great Jeju trip, but the pop-top canvas had a small tear that let in some rain one night." },
  { customer: 4, camper: 1, startDaysAgo: 240, nights: 3, leadDays: 25, extras: [], rating: 5, comment: "Seoraksan in autumn from the rear lounge window was unforgettable. Handover in Sokcho took only fifteen minutes." },
  { customer: 5, camper: 21, startDaysAgo: 220, nights: 2, leadDays: 18, extras: [0], rating: 5, comment: "Waking up in an Airstream with Dumulmeori's mist outside was magical. Everything was clean and thoughtfully prepared." },
  { customer: 6, camper: 2, startDaysAgo: 200, nights: 5, leadDays: 12, extras: [0, 2], rating: 5, comment: "Five days around Jeju with the kids. Air conditioning was a must in July, and the itinerary they shared was excellent." },
  { customer: 7, camper: 14, startDaysAgo: 185, nights: 3, leadDays: 28, extras: [1], rating: 4, comment: "Took it up forest roads in Inje that we would never have tried otherwise. Pricey, but the 4x4 briefing was really helpful." },
  { customer: 8, camper: 23, startDaysAgo: 170, nights: 2, leadDays: 9, extras: [], rating: 4, comment: "Easy to tow with our SUV. Cooking at the rear galley under the trees was the highlight of the weekend." },
  { customer: 9, camper: 12, startDaysAgo: 150, nights: 2, leadDays: 15, extras: [0], rating: 5, comment: "Driving a 1979 bus along Gwangalli felt like a film. The short manual-gearbox lesson helped a lot." },
  { customer: 0, camper: 24, startDaysAgo: 135, nights: 3, leadDays: 20, extras: [1], rating: 4, comment: "Beautiful lake views from the lounge and a cosy heated shower. The kayak add-on was worth every won." },
  { customer: 1, camper: 3, startDaysAgo: 120, nights: 2, leadDays: 11, extras: [2], rating: 5, comment: "Our dog was treated like a guest, with bowls and seat covers ready. Sunrise at Jeongdongjin was perfect." },
  { customer: 2, camper: 15, startDaysAgo: 105, nights: 3, leadDays: 16, extras: [], rating: 5, comment: "Best surf trip we have had in Korea. The rinse tank and board racks made everything easy." },
  { customer: 3, camper: 26, startDaysAgo: 92, nights: 4, leadDays: 24, extras: [1], rating: 5, comment: "The sea-view terrace in Tongyeong was the best breakfast spot of our holiday. Ferries to Bijindo are very close." },
  { customer: 4, camper: 5, startDaysAgo: 78, nights: 3, leadDays: 13, extras: [0], rating: 4, comment: "Great base for Hahoe and Gyeongju. Collecting it opposite the KTX station was very convenient." },
  { customer: 5, camper: 17, startDaysAgo: 64, nights: 4, leadDays: 30, extras: [0], rating: 5, comment: "We flew in from Singapore and were on the road within an hour of landing. The English support was excellent." },
  { customer: 6, camper: 27, startDaysAgo: 50, nights: 2, leadDays: 19, extras: [0], rating: 5, comment: "Felt like a boutique hotel by the sea. The bedroom and full bathroom made it very comfortable." },
  { customer: 7, camper: 7, startDaysAgo: 38, nights: 3, leadDays: 14, extras: [0, 2], rating: 3, comment: "Comfortable and modern, but the water pump stopped working on the last day and we had to use campsite showers." },
  { customer: 8, camper: 16, startDaysAgo: 26, nights: 2, leadDays: 8, extras: [1], rating: 5, comment: "Our first time van camping and it was so easy. It drives just like our own car, and Jaraseom was lovely." },
  { customer: 9, camper: 29, startDaysAgo: 14, nights: 2, leadDays: 12, extras: [1], rating: 5, comment: "We saw the Milky Way from the bed through the skylight. A unique experience in Korea's Dark Sky Park." },
];

/** Admin replies on some reviews, keyed by PAST_TRIPS index. */
export const REVIEW_REPLIES: Record<number, string> = {
  3: "Thank you for letting us know. The canvas has been replaced, and we have refunded part of your cleaning fee.",
  17: "We are sorry about the water pump. It has been replaced, and we have contacted you about a partial refund.",
  6: "Thank you for travelling with us! We are glad the Jeju route worked well for your family.",
};

/** Trips happening right now. */
export const ACTIVE_TRIPS = [
  { customer: 3, camper: 4, startDaysAgo: 1, nights: 4, leadDays: 20, extras: [0] },
  { customer: 6, camper: 22, startDaysAgo: 2, nights: 5, leadDays: 25, extras: [1] },
];

/** Future bookings created through the real booking service. */
export const UPCOMING_TRIPS = [
  { customer: 0, camper: 6, startInDays: 12, nights: 3, extras: [0], couponCode: undefined, outcome: "PENDING" as const, note: "Arriving by bus from Seoul. Could we pick up around 16:00?" },
  { customer: 1, camper: 13, startInDays: 21, nights: 4, extras: [0], couponCode: "WELCOME10", outcome: "CONFIRMED" as const, note: "Anniversary trip. Any quiet campsite recommendations are welcome!" },
  { customer: 4, camper: 25, startInDays: 33, nights: 2, extras: [], couponCode: undefined, outcome: "CONFIRMED" as const, note: undefined },
  { customer: 2, camper: 9, startInDays: 45, nights: 2, extras: [], couponCode: undefined, outcome: "CANCELLED" as const, note: undefined },
];

/** Favorites as [customer index, camper index]. */
export const FAVORITES: [number, number][] = [
  [0, 4], [0, 21], [1, 2], [1, 27], [2, 14], [2, 11], [3, 6], [3, 29], [4, 20], [4, 12],
  [5, 1], [5, 26], [6, 15], [6, 18], [7, 28], [7, 3], [8, 22], [8, 10], [9, 8], [9, 24],
];

/** Contact inquiries (camper indexes refer to CAMPERS above). */
export const INQUIRIES = [
  { customer: 0, camper: 4, subject: "Is the Busan Harbour Grand available over New Year?", message: "We are two families and would love the Busan Harbour Grand from December 30 to January 2. Is winter equipment included?", reply: { status: "RESOLVED" as const, text: "Yes, winter tyres and extra bedding are included from December to February. Those dates are open for booking now." } },
  { customer: 1, camper: 20, subject: "Towing licence question", message: "Do I need a special licence to tow the Adria Altea, or is a normal class 2 licence enough?", reply: { status: "RESOLVED" as const, text: "The Altea weighs over 750 kg, so a small trailer towing licence (소형견인) is required. Alternatively, we can deliver it to your campsite." } },
  { customer: 4, camper: 14, subject: "Can I take the 4x4 van to Jeju?", message: "Is it allowed to take the Trailhead 4x4 Expedition on the ferry from Mokpo to Jeju?", reply: { status: "IN_PROGRESS" as const, text: "We are checking ferry insurance cover with our partner and will reply within one business day." } },
  { customer: 7, camper: 23, subject: "Bike rack for the teardrop?", message: "Can a bike rack be mounted on the Pebble Teardrop, or should we bring a roof rack for our car?", reply: undefined },
  { customer: 9, camper: undefined, subject: "Receipt for my last trip", message: "Could you send me a business receipt for my trip with the Starlight Pod Trailer? I need it for my company.", reply: { status: "RESOLVED" as const, text: "We have emailed the receipt to the address on your account." } },
  { customer: undefined, guest: { name: "Daniel Moore", email: "daniel.moore@example.com", phone: "010-5550-0201" }, camper: 17, subject: "English-speaking pickup at Incheon?", message: "We are visiting Korea from abroad. Is there English-speaking staff for the airport pickup?", reply: undefined },
  { customer: undefined, guest: { name: "Ara Seo", email: "ara.seo@example.com", phone: "010-5550-0202" }, camper: undefined, subject: "Corporate team retreat", message: "Our company wants to rent five campers for a team retreat in May. Do you offer group discounts?", reply: undefined },
  { customer: undefined, guest: { name: "Junho Bae", email: "junho.bae@example.com" }, camper: 14, subject: "Experience needed for the 4x4?", message: "I have never driven off-road. Is the Trailhead 4x4 suitable for a beginner?", reply: undefined },
  { customer: 5, camper: undefined, subject: "Pet policy", message: "Which campers allow dogs? We have a medium-sized retriever.", reply: undefined },
  { customer: undefined, guest: { name: "Mina Go", email: "mina.go@example.com", phone: "010-5550-0203" }, camper: 9, subject: "Child seats", message: "Does the Chuncheon Lakeside Family have ISOFIX points for two child seats?", reply: undefined },
];
