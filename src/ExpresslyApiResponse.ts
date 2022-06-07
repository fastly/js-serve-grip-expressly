/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { EResponse } from "@fastly/expressly";
import { IApiResponse } from "@fanoutio/grip";

export class ExpresslyApiResponse implements IApiResponse<EResponse> {
  static _map = new WeakMap<EResponse, IApiResponse<EResponse>>();

  static for(res: EResponse): IApiResponse<EResponse> {
    let apiResponse = this._map.get(res);
    if (apiResponse != null) {
      return apiResponse;
    }

    apiResponse = new ExpresslyApiResponse(res);
    this._map.set(res, apiResponse);
    return apiResponse;
  }

  constructor(private _res: EResponse) {}
  getWrapped() { return this._res; }
  setStatus(value: number) { this._res.status = value; }
  end(chunk: string) { this._res.end(chunk); }
}
