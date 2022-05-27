import { FPRequest, FPResponse } from "@fastly/expressly";
import { IRequestGrip, IResponseGrip } from "@fanoutio/serve-grip";

export type GripExpresslyRequest = FPRequest & {
  grip?: IRequestGrip;
}

export type GripExpresslyResponse = FPResponse & {
  grip?: IResponseGrip;
}
