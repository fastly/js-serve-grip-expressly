/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { Buffer } from 'buffer';

import { ERequest } from "@fastly/expressly";
import { IApiRequest } from "@fanoutio/grip";

export class ExpresslyApiRequest implements IApiRequest<ERequest> {
  static _map = new WeakMap<ERequest, IApiRequest<ERequest>>();

  static for(req: ERequest): IApiRequest<ERequest> {
    let apiRequest = this._map.get(req);
    if(apiRequest != null) {
      return apiRequest;
    }
    apiRequest = new ExpresslyApiRequest(req);
    this._map.set(req, apiRequest);
    return apiRequest;
  }

  constructor(private _req: ERequest) {}
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
