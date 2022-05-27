import { FPRequest } from "@fastly/expressly";
import { getWebSocketContextFromApiRequest, isApiRequestWsOverHttp } from "@fanoutio/grip";
import { ExpresslyApiRequest } from "./ExpresslyApiRequest";

export function isWsOverHttp(req: FPRequest) {
  return isApiRequestWsOverHttp(ExpresslyApiRequest.for(req));
}

export function getWebSocketContextFromReq(req: FPRequest, prefix: string = '') {
  return getWebSocketContextFromApiRequest(ExpresslyApiRequest.for(req), prefix);
}
