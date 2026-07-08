import type { Request, Response, NextFunction } from "express";
import { ObservabilityContextService } from "./observability-context.service";
import { createRequestId } from "./request-id";

export interface RequestWithRequestId extends Request {
  requestId?: string;
}

export function createRequestContextMiddleware(context: ObservabilityContextService) {
  return (request: RequestWithRequestId, response: Response, next: NextFunction) => {
    const requestId = createRequestId(request.headers["x-request-id"]);
    request.requestId = requestId;
    response.setHeader("x-request-id", requestId);

    context.run({ requestId }, () => next());
  };
}
