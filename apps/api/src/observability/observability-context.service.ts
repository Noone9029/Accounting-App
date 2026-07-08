import { AsyncLocalStorage } from "node:async_hooks";
import { Injectable } from "@nestjs/common";

export interface ObservabilityContext {
  requestId: string;
}

@Injectable()
export class ObservabilityContextService {
  private readonly storage = new AsyncLocalStorage<ObservabilityContext>();

  run<T>(context: ObservabilityContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  getRequestId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }
}
