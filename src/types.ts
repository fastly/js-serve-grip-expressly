import { ERequest, EResponse } from "@fastly/expressly";
import { GripRequest, GripResponse } from "@fanoutio/serve-grip";

export type GripExpresslyRequest = GripRequest<ERequest>;
export type GripExpresslyResponse = GripResponse<EResponse>;
