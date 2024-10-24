import { IncomingMessage } from "node:http";

export interface HttpState<S> {
	req: IncomingMessage;
	state: S;
}
