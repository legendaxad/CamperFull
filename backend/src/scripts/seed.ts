/*
 * Development seed based on the customer frontend's mock data (motors,
 * caravans, tuning, used campers and camping places). Refuses to run in
 * production and only inserts into empty collections, so it never
 * overwrites real data.
 */
import { env } from "../config/env";
import { CamperStatus, ExtraChargeType, FuelType, LicenseType, Transmission } from "../constants/enums";
import { connectDatabase, disconnectDatabase } from "../database/connection";
import { CamperModel, CampingPlaceModel, CategoryModel, CouponModel, FeatureModel } from "../models";
import { settingsService } from "../services/Settings.service";
import { slugify } from "../utils/strings";

const categories = [
  { name: "Motorhome", description: "Self-driving camper vans and motorhomes", sortOrder: 1 },
  { name: "Caravan", description: "Towable caravans for longer stays", sortOrder: 2 },
  { name: "Tuning", description: "Custom-built and tuned campers", sortOrder: 3 },
  { name: "Used", description: "Well-maintained pre-owned campers", sortOrder: 4 },
];

const features = [
  { name: "Heating while driving", group: "Comfort", icon: "heater" },
  { name: "Solar panel", group: "Power", icon: "solar" },
  { name: "Kitchenette", group: "Kitchen", icon: "kitchen" },
  { name: "Shower", group: "Bathroom", icon: "shower" },
  { name: "Air conditioning", group: "Comfort", icon: "ac" },
  { name: "Awning", group: "Outdoor", icon: "awning" },
];

const campers = [
  { name: "르벤투스S+", category: "Motorhome", brand: "Renault", company: "다온티앤티", baseVehicle: "르노마스터", modelYear: 2022, licenseType: LicenseType.CLASS1_ORDINARY, seats: 4, sleeps: 4, region: "수도권", dailyRate: 180000, featured: true },
  { name: "ST-7", category: "Motorhome", brand: "Hyundai", company: "스타캠핑카", baseVehicle: "포터2", modelYear: 2023, licenseType: LicenseType.CLASS1_ORDINARY, seats: 4, sleeps: 3, region: "수도권", dailyRate: 160000, featured: false },
  { name: "Luxury Glide", category: "Caravan", brand: "Hymer", company: "Green Campers", modelYear: 2024, licenseType: LicenseType.SPECIAL_TRAILER, seats: 6, sleeps: 6, region: "전국", dailyRate: 450000, featured: true },
  { name: "Eco Traveler", category: "Caravan", brand: "Knaus", company: "Nomad Ventures", modelYear: 2022, licenseType: LicenseType.CLASS2_ORDINARY, seats: 4, sleeps: 4, region: "서울", dailyRate: 320000, featured: false },
  { name: "Turbo Caravan Deluxe", category: "Tuning", brand: "Hyundai", company: "Seoul Caravans", modelYear: 2023, licenseType: LicenseType.CLASS1_ORDINARY, seats: 6, sleeps: 5, region: "서울", dailyRate: 250000, featured: true },
  { name: "Explorer Series X", category: "Used", brand: "Ford", company: "Road Trek Motors", modelYear: 2020, licenseType: LicenseType.CLASS1_ORDINARY, seats: 4, sleeps: 4, region: "서울", dailyRate: 130000, featured: false },
];

const campingPlaces = [
  { name: "Jirisan National Park Camping Site", city: "Jirisan Mountain, South Korea", region: "Jeollanam-do", facilities: ["Restrooms", "Parking", "BBQ area", "Hiking trails"], coordinates: { latitude: 35.344, longitude: 127.731 }, phone: "010-1234-5678", workingHours: { from: "11:00", to: "20:00" } },
  { name: "Nami Island Camping Grounds", city: "Chuncheon, South Korea", region: "Gangwon-do", facilities: ["Electricity", "Shower facilities", "Bike rentals"], coordinates: { latitude: 37.791, longitude: 127.525 }, phone: "010-5835-2795", workingHours: { from: "10:00", to: "21:00" } },
];

const run = async (): Promise<void> => {
  if (env.isProduction) throw new Error("The seed script must not run in production");
  await connectDatabase();
  try {
    await settingsService.get();

    if ((await CategoryModel.countDocuments()) === 0) {
      await CategoryModel.insertMany(categories.map((category) => ({ ...category, slug: slugify(category.name) })));
    }
    if ((await FeatureModel.countDocuments()) === 0) {
      await FeatureModel.insertMany(features.map((feature) => ({ ...feature, slug: slugify(feature.name) })));
    }
    if ((await CamperModel.countDocuments()) === 0) {
      const categoryIds = new Map((await CategoryModel.find().lean()).map((category) => [category.name, category._id]));
      const featureIds = (await FeatureModel.find().lean()).map((feature) => feature._id);
      await CamperModel.insertMany(
        campers.map((camper, index) => ({
          name: camper.name,
          slug: slugify(camper.name),
          category: categoryIds.get(camper.category),
          features: featureIds.slice(0, 3 + (index % 3)),
          description: `${camper.name} by ${camper.company} is ready for your next road trip.`,
          highlights: [{ title: "Heating when driving", description: "Fuel heating warms the cabin while you drive, for a more comfortable arrival." }],
          brand: camper.brand,
          company: camper.company,
          baseVehicle: camper.baseVehicle,
          modelYear: camper.modelYear,
          licenseType: camper.licenseType,
          capacity: { seats: camper.seats, sleeps: camper.sleeps },
          specifications: {
            fuelType: camper.category === "Caravan" ? FuelType.NONE : FuelType.DIESEL,
            transmission: camper.category === "Caravan" ? Transmission.NONE : Transmission.AUTOMATIC,
          },
          location: { region: camper.region },
          pricing: { dailyRate: camper.dailyRate, weekendDailyRate: Math.round(camper.dailyRate * 1.2), cleaningFee: 50000, securityDeposit: 300000 },
          extras: [
            { name: "Bedding kit", price: 20000, chargeType: ExtraChargeType.PER_BOOKING, maxQuantity: 4 },
            { name: "Camping chairs & table", price: 10000, chargeType: ExtraChargeType.PER_NIGHT, maxQuantity: 1 },
          ],
          minNights: 1,
          maxNights: 14,
          status: CamperStatus.AVAILABLE,
          isFeatured: camper.featured,
        })),
      );
    }
    if ((await CampingPlaceModel.countDocuments()) === 0) {
      await CampingPlaceModel.insertMany(campingPlaces.map((place) => ({ ...place, slug: slugify(place.name), phone: place.phone.replace(/-/g, "") })));
    }
    if ((await CouponModel.countDocuments()) === 0) {
      await CouponModel.create({ code: "WELCOME10", description: "10% off your first trip", discountType: "PERCENTAGE", discountValue: 10, maxDiscountAmount: 100000 });
    }
    process.stdout.write("Seed completed.\n");
  } finally {
    await disconnectDatabase();
  }
};

run().catch((error: unknown) => {
  process.stderr.write(`Seed failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
