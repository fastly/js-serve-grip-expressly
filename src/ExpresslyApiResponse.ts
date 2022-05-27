import { FPResponse } from "@fastly/expressly";
import { IApiResponse } from "@fanoutio/grip";

export class ExpresslyApiResponse implements IApiResponse<FPResponse> {
  static _map = new WeakMap<FPResponse, IApiResponse<FPResponse>>();

  static for(res: FPResponse): IApiResponse<FPResponse> {
    let apiResponse = this._map.get(res);
    if (apiResponse != null) {
      return apiResponse;
    }

    apiResponse = new ExpresslyApiResponse(res);
    this._map.set(res, apiResponse);
    return apiResponse;
  }

  constructor(private _res: FPResponse) {}
  getWrapped() { return this._res; }
  setStatus(value: number) { this._res.status = value; }
  end(chunk: string) { this._res.end(chunk); }
}
