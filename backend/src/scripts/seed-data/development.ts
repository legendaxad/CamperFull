/*
 * Fixture data for `npm run seed:dev`. Every person, email address and phone
 * number here is fictional: emails use the reserved example.com / .test
 * domains and phone numbers use the 555 range. Camping places use real
 * Korean regions for realism, but their contact details are invented.
 */
import { CamperStatus, DiscountType, ExtraChargeType, FuelType, LicenseType, Transmission } from "../../constants/enums";

/** Development-only passwords. They are documented in backend/.local/seed-report.md (git-ignored). */
export const DEV_CUSTOMER_PASSWORD = "CamperDev2026!";
export const DEV_ADMIN_PASSWORD = "AdminDev2026!";

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`;

/* Every photo id below was checked to resolve and to show what it is used for. */
const PHOTO = {
  airstreamCaravan: unsplash("1523987355523-c7b5b0dd90a7"),
  popTopVan: unsplash("1527786356703-4b100091cd2c"),
  vintageBus: unsplash("1561361513-2d000a50f0dc"),
  vanOnRoad: unsplash("1469854523086-cc02fe5d8800"),
  vanAtSunset: unsplash("1515876305430-f06edab8282a"),
  trailerCamp: unsplash("1525811902-f2342640856e"),
  viewFromVan: unsplash("1563299796-17596ed6b017"),
  forestTentView: unsplash("1504280390367-361c6d9f38f4"),
  campfire: unsplash("1478131143081-80f7f84ca84d"),
  mistyMeadow: unsplash("1533873984035-25970ab07461"),
  milkyWayTent: unsplash("1517824806704-9040b037703b"),
  desertSunrise: unsplash("1496545672447-f699b503d270"),
  forestTentsNight: unsplash("1487730116645-74489c95b41b"),
  mountainSunset: unsplash("1510312305653-8ed496efae75"),
  alpineNight: unsplash("1500581276021-a4bbcd0050c5"),
  lakesideTent: unsplash("1537905569824-f89f14cceb68"),
  meadowTent: unsplash("1571863533956-01c88e79957e"),
  tentWithView: unsplash("1532339142463-fd0a8979791a"),
  lakeTentDog: unsplash("1508873696983-2dfd5898f08b"),
} as const;

export const SETTINGS = {
  businessName: "FullCamper",
  contactEmail: "hello@fullcamper.test",
  contactPhone: "02-555-0199",
  address: "55 Sample-ro, Mapo-gu, Seoul (fictional address)",
  bookingHoldMinutes: 30,
  freeCancellationDays: 3,
  minLeadDays: 1,
  maxAdvanceDays: 365,
  pickupTime: "15:00",
  returnTime: "11:00",
  weekendNights: [5, 6],
};

export const ADMINS = [
  { key: "super", firstName: "Sora", lastName: "Baek", email: "superadmin@fullcamper.test", phone: "010-5550-9001", role: "SUPER_ADMIN" as const },
  { key: "ops", firstName: "Jaewon", lastName: "Shin", email: "ops.admin@fullcamper.test", phone: "010-5550-9002", role: "ADMIN" as const },
];

export const CUSTOMERS = [
  { firstName: "Minjun", lastName: "Kim", email: "minjun.kim@example.com", phone: "010-5550-0101" },
  { firstName: "Seoyeon", lastName: "Lee", email: "seoyeon.lee@example.com", phone: "010-5550-0102" },
  { firstName: "Jiho", lastName: "Park", email: "jiho.park@example.com", phone: "010-5550-0103" },
  { firstName: "Yuna", lastName: "Choi", email: "yuna.choi@example.com", phone: "010-5550-0104" },
  { firstName: "Hyunwoo", lastName: "Jung", email: "hyunwoo.jung@example.com", phone: "010-5550-0105" },
  { firstName: "Soojin", lastName: "Kang", email: "soojin.kang@example.com", phone: "010-5550-0106" },
  { firstName: "Taeyang", lastName: "Yoon", email: "taeyang.yoon@example.com", phone: "010-5550-0107" },
  { firstName: "Eunji", lastName: "Han", email: "eunji.han@example.com", phone: "010-5550-0108" },
  { firstName: "Dohyun", lastName: "Lim", email: "dohyun.lim@example.com", phone: "010-5550-0109" },
  { firstName: "Haneul", lastName: "Oh", email: "haneul.oh@example.com", phone: "010-5550-0110" },
];

export const CATEGORIES = [
  { name: "Motorhome", description: "Self-contained motorhomes with kitchen, bathroom and beds for the whole family.", sortOrder: 1 },
  { name: "Camper Van", description: "Compact vans that drive like a car and park anywhere.", sortOrder: 2 },
  { name: "Caravan", description: "Towable caravans for longer stays at one campsite.", sortOrder: 3 },
  { name: "Pop-top Van", description: "Vans with a lifting roof for standing room and an extra bed.", sortOrder: 4 },
  { name: "Truck Camper", description: "Pickup trucks with a demountable cabin for rough roads.", sortOrder: 5 },
  { name: "Off-road Expedition", description: "4x4 builds for remote trails and off-grid trips.", sortOrder: 6 },
  { name: "Luxury Motorhome", description: "Premium motorhomes with high-end finishes and comfort.", sortOrder: 7 },
  { name: "Teardrop Trailer", description: "Lightweight two-person trailers that almost any car can tow.", sortOrder: 8 },
  { name: "Tuning", description: "Custom-built and tuned campers from Korean workshops.", sortOrder: 9 },
  { name: "Used", description: "Well-maintained pre-owned and classic campers.", sortOrder: 10 },
];

export const FEATURES = [
  { name: "Heating while driving", group: "Comfort", icon: "heater" },
  { name: "Solar panel", group: "Power", icon: "solar" },
  { name: "Kitchenette", group: "Kitchen", icon: "kitchen" },
  { name: "Indoor shower", group: "Bathroom", icon: "shower" },
  { name: "Air conditioning", group: "Comfort", icon: "ac" },
  { name: "Awning", group: "Outdoor", icon: "awning" },
  { name: "Cassette toilet", group: "Bathroom", icon: "bathroom" },
  { name: "Pet friendly", group: "Policies", icon: "pet" },
  { name: "Bike rack", group: "Outdoor", icon: "bike" },
  { name: "Rear-view camera", group: "Safety", icon: "camera" },
];

const STANDARD_EXTRAS = {
  bedding: { name: "Bedding kit (per person)", price: 15000, chargeType: ExtraChargeType.PER_BOOKING, maxQuantity: 4 },
  chairs: { name: "Camping chairs & table", price: 10000, chargeType: ExtraChargeType.PER_NIGHT, maxQuantity: 1 },
  grill: { name: "Charcoal BBQ grill set", price: 25000, chargeType: ExtraChargeType.PER_BOOKING, maxQuantity: 1 },
  generator: { name: "Portable power station", price: 20000, chargeType: ExtraChargeType.PER_NIGHT, maxQuantity: 1 },
  bikes: { name: "Bicycle rental", price: 12000, chargeType: ExtraChargeType.PER_NIGHT, maxQuantity: 4 },
};

/** `features` are indexes into FEATURES, `category` an index into CATEGORIES. */
export const CAMPERS = [
  {
    name: "Hanbit Cruiser M7", category: 0, features: [0, 1, 2, 3, 6, 9], isFeatured: true,
    brand: "Hyundai", company: "Hanbit Camping Rentals", baseVehicle: "Hyundai Porter II", modelYear: 2024,
    licenseType: LicenseType.CLASS1_ORDINARY, capacity: { seats: 4, sleeps: 4 },
    specifications: { lengthMm: 5900, widthMm: 2050, heightMm: 3050, weightKg: 3480, fuelType: FuelType.DIESEL, transmission: Transmission.AUTOMATIC, engine: "2.5L CRDi", mileageKm: 18400 },
    location: { region: "Gyeonggi-do", city: "Goyang", address: "Ilsan Lake Park east parking lot", pickupNotes: "Pickup at the green container office. Bring your driving licence." },
    pricing: { dailyRate: 170000, weekendDailyRate: 210000, cleaningFee: 50000, securityDeposit: 300000 },
    extras: [STANDARD_EXTRAS.bedding, STANDARD_EXTRAS.chairs, STANDARD_EXTRAS.grill], minNights: 2, maxNights: 14,
    description: "A family motorhome on the reliable Porter II chassis with a full kitchenette, indoor shower and cassette toilet. The over-cab bed and convertible dinette sleep four, and diesel heating keeps the cabin warm year-round.",
    highlights: [
      { title: "Warm in every season", description: "Diesel heating runs while driving and parked, so winter trips to Gangwon-do stay comfortable." },
      { title: "Self-contained", description: "100 L fresh water, indoor shower and toilet let you stay off-grid for two nights." },
    ],
    images: [PHOTO.vanOnRoad, PHOTO.viewFromVan, PHOTO.forestTentView],
  },
  {
    name: "Coastline Van 2", category: 1, features: [1, 2, 5, 9], isFeatured: false,
    brand: "Kia", company: "Busan Coast Campers", baseVehicle: "Kia Bongo III", modelYear: 2023,
    licenseType: LicenseType.CLASS2_ORDINARY, capacity: { seats: 3, sleeps: 2 },
    specifications: { lengthMm: 5100, widthMm: 1900, heightMm: 2450, weightKg: 2650, fuelType: FuelType.DIESEL, transmission: Transmission.AUTOMATIC, engine: "2.5L diesel", mileageKm: 26300 },
    location: { region: "Busan", city: "Haeundae-gu", address: "Songjeong beach rental lot", pickupNotes: "Free parking for your car during the trip." },
    pricing: { dailyRate: 120000, weekendDailyRate: 150000, cleaningFee: 40000, securityDeposit: 200000 },
    extras: [STANDARD_EXTRAS.bedding, STANDARD_EXTRAS.chairs], minNights: 1, maxNights: 10,
    description: "A nimble camper van for couples who want to follow the southern coastline. Fits in normal parking spaces, has a slide-out kitchen and a solar-powered fridge.",
    highlights: [
      { title: "Drives like a car", description: "Licence class 2 is enough, and it fits standard parking bays." },
      { title: "Coastal routes", description: "We share our favourite Busan-Namhae coastal itinerary at pickup." },
    ],
    images: [PHOTO.vanAtSunset, PHOTO.viewFromVan],
  },
  {
    name: "Adria Altea 4-Berth", category: 2, features: [2, 3, 5, 6, 7], isFeatured: true,
    brand: "Adria", company: "Gangwon Caravan Park", baseVehicle: "Single-axle caravan", modelYear: 2022,
    licenseType: LicenseType.SPECIAL_TRAILER, capacity: { seats: 4, sleeps: 4 },
    specifications: { lengthMm: 6900, widthMm: 2300, heightMm: 2580, weightKg: 1350, fuelType: FuelType.NONE, transmission: Transmission.NONE },
    location: { region: "Gangwon-do", city: "Pyeongchang", address: "Daegwallyeong camp depot", pickupNotes: "Towing hitch check takes about 20 minutes. Delivery to nearby campsites on request." },
    pricing: { dailyRate: 140000, weekendDailyRate: 170000, cleaningFee: 60000, securityDeposit: 400000 },
    extras: [STANDARD_EXTRAS.bedding, STANDARD_EXTRAS.grill, STANDARD_EXTRAS.generator], minNights: 2, maxNights: 21,
    description: "A bright European caravan with a fixed double bed, a dinette that converts into a second bed, and a full washroom. Pets are welcome.",
    highlights: [
      { title: "Room to spread out", description: "Large windows and a separate washroom make longer stays easy." },
      { title: "Pets welcome", description: "Bring your dog. A pet blanket and bowls are included." },
    ],
    images: [PHOTO.airstreamCaravan, PHOTO.campfire, PHOTO.mistyMeadow],
  },
  {
    name: "Seaside Pop-top T6", category: 3, features: [0, 1, 2, 5, 8], isFeatured: true,
    brand: "Volkswagen", company: "Jeju Island Vans", baseVehicle: "Volkswagen Transporter T6.1", modelYear: 2022,
    licenseType: LicenseType.CLASS2_ORDINARY, capacity: { seats: 4, sleeps: 4 },
    specifications: { lengthMm: 4904, widthMm: 1904, heightMm: 1990, weightKg: 2400, fuelType: FuelType.DIESEL, transmission: Transmission.AUTOMATIC, engine: "2.0L TDI", mileageKm: 41200 },
    location: { region: "Jeju-do", city: "Jeju-si", address: "Jeju airport rental village, zone C", pickupNotes: "Free shuttle from the airport arrivals hall." },
    pricing: { dailyRate: 190000, weekendDailyRate: 230000, cleaningFee: 45000, securityDeposit: 300000 },
    extras: [STANDARD_EXTRAS.bedding, STANDARD_EXTRAS.chairs, STANDARD_EXTRAS.bikes], minNights: 2, maxNights: 14,
    description: "The classic pop-top experience on Jeju. Lift the roof for a second double bed and standing room, open the side door to the ocean, and cook on the two-burner hob.",
    highlights: [
      { title: "Roof bed with a view", description: "The pop-top sleeps two more under a canvas with zip-open windows." },
      { title: "Island ready", description: "Bike rack included. Jeju's coastal cycle path starts at pickup." },
    ],
    images: [PHOTO.popTopVan, PHOTO.meadowTent],
  },
  {
    name: "Ridgeback Truck Camper", category: 4, features: [0, 1, 2, 9], isFeatured: false,
    brand: "KGM", company: "Ridgeback Outdoors", baseVehicle: "KGM Rexton Sports Khan", modelYear: 2024,
    licenseType: LicenseType.CLASS2_ORDINARY, capacity: { seats: 4, sleeps: 2 },
    specifications: { lengthMm: 5405, widthMm: 1950, heightMm: 2850, weightKg: 2950, fuelType: FuelType.DIESEL, transmission: Transmission.AUTOMATIC, engine: "2.2L e-XDi", mileageKm: 9600 },
    location: { region: "Gangwon-do", city: "Inje", address: "Inje Riverside base", pickupNotes: "4WD briefing included at pickup." },
    pricing: { dailyRate: 180000, weekendDailyRate: 220000, cleaningFee: 50000, securityDeposit: 400000 },
    extras: [STANDARD_EXTRAS.grill, STANDARD_EXTRAS.generator], minNights: 2, maxNights: 10,
    description: "A 4WD pickup with a demountable cabin. Reach forest roads and riverside spots a motorhome cannot, then sleep in a proper double bed.",
    highlights: [
      { title: "4WD capability", description: "Low-range gearbox and all-terrain tyres for gravel forest roads." },
      { title: "Off-grid power", description: "200 W solar and a lithium battery run the fridge for days." },
    ],
    images: [PHOTO.trailerCamp, PHOTO.lakesideTent],
  },
  {
    name: "Trailhead 4x4 Expedition", category: 5, features: [0, 1, 2, 3, 5, 9], isFeatured: false,
    brand: "Mercedes-Benz", company: "Trailhead Overland", baseVehicle: "Mercedes-Benz Sprinter 4x4", modelYear: 2023,
    licenseType: LicenseType.CLASS1_ORDINARY, capacity: { seats: 4, sleeps: 3 },
    specifications: { lengthMm: 5932, widthMm: 2020, heightMm: 2920, weightKg: 3500, fuelType: FuelType.DIESEL, transmission: Transmission.AUTOMATIC, engine: "3.0L V6 CDI", mileageKm: 22700 },
    location: { region: "Gangwon-do", city: "Chuncheon", address: "Soyang Lake trailhead garage", pickupNotes: "Recovery kit and satellite messenger included." },
    pricing: { dailyRate: 290000, weekendDailyRate: 340000, cleaningFee: 70000, securityDeposit: 800000 },
    extras: [STANDARD_EXTRAS.bedding, STANDARD_EXTRAS.chairs, STANDARD_EXTRAS.generator], minNights: 3, maxNights: 21,
    description: "A 4x4 Sprinter built for remote expeditions. It has a fixed rear bed, a hot shower and enough water and power for several days away from campsites.",
    highlights: [
      { title: "Go further", description: "Permanent 4x4 with raised suspension and underbody protection." },
      { title: "Days off-grid", description: "150 L water, 400 Ah lithium and 300 W solar." },
    ],
    images: [PHOTO.viewFromVan, PHOTO.tentWithView, PHOTO.alpineNight],
  },
  {
    name: "Grand Voyage Liner", category: 6, features: [0, 1, 2, 3, 4, 5, 6, 9], isFeatured: true,
    brand: "Hymer", company: "Seoul Premium Motorhomes", baseVehicle: "Mercedes-Benz Sprinter", modelYear: 2025,
    licenseType: LicenseType.CLASS1_ORDINARY, capacity: { seats: 5, sleeps: 4 },
    specifications: { lengthMm: 7390, widthMm: 2220, heightMm: 2960, weightKg: 3500, fuelType: FuelType.DIESEL, transmission: Transmission.AUTOMATIC, engine: "2.0L OM654", mileageKm: 5200 },
    location: { region: "Seoul", city: "Gangseo-gu", address: "Magok premium rental lounge", pickupNotes: "Pickup includes a 30-minute guided handover." },
    pricing: { dailyRate: 420000, weekendDailyRate: 490000, cleaningFee: 90000, securityDeposit: 1000000 },
    extras: [STANDARD_EXTRAS.bedding, STANDARD_EXTRAS.chairs, STANDARD_EXTRAS.grill, STANDARD_EXTRAS.bikes], minNights: 2, maxNights: 21,
    description: "Our flagship motorhome: queen-size island bed, separate shower cubicle, air conditioning in the cab and living area, and a lounge that seats five.",
    highlights: [
      { title: "Hotel comfort", description: "Island bed with a memory-foam mattress and blackout blinds throughout." },
      { title: "Climate control", description: "Roof air conditioning plus diesel hot-air heating." },
    ],
    images: [PHOTO.airstreamCaravan, PHOTO.mountainSunset, PHOTO.viewFromVan],
  },
  {
    name: "Pebble Teardrop Mini", category: 7, features: [1, 5, 7], isFeatured: false,
    brand: "Pebble", company: "Gapyeong Mini Trailers", baseVehicle: "Teardrop trailer", modelYear: 2023,
    licenseType: LicenseType.SPECIAL_TRAILER, capacity: { seats: 2, sleeps: 2 },
    specifications: { lengthMm: 3600, widthMm: 1700, heightMm: 1650, weightKg: 620, fuelType: FuelType.NONE, transmission: Transmission.NONE },
    location: { region: "Gyeonggi-do", city: "Gapyeong", address: "Gapyeong station camp hub", pickupNotes: "Most SUVs can tow it. We check your hitch at pickup." },
    pricing: { dailyRate: 75000, weekendDailyRate: 95000, cleaningFee: 25000, securityDeposit: 150000 },
    extras: [STANDARD_EXTRAS.chairs, STANDARD_EXTRAS.grill], minNights: 1, maxNights: 14,
    description: "A cosy two-person teardrop with a queen mattress inside and an outdoor galley kitchen at the back. Light enough for most SUVs.",
    highlights: [
      { title: "Tow with your car", description: "Only 620 kg. A small trailer licence is enough." },
      { title: "Outdoor galley", description: "Rear hatch kitchen with a gas stove, cool box and storage." },
    ],
    images: [PHOTO.trailerCamp, PHOTO.forestTentsNight],
  },
  {
    name: "Nightfox Custom Starex", category: 8, features: [0, 1, 2, 4, 9], isFeatured: false,
    brand: "Hyundai", company: "Nightfox Custom Works", baseVehicle: "Hyundai Grand Starex", modelYear: 2021,
    licenseType: LicenseType.CLASS2_ORDINARY, capacity: { seats: 4, sleeps: 2 },
    specifications: { lengthMm: 5150, widthMm: 1920, heightMm: 2300, weightKg: 2600, fuelType: FuelType.DIESEL, transmission: Transmission.AUTOMATIC, engine: "2.5L VGT", mileageKm: 63800 },
    location: { region: "Jeollanam-do", city: "Yeosu", address: "Yeosu Expo station garage", pickupNotes: "Late pickups up to 21:00 by arrangement." },
    pricing: { dailyRate: 135000, weekendDailyRate: 165000, cleaningFee: 40000, securityDeposit: 250000 },
    extras: [STANDARD_EXTRAS.bedding, STANDARD_EXTRAS.chairs], minNights: 1, maxNights: 14,
    description: "A workshop-tuned Grand Starex with ambient lighting, a rotating passenger seat, a fold-out bed and a compact kitchen block. Great for night views over Yeosu bay.",
    highlights: [
      { title: "Custom interior", description: "Walnut cabinetry and dimmable LED lighting from Nightfox Custom Works." },
      { title: "Rotating seat", description: "The passenger seat turns into the lounge for a four-seat dinette." },
    ],
    images: [PHOTO.vanAtSunset, PHOTO.milkyWayTent],
  },
  {
    name: "Classic Westy 1978", category: 9, features: [2, 5], isFeatured: false, status: CamperStatus.MAINTENANCE,
    brand: "Volkswagen", company: "Retro Road Busan", baseVehicle: "Volkswagen Type 2 (T2)", modelYear: 1978,
    licenseType: LicenseType.CLASS2_ORDINARY, capacity: { seats: 4, sleeps: 2 },
    specifications: { lengthMm: 4505, widthMm: 1720, heightMm: 2040, weightKg: 1500, fuelType: FuelType.GASOLINE, transmission: Transmission.MANUAL, engine: "2.0L air-cooled", mileageKm: 184000 },
    location: { region: "Busan", city: "Suyeong-gu", address: "Gwangalli retro garage", pickupNotes: "Manual gearbox. A short driving lesson is included." },
    pricing: { dailyRate: 110000, weekendDailyRate: 140000, cleaningFee: 30000, securityDeposit: 300000 },
    extras: [STANDARD_EXTRAS.chairs], minNights: 1, maxNights: 7,
    description: "A lovingly restored 1978 bus with its original pop-top and plaid interior. It is currently in for an engine service.",
    highlights: [{ title: "Pure nostalgia", description: "Original interior, restored chrome and a cassette player." }],
    images: [PHOTO.vintageBus, PHOTO.lakeTentDog],
  },
];

export const CAMPING_PLACES = [
  { name: "Seoraksan Seorak-dong Campground", city: "Sokcho", region: "Gangwon-do", coordinates: { latitude: 38.1717, longitude: 128.4895 }, phone: "033-555-0101", workingHours: { from: "09:00", to: "21:00" }, facilities: ["Restrooms", "Showers", "Electricity", "Parking", "Hiking trails"], description: "At the foot of Seoraksan, a short walk from the national park entrance. Autumn colours here are among the best in Korea.", images: [PHOTO.mountainSunset, PHOTO.forestTentView] },
  { name: "Jirisan Dalgung Auto Camping", city: "Namwon", region: "Jeollabuk-do", coordinates: { latitude: 35.3536, longitude: 127.6004 }, phone: "063-555-0102", workingHours: { from: "10:00", to: "20:00" }, facilities: ["Restrooms", "Parking", "BBQ area", "Valley swimming"], description: "Shaded pitches along a clear mountain stream in Jirisan National Park.", images: [PHOTO.forestTentsNight, PHOTO.campfire] },
  { name: "Hallasan Gwaneumsa Campground", city: "Jeju-si", region: "Jeju-do", coordinates: { latitude: 33.4235, longitude: 126.5509 }, phone: "064-555-0103", workingHours: { from: "09:00", to: "18:00" }, facilities: ["Restrooms", "Showers", "Parking", "Trailhead access"], description: "Forest campground at the start of the Gwaneumsa trail to the summit of Hallasan.", images: [PHOTO.meadowTent, PHOTO.mistyMeadow] },
  { name: "Nanji Han River Camping", city: "Mapo-gu", region: "Seoul", coordinates: { latitude: 37.5665, longitude: 126.8766 }, phone: "02-555-0104", workingHours: { from: "11:00", to: "22:00" }, facilities: ["Restrooms", "Electricity", "Convenience store", "Bike rentals"], description: "City camping on the Han River, with sunset views over the water and bike paths into Seoul.", images: [PHOTO.lakesideTent, PHOTO.campfire] },
  { name: "Jaraseom Island Auto Camping", city: "Gapyeong", region: "Gyeonggi-do", coordinates: { latitude: 37.8215, longitude: 127.5106 }, phone: "031-555-0105", workingHours: { from: "10:00", to: "21:00" }, facilities: ["Restrooms", "Showers", "Electricity", "Caravan pitches", "Playground"], description: "Large riverside camping island with dedicated caravan and motorhome pitches.", images: [PHOTO.trailerCamp, PHOTO.lakeTentDog] },
  { name: "Mongsanpo Beach Campground", city: "Taean", region: "Chungcheongnam-do", coordinates: { latitude: 36.6716, longitude: 126.1336 }, phone: "041-555-0106", workingHours: { from: "09:00", to: "20:00" }, facilities: ["Restrooms", "Showers", "Pine forest", "Beach access"], description: "Pitches in a pine forest a few steps from a wide sandy beach on the Taean coast.", images: [PHOTO.desertSunrise, PHOTO.mistyMeadow] },
  { name: "Hakdong Pebble Beach Camp", city: "Geoje", region: "Gyeongsangnam-do", coordinates: { latitude: 34.7728, longitude: 128.6402 }, phone: "055-555-0107", workingHours: { from: "10:00", to: "20:00" }, facilities: ["Restrooms", "Parking", "Sea view", "Kayak rentals"], description: "Fall asleep to waves rolling over black pebbles on Geoje island.", images: [PHOTO.tentWithView, PHOTO.lakesideTent] },
  { name: "Andong Riverside Campground", city: "Andong", region: "Gyeongsangbuk-do", coordinates: { latitude: 36.5684, longitude: 128.7294 }, phone: "054-555-0108", workingHours: { from: "10:00", to: "21:00" }, facilities: ["Restrooms", "Electricity", "BBQ area", "Walking trails"], description: "Quiet riverside pitches close to the Hahoe folk village.", images: [PHOTO.campfire, PHOTO.forestTentsNight] },
  { name: "Sobaeksan Danyang Auto Camping", city: "Danyang", region: "Chungcheongbuk-do", coordinates: { latitude: 36.9845, longitude: 128.3655 }, phone: "043-555-0109", workingHours: { from: "09:00", to: "21:00" }, facilities: ["Restrooms", "Showers", "Electricity", "Paragliding nearby"], description: "Mountain campground with views of Sobaeksan and the Namhan River.", images: [PHOTO.alpineNight, PHOTO.milkyWayTent] },
  { name: "Odongdo Seaside Camp", city: "Yeosu", region: "Jeollanam-do", coordinates: { latitude: 34.7441, longitude: 127.7663 }, phone: "061-555-0110", workingHours: { from: "11:00", to: "22:00" }, facilities: ["Restrooms", "Electricity", "Night views", "Seafood market nearby"], description: "Seaside pitches looking out over Yeosu's famous night skyline.", images: [PHOTO.milkyWayTent, PHOTO.tentWithView] },
];

const DAY = 24 * 60 * 60 * 1000;
/** Coupon dates are relative to the moment the seed runs. */
export const couponFixtures = (now: Date) => [
  { code: "WELCOME10", description: "10% off your first trip (up to 100,000 KRW)", discountType: DiscountType.PERCENTAGE, discountValue: 10, maxDiscountAmount: 100000, perCustomerLimit: 1 },
  { code: "WEEKDAY20K", description: "20,000 KRW off weekday trips over 300,000 KRW", discountType: DiscountType.FIXED, discountValue: 20000, minBookingAmount: 300000 },
  { code: "LONGSTAY15", description: "15% off stays over 1,000,000 KRW (up to 250,000 KRW)", discountType: DiscountType.PERCENTAGE, discountValue: 15, minBookingAmount: 1000000, maxDiscountAmount: 250000 },
  { code: "FAMILY30K", description: "30,000 KRW off family trips over 500,000 KRW", discountType: DiscountType.FIXED, discountValue: 30000, minBookingAmount: 500000 },
  { code: "AUTUMN2026", description: "Autumn foliage promotion (ended)", discountType: DiscountType.PERCENTAGE, discountValue: 12, maxDiscountAmount: 120000, startsAt: new Date(now.getTime() - 80 * DAY), expiresAt: new Date(now.getTime() - 10 * DAY) },
  { code: "WINTER2027", description: "Winter camping promotion (starts soon)", discountType: DiscountType.PERCENTAGE, discountValue: 10, maxDiscountAmount: 100000, startsAt: new Date(now.getTime() + 8 * DAY), expiresAt: new Date(now.getTime() + 98 * DAY) },
  { code: "EARLYBIRD8", description: "8% off for the first 100 bookings", discountType: DiscountType.PERCENTAGE, discountValue: 8, maxDiscountAmount: 80000, usageLimit: 100 },
  { code: "FIRSTTRIP50K", description: "50,000 KRW off a first trip over 400,000 KRW", discountType: DiscountType.FIXED, discountValue: 50000, minBookingAmount: 400000, perCustomerLimit: 1, usageLimit: 200 },
  { code: "CAMPFIRE5", description: "5% off any booking", discountType: DiscountType.PERCENTAGE, discountValue: 5 },
  { code: "PARTNER-LEGACY", description: "Retired partner code (inactive)", discountType: DiscountType.FIXED, discountValue: 10000, isActive: false },
];

/**
 * Past trips (one per customer, each on a different camper so dates never
 * overlap). Offsets are days before "today" in the business timezone.
 */
export const PAST_TRIPS = [
  { customer: 0, camper: 0, startDaysAgo: 300, nights: 3, leadDays: 21, extras: [0], rating: 5, comment: "Spotless motorhome and a very clear handover. The diesel heater was a lifesaver on a frosty night near Pyeongchang." },
  { customer: 1, camper: 1, startDaysAgo: 260, nights: 2, leadDays: 14, extras: [], rating: 4, comment: "Perfect size for two of us along the Busan coast. The fridge is a bit small, but everything else was great." },
  { customer: 2, camper: 2, startDaysAgo: 225, nights: 4, leadDays: 30, extras: [0, 1], rating: 5, comment: "Our dog loved it as much as we did. The caravan was delivered to the campsite and set up for us." },
  { customer: 3, camper: 3, startDaysAgo: 190, nights: 3, leadDays: 10, extras: [2], rating: 3, comment: "Lovely van and a great Jeju experience, but the pop-top canvas had a small tear that let in some rain." },
  { customer: 4, camper: 4, startDaysAgo: 150, nights: 2, leadDays: 25, extras: [], rating: 5, comment: "Took it up forest roads in Inje that a normal camper could never handle. The 4WD briefing was really helpful." },
  { customer: 5, camper: 5, startDaysAgo: 120, nights: 5, leadDays: 18, extras: [0], rating: 4, comment: "Five days fully off-grid around Soyang Lake. Solar kept up easily. Pricey, but worth it for the capability." },
  { customer: 6, camper: 6, startDaysAgo: 95, nights: 3, leadDays: 12, extras: [0, 3], rating: 5, comment: "Felt like a hotel on wheels. The island bed and the air conditioning made a summer trip with the kids easy." },
  { customer: 7, camper: 7, startDaysAgo: 70, nights: 2, leadDays: 28, extras: [1], rating: 4, comment: "Our SUV towed it without any trouble. Cooking at the rear galley under the stars was the highlight." },
  { customer: 8, camper: 8, startDaysAgo: 40, nights: 3, leadDays: 9, extras: [], rating: 2, comment: "The interior looks great, but the leisure battery died on the second night and we had to drive back for a swap." },
  { customer: 9, camper: 9, startDaysAgo: 18, nights: 2, leadDays: 15, extras: [0], rating: 5, comment: "Driving a 1978 bus along Gwangalli was unforgettable. The short manual-gearbox lesson helped a lot." },
];

/** Admin replies added to some reviews, keyed by PAST_TRIPS index. */
export const REVIEW_REPLIES: Record<number, string> = {
  3: "Thank you for letting us know. The canvas has been replaced, and we have refunded part of your cleaning fee.",
  8: "We are sorry about the battery. It has been replaced with a new lithium unit, and we have contacted you about a partial refund.",
};

/** A trip that is happening right now (started yesterday). */
export const ACTIVE_TRIP = { customer: 3, camper: 0, startDaysAgo: 1, nights: 4, leadDays: 20, extras: [1] };

/** Future bookings created through the real booking service. */
export const UPCOMING_TRIPS = [
  { customer: 0, camper: 1, startInDays: 10, nights: 3, extras: [0], couponCode: undefined, outcome: "PENDING" as const, note: "Arriving by KTX. Could we pick up around 16:00?" },
  { customer: 1, camper: 3, startInDays: 21, nights: 4, extras: [0, 2], couponCode: "WELCOME10", outcome: "CONFIRMED" as const, note: "Anniversary trip. Any quiet campsite recommendations are welcome!" },
  { customer: 2, camper: 6, startInDays: 30, nights: 2, extras: [], couponCode: undefined, outcome: "CANCELLED" as const, note: undefined },
];

/** Favorites as [customer index, camper index]. */
export const FAVORITES: [number, number][] = [
  [0, 6], [0, 3], [1, 0], [2, 4], [3, 7], [4, 2], [5, 6], [6, 8], [7, 1], [8, 5],
];

/** Contact inquiries. `customer` links to a member; guests have their own fictional details. */
export const INQUIRIES = [
  { customer: 0, camper: 6, subject: "Is the Grand Voyage Liner available over New Year?", message: "We are a family of four and would love to take the Grand Voyage Liner from December 30 to January 2. Is winter equipment included?", reply: { status: "RESOLVED" as const, text: "Yes, winter tyres and an extra heater are included from December to February. The dates are open for booking now." } },
  { customer: 1, camper: 2, subject: "Towing licence question", message: "Do I need a special licence to tow the Adria Altea, or is a normal class 2 licence enough?", reply: { status: "RESOLVED" as const, text: "The Altea weighs over 750 kg, so a small trailer towing licence (소형견인) is required." } },
  { customer: 4, camper: 4, subject: "Can I take the truck camper to Jeju?", message: "Is it allowed to take the Ridgeback Truck Camper on the ferry from Mokpo to Jeju?", reply: { status: "IN_PROGRESS" as const, text: "We are checking ferry insurance coverage with our partner. We will reply within one business day." } },
  { customer: 7, camper: 7, subject: "Bike rack for the teardrop?", message: "Can a bike rack be mounted on the Pebble Teardrop, or should we bring a roof rack for our car?", reply: undefined },
  { customer: 9, camper: undefined, subject: "Receipt for my last trip", message: "Could you send me a business receipt for my trip with the Classic Westy? I need it for my company.", reply: { status: "RESOLVED" as const, text: "We have emailed the receipt to the address on your account." } },
  { customer: undefined, guest: { name: "Daniel Moore", email: "daniel.moore@example.com", phone: "010-5550-0201" }, camper: 3, subject: "English-speaking pickup on Jeju?", message: "We are visiting Korea from abroad. Does the Jeju office have English-speaking staff at pickup?", reply: undefined },
  { customer: undefined, guest: { name: "Ara Seo", email: "ara.seo@example.com", phone: "010-5550-0202" }, camper: undefined, subject: "Corporate team retreat", message: "Our company wants to rent five campers for a team retreat in May. Do you offer group discounts?", reply: undefined },
  { customer: undefined, guest: { name: "Junho Bae", email: "junho.bae@example.com" }, camper: 5, subject: "Experience needed for the 4x4?", message: "I have never driven off-road. Is the Trailhead 4x4 suitable for a beginner?", reply: undefined },
  { customer: 5, camper: undefined, subject: "Pet policy", message: "Which campers allow dogs? We have a medium-sized retriever.", reply: undefined },
  { customer: undefined, guest: { name: "Mina Go", email: "mina.go@example.com", phone: "010-5550-0203" }, camper: 0, subject: "Child seats", message: "Does the Hanbit Cruiser have ISOFIX points for two child seats?", reply: undefined },
];

/** Same shape as the portfolio profile: a list of in-progress trips. */
export const ACTIVE_TRIPS = [ACTIVE_TRIP];
