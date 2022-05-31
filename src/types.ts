import { ERequest, EResponse } from "@fastly/expressly";
import { IRequestGrip, IResponseGrip } from "@fanoutio/serve-grip";

export type GripExpresslyRequest = ERequest & {
  grip?: IRequestGrip;
}

export type GripExpresslyResponse = EResponse & {
  grip?: IResponseGrip;
}
