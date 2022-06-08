/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */
import { monkeyPatchProp } from "patch-obj-prop";

import {
  Channel,
  encodeWebSocketEvents,
  GripInstruct,
  WebSocketContext
} from "@fanoutio/grip";

import { ERequest, EResponse } from "@fastly/expressly";
import { IGripApiRequest, IGripApiResponse, ServeGripBase } from "@fanoutio/serve-grip";
import { Publisher } from "@fastly/grip-compute-js";

import debug from './debug';
import { IServeGripConfig } from "./IServeGripConfig";
import { ExpresslyApiRequest } from "./ExpresslyApiRequest";
import { ExpresslyApiResponse } from "./ExpresslyApiResponse";
import { GripExpresslyRequest, GripExpresslyResponse } from "./types";

export class ServeGrip extends ServeGripBase<ERequest, EResponse> {
  platformRequestToApiRequest(req: ERequest): IGripApiRequest<ERequest> {
    const apiRequest = ExpresslyApiRequest.for(req) as IGripApiRequest<ERequest>;
    if(apiRequest.getGrip == null) {
      apiRequest.getGrip = () => {
        return (req as GripExpresslyRequest).grip;
      };
    }
    if(apiRequest.setGrip == null) {
      apiRequest.setGrip = (grip) => {
        (req as GripExpresslyRequest).grip = grip;
      };
    }
    return apiRequest;
  }
  platformResponseToApiResponse(res: EResponse): IGripApiResponse<EResponse> {
    const apiResponse = ExpresslyApiResponse.for(res) as IGripApiResponse<EResponse>;
    if(apiResponse.getGrip == null) {
      apiResponse.getGrip = () => {
        return (res as GripExpresslyResponse).grip;
      };
    }
    if(apiResponse.setGrip == null) {
      apiResponse.setGrip = (grip) => {
        (res as GripExpresslyResponse).grip = grip;
      };
    }
    return apiResponse;
  }

  constructor(config?: IServeGripConfig) {
    config = {
      ...config,
      publisherClass: Publisher,
    };
    super(config);
  }

  override monkeyPatchResMethodsForWebSocket(apiResponse: IGripApiResponse<GripExpresslyResponse>, wsContext: WebSocketContext) {
    const res = apiResponse.getWrapped();

    const resHeaders = res.headers;

    debug('res.headers.delete');
    const origResHeadersDelete = resHeaders.delete;
    resHeaders.delete = (name) => {
      debug('res.headers.delete - start');
      // If we have a WsContext, then we don't want to allow removing
      // the following headers.
      let skip = false;
      if (name != null) {
        const nameLower = name.toLowerCase();
        if (nameLower === 'content-type' ||
          nameLower === 'content-length' ||
          nameLower === 'transfer-encoding'
        ) {
          // turn into a no-op
          skip = true;
        }
      }
      if (!skip) {
        debug('not skipping headers.delete', name);
        origResHeadersDelete.call(resHeaders, name);
      } else {
        debug('skipping headers.delete', name);
      }
      debug('res.headers.delete - end');
    };

    debug('res.hasEnded');
    monkeyPatchProp(res, 'hasEnded', {
      set: (value: boolean, origSetter) => {
        if(res.hasEnded) {
          debug('res.hasEnded is already true');
          origSetter(value);
          return;
        }
        if(!value) {
          debug('res.hasEnded called with false');
          origSetter(value);
          return;
        }
        debug('res.hasEnded set() - start');

        debug('res.hasEnded set() - original start');
        origSetter(value);
        debug('res.hasEnded set() - original end');

        if (res.status === 200 || res.status === 204) {
          debug('Getting outgoing events' );
          const events = wsContext.getOutgoingEvents();
          // debug('Encoding and writing events', events);
          const eventsAsText = encodeWebSocketEvents(events);
          res.body = eventsAsText;
          // debug('Encoding and writing events', eventsAsText);
        }

        debug('res.hasEnded set() - res.status', res.status);

        if (res.status === 200 || res.status === 204) {
          const wsContextHeaders = wsContext.toHeaders();
          debug("Adding wsContext headers", wsContextHeaders);
          for(const [key, value] of Object.entries(wsContextHeaders)) {
            res.set(key, value);
          }

          // If the body is empty, it's customary to set the code to
          // 204. This is probably fine since the main stream
          // for WS-over-HTTP is supposed to have an empty
          // body anyway. However, we will be adding WebSocket
          // events into the body, so change it to a 200.
          res.status = 200;
          // reason = 'OK'; // C@E doesn't have reason codes
        }

        debug('res.hasEnded set() - end');
      }
    });
  }

  override monkeyPatchResMethodsForGripInstruct(apiResponse: IGripApiResponse<EResponse>, gripInstructGetter: () => GripInstruct | null) {

    const res = apiResponse.getWrapped();

    debug('res.hasEnded');

    monkeyPatchProp(res, 'hasEnded', {
      set: (value: boolean, origSetter) => {
        if(res.hasEnded) {
          debug('res.hasEnded is already true');
          origSetter(value);
          return;
        }
        if(!value) {
          debug('res.hasEnded called with false');
          origSetter(value);
          return;
        }
        debug('res.hasEnded set() - start');

        debug('res.hasEnded set() - original start');
        origSetter(value);
        debug('res.hasEnded set() - original end');

        debug('res.hasEnded set() - res.status', res.status);

        const gripInstruct = gripInstructGetter();
        if(gripInstruct != null) {
          debug("GripInstruct present");
          if (res.status === 304) {
            // Code 304 only allows certain headers.
            // Some web servers strictly enforce this.
            // In that case we won't be able to use
            // Grip-headers to talk to the proxy.
            // Switch to code 200 and use Grip-Status
            // to specify intended status.
            debug("Using gripInstruct setStatus header to handle 304");
            res.status = 200;
            // reason = 'OK'; // C@E doesn't have reason codes
            gripInstruct.setStatus(304);
          }
          // Apply prefix to channel names
          gripInstruct.channels = gripInstruct.channels.map(
            (ch) => new Channel(this.prefix + ch.name, ch.prevId),
          );
          const gripInstructHeaders = gripInstruct.toHeaders();
          debug("Adding GripInstruct headers", gripInstructHeaders);
          for(const [key, value] of Object.entries(gripInstructHeaders)) {
            res.set(key, value);
          }
        } else {
          debug("GripInstruct not present");
        }

        debug('res.hasEnded set() - end');
      }
    });
  }
}
