import { IncomingMessage } from "node:http";

export interface HttpState<S, RS = undefined> {
	req: IncomingMessage;
	state: S;
	source: RS;
}

export class HttpError<E> {
	readonly code: number;
	readonly content: E;

	constructor(code: number, content: E) {
		this.code = code;
		this.content = content;
	}

	encodeToBody(): string {
		return JSON.stringify(this.content);
	}
}

export interface ActionAbort {
	type: "abort";
	value: string;
}

export interface ActionErr<E> {
	type: "err";
	err: HttpError<E>;
}

export interface ActionInnerErr {
	type: "innerErr";
	err: string;
	code: number;
}

export const mkActionInnerErr = (msg: string): ActionInnerErr => ({
	type: "innerErr",
	err: msg,
	code: 400
});

export type ActionResult<E>
	= ActionAbort
	| ActionErr<E>
	| ActionInnerErr;
