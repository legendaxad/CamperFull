import { Router } from "express";
import { camperController } from "../controllers/camper.controller";
import { campingPlaceController, categoryController, featureController } from "../controllers/catalog.controller";
import { reviewController } from "../controllers/engagement.controller";
import { validate } from "../middleware/validate.middleware";
import {
  availabilityQuerySchema,
  camperCompareQuerySchema,
  camperListQuerySchema,
  campingPlaceListQuerySchema,
  idOrSlugParamSchema,
} from "../validators/catalog.validator";
import { reviewListQuerySchema } from "../validators/engagement.validator";

/** Public, read-only catalog endpoints for the customer site. */
export const camperRouter = Router();

camperRouter.get("/", validate({ query: camperListQuerySchema }), camperController.list);
camperRouter.get("/filters", camperController.filters);
camperRouter.get("/compare", validate({ query: camperCompareQuerySchema }), camperController.compare);
camperRouter.get("/:idOrSlug", validate({ params: idOrSlugParamSchema }), camperController.get);
camperRouter.get("/:idOrSlug/availability", validate({ params: idOrSlugParamSchema, query: availabilityQuerySchema }), camperController.availability);
camperRouter.get("/:idOrSlug/reviews", validate({ params: idOrSlugParamSchema, query: reviewListQuerySchema }), reviewController.listForCamper);

export const categoryRouter = Router();
categoryRouter.get("/", categoryController.list);
categoryRouter.get("/:idOrSlug", validate({ params: idOrSlugParamSchema }), categoryController.get);

export const featureRouter = Router();
featureRouter.get("/", featureController.list);

export const campingPlaceRouter = Router();
campingPlaceRouter.get("/", validate({ query: campingPlaceListQuerySchema }), campingPlaceController.list);
campingPlaceRouter.get("/:idOrSlug", validate({ params: idOrSlugParamSchema }), campingPlaceController.get);
