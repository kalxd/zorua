import { EitherAsync } from "purify-ts";
import { Reader, ReaderCtx, reader } from "./reader";
import { HttpState } from "./state";

export interface Handler<T, E, R> extends Reader<HttpState<T>, EitherAsync<E, R>> {
	bindPipe: <RA>(r: Handler<R, E, RA>) => Handler<T, E, RA>;
}

export interface HandlerCtx<T> extends ReaderCtx<HttpState<T>> {}

export const handler = <T, E, R>(
	f: (ctx: HandlerCtx<T>) => EitherAsync<E, R>
): Handler<T, E, R> => {
	const theReader = reader(f);

	const bindPipe: Handler<T, E, R>["bindPipe"] = h =>
		handler(ctx => f(ctx).chain(nextState => {
			const state: HttpState<R> = {
				req: ctx.askByKey("req"),
				state: nextState,
			};

			return h.runReader(state);
		}));

	return {
		...theReader,
		bindPipe
	};
};
