/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { ERequest } from "@fastly/expressly";
import { getWebSocketContextFromApiRequest, isApiRequestWsOverHttp } from "@fanoutio/grip";
import { ExpresslyApiRequest } from "./ExpresslyApiRequest";

export function isWsOverHttp(req: ERequest) {
  return isApiRequestWsOverHttp(ExpresslyApiRequest.for(req));
}

export function getWebSocketContextFromReq(req: ERequest, prefix: string = '') {
  return getWebSocketContextFromApiRequest(ExpresslyApiRequest.for(req), prefix);
}
