import {
  CamperStatus,
  ExtraChargeType,
  FuelType,
  LicenseType,
  Transmission,
} from "../constants/enums";
import { Image, ObjectId, Timestamps } from "./common.interface";

export interface Category extends Timestamps {
  _id: ObjectId;
  name: string;
  slug: string;
  description?: string;
  image?: Image;
  isActive: boolean;
  sortOrder: number;
}

export interface Feature extends Timestamps {
  _id: ObjectId;
  name: string;
  slug: string;
  group?: string;
  icon?: string;
  isActive: boolean;
}

export interface CamperCapacity {
  seats: number;
  sleeps: number;
}

export interface CamperSpecifications {
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  weightKg?: number;
  fuelType: FuelType;
  transmission: Transmission;
  engine?: string;
  mileageKm?: number;
}

export interface CamperLocation {
  region: string;
  city?: string;
  address?: string;
  pickupNotes?: string;
}

/** All prices are whole KRW amounts. */
export interface CamperPricing {
  dailyRate: number;
  weekendDailyRate?: number;
  cleaningFee: number;
  securityDeposit: number;
}

/** An optional add-on a customer can select when booking (bedding kit, bike rack, ...). */
export interface CamperExtra {
  _id: ObjectId;
  name: string;
  price: number;
  chargeType: ExtraChargeType;
  maxQuantity: number;
}

export interface CamperHighlight {
  title: string;
  description: string;
}

export interface Camper extends Timestamps {
  _id: ObjectId;
  name: string;
  slug: string;
  category: ObjectId;
  features: ObjectId[];
  description: string;
  highlights: CamperHighlight[];
  brand?: string;
  company?: string;
  baseVehicle?: string;
  modelYear?: number;
  licenseType: LicenseType;
  capacity: CamperCapacity;
  specifications: CamperSpecifications;
  location: CamperLocation;
  pricing: CamperPricing;
  extras: CamperExtra[];
  minNights: number;
  maxNights: number;
  images: Image[];
  status: CamperStatus;
  isFeatured: boolean;
  ratingAverage: number;
  ratingCount: number;
  viewCount: number;
  /** Incremented by every booking transaction; see Booking.service for why. */
  bookingLockVersion: number;
  createdBy?: ObjectId;
}

export interface CampingPlace extends Timestamps {
  _id: ObjectId;
  name: string;
  slug: string;
  city?: string;
  region: string;
  description?: string;
  facilities: string[];
  coordinates?: { latitude: number; longitude: number };
  phone?: string;
  workingHours?: { from: string; to: string };
  homepage?: string;
  images: Image[];
  isActive: boolean;
}
