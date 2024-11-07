import { IncomingMessage } from "node:http";

export interface HttpState<S, RS = undefined> {
	req: IncomingMessage;
	state: S;
	route: RS;
}

export type MergeState<S, U> = HttpState<S> & U;

export class HttpError {
	readonly code: number;
	readonly message: string;

	constructor(code: number, message: string) {
		this.code = code;
		this.message = message;
	}
}

export interface ActionAbort<T> {
	type: "abort";
	value: T;
}

export interface ActionErr {
	type: "err";
	err: HttpError;
}

export type ActionResult<T>
	= ActionAbort<T>
	| ActionErr;
