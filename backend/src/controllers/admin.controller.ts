import { Request, Response } from "express";
import { getValidated } from "../middleware/validate.middleware";
import { dashboardService } from "../services/Dashboard.service";
import { settingsService } from "../services/Settings.service";
import { sendSuccess } from "../utils/response";
import { activityQuerySchema, dashboardRangeQuerySchema } from "../validators/dashboard.validator";
import { settingsUpdateSchema } from "../validators/engagement.validator";

export const dashboardController = {
  overview: async (_req: Request, res: Response) => {
    sendSuccess(res, { message: "Dashboard overview retrieved", data: await dashboardService.overview() });
  },
  revenue: async (req: Request, res: Response) => {
    sendSuccess(res, { message: "Revenue series retrieved", data: await dashboardService.revenueSeries(getValidated(req, "query", dashboardRangeQuerySchema)) });
  },
  bookings: async (req: Request, res: Response) => {
    sendSuccess(res, { message: "Booking series retrieved", data: await dashboardService.bookingSeries(getValidated(req, "query", dashboardRangeQuerySchema)) });
  },
  topCampers: async (req: Request, res: Response) => {
    sendSuccess(res, { message: "Top campers retrieved", data: await dashboardService.topCampers(getValidated(req, "query", dashboardRangeQuerySchema)) });
  },
  kpis: async (req: Request, res: Response) => {
    sendSuccess(res, { message: "KPIs retrieved", data: await dashboardService.kpis(getValidated(req, "query", dashboardRangeQuerySchema)) });
  },
  fleet: async (req: Request, res: Response) => {
    sendSuccess(res, { message: "Fleet performance retrieved", data: await dashboardService.fleetPerformance(getValidated(req, "query", dashboardRangeQuerySchema)) });
  },
  customers: async (req: Request, res: Response) => {
    sendSuccess(res, { message: "Customer analytics retrieved", data: await dashboardService.customerAnalytics(getValidated(req, "query", dashboardRangeQuerySchema)) });
  },
  payments: async (req: Request, res: Response) => {
    sendSuccess(res, { message: "Payment summary retrieved", data: await dashboardService.paymentSummary(getValidated(req, "query", dashboardRangeQuerySchema)) });
  },
  activity: async (req: Request, res: Response) => {
    sendSuccess(res, { message: "Activity retrieved", data: await dashboardService.activity(getValidated(req, "query", activityQuerySchema)) });
  },
};

export const settingsController = {
  /** Public subset shown on the customer site (contact info, pickup times, policies). */
  getPublic: async (_req: Request, res: Response) => {
    const settings = await settingsService.get();
    sendSuccess(res, {
      message: "Settings retrieved",
      data: {
        businessName: settings.businessName,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        address: settings.address,
        currency: settings.currency,
        pickupTime: settings.pickupTime,
        returnTime: settings.returnTime,
        freeCancellationDays: settings.freeCancellationDays,
        bookingHoldMinutes: settings.bookingHoldMinutes,
        minLeadDays: settings.minLeadDays,
        maxAdvanceDays: settings.maxAdvanceDays,
      },
    });
  },
  get: async (_req: Request, res: Response) => {
    sendSuccess(res, { message: "Settings retrieved", data: await settingsService.get() });
  },
  update: async (req: Request, res: Response) => {
    sendSuccess(res, { message: "Settings updated", data: await settingsService.update(getValidated(req, "body", settingsUpdateSchema)) });
  },
};
