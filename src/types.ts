/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { ERequest, EResponse } from "@fastly/expressly";
import { GripRequest, GripResponse } from "@fanoutio/serve-grip";

export type GripExpresslyRequest = GripRequest<ERequest>;
export type GripExpresslyResponse = GripResponse<EResponse>;
