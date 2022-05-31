import { Buffer } from 'buffer';

import { FPRequest } from "@fastly/expressly";
import { IApiRequest } from "@fanoutio/grip";

export class ExpresslyApiRequest implements IApiRequest<FPRequest> {
  static _map = new WeakMap<FPRequest, IApiRequest<FPRequest>>();

  static for(req: FPRequest): IApiRequest<FPRequest> {
    let apiRequest = this._map.get(req);
    if(apiRequest != null) {
      return apiRequest;
    }
    apiRequest = new ExpresslyApiRequest(req);
    this._map.set(req, apiRequest);
    return apiRequest;
  }

  constructor(private _req: FPRequest) {}
  getWrapped() { return this._req; }
  getMethod() { return this._req.method; }
  getHeaderValue(key: string) { return this._req.headers.get(key) ?? undefined; }
  getHeaders() {
    const headers: Record<string, string> = {};
    for(const key of this._req.headers.keys()) {
      const value = this._req.headers.get(key);
      if(value != null) {
        headers[key.toLowerCase()] = value;
      }
    }
    return headers;
  }
  async getBody() {
    return Buffer.from(await this._req.arrayBuffer());
  }
}
