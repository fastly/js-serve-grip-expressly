import {
  Channel,
  encodeWebSocketEvents,
  GripInstruct,
  WebSocketContext
} from "@fanoutio/grip";

import { IGripApiRequest, IGripApiResponse, IRequestGrip, IResponseGrip, ServeGripBase } from "@fanoutio/serve-grip";

import { Publisher } from "@fastly/grip-compute-js";

import debug from './debug';
import { IServeGripConfig } from "./IServeGripConfig";
import { ExpresslyApiRequest } from "./ExpresslyApiRequest";
import { ExpresslyApiResponse } from "./ExpresslyApiResponse";
import { GripExpresslyRequest, GripExpresslyResponse } from "./types";

export class ServeGrip extends ServeGripBase<GripExpresslyRequest, GripExpresslyResponse> {
  platformRequestToApiRequest(req: GripExpresslyRequest): IGripApiRequest<GripExpresslyRequest> {
    const apiRequest = ExpresslyApiRequest.for(req);
    Object.defineProperty(apiRequest, 'grip', {
      get(): IRequestGrip {
        return this.getWrapped().grip;
      },
      set(value: IRequestGrip) {
        this.getWrapped().grip = value;
      }
    });
    return apiRequest as IGripApiRequest<GripExpresslyRequest>;
  }
  platformResponseToApiResponse(res: GripExpresslyResponse): IGripApiResponse<GripExpresslyResponse> {
    const apiResponse = ExpresslyApiResponse.for(res);
    Object.defineProperty(apiResponse, 'grip', {
      get(): IResponseGrip {
        return this.getWrapped().grip;
      },
      set(value: IResponseGrip) {
        this.getWrapped().grip = value;
      }
    });
    return apiResponse as IGripApiResponse<GripExpresslyResponse>;
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

    debug('res.removeHeader');
    const resRemoveHeader = res.removeHeader;
    // @ts-ignore
    res.removeHeader = (name) => {
      debug('res.removeHeader - start');
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
        debug('not skipping removeHeader', name);
        resRemoveHeader.call(res, name);
      } else {
        debug('skipping removeHeader', name);
      }
      debug('res.removeHeader - end');
    };

    debug('res.setDefaults');
    const resSetDefaults = res.setDefaults;
    // @ts-ignore
    res.setDefaults = () => {
      debug('res.setDefaults - start');

      debug('res.setDefaults - original start');
      resSetDefaults.call(res);
      debug('res.setDefaults - original end');

      if (res.status === 200 || res.status === 204) {
        debug('Getting outgoing events' );
        const events = wsContext!.getOutgoingEvents();
        debug('Encoding and writing events', events );
        const eventsAsText = encodeWebSocketEvents(events);
        (res as any)._body = eventsAsText;
        debug('Encoding and writing events', eventsAsText );
      }

      debug('res.setDefaults - res.status', res.status);

      if (res.status === 200 || res.status === 204) {
        const wsContextHeaders = wsContext.toHeaders();
        debug("Adding wsContext headers", wsContextHeaders);
        for(const [key, value] of Object.entries(wsContextHeaders)) {
          res._headers.set(key, value);
        }

        // If the body is empty, it's customary to set the code to
        // 204. This is probably fine since the main stream
        // for WS-over-HTTP is supposed to have an empty
        // body anyway. However, we will be adding WebSocket
        // events into the body, so change it to a 200.
        res.status = 200;
        // reason = 'OK'; // C@E doesn't have reason codes
      }

      debug('res.setDefaults - end');
    };

  }


  override monkeyPatchResMethodsForGripInstruct(apiResponse: IGripApiResponse<GripExpresslyResponse>, gripInstructGetter: () => GripInstruct | null) {

    const res = apiResponse.getWrapped();

    debug('res.setDefaults');
    const resSetDefaults = res.setDefaults;
    res.setDefaults = () => {
      debug('res.setDefaults - start');

      debug('res.setDefaults - original start');
      resSetDefaults.call(res);
      debug('res.setDefaults - original end');

      debug('res.setDefaults - res.status', res.status);

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
          res._headers.set(key, value);
        }
      } else {
        debug("GripInstruct not present");
      }

      debug('res.setDefaults - end');
    }
  }
}
