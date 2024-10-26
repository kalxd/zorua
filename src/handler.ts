import { EitherAsync, Left } from "purify-ts";
import { Reader, ReaderCtx, reader } from "./reader";
import { HttpState, ActionResult } from "./state";

export interface Handler<T, E, R> extends
Reader<HttpState<T>, EitherAsync<ActionResult<E>, R>> {
	bindPipe: <RA>(r: Handler<R, E, RA>) => Handler<T, E, RA>;
}

export interface HandlerCtx<T> extends
ReaderCtx<HttpState<T>> {
	liftSend: <A>(value: A) => EitherAsync<ActionResult<A>, never>;
}

export const handler = <T, E, R>(
	f: (ctx: HandlerCtx<T>) => EitherAsync<ActionResult<E>, R>
): Handler<T, E, R> => {
	const theReader = reader((ctx: ReaderCtx<HttpState<T>>) => {
		const handlerCtx: HandlerCtx<T> = {
			...ctx,
			liftSend: <A>(v: A) => {
				const value: ActionResult<A> = {
					type: "abort",
					value: v
				};
				return EitherAsync.liftEither(Left(value));
			}
		};

		return f(handlerCtx);
	});

	const bindPipe: Handler<T, E, R>["bindPipe"] = h =>
		handler(ctx => f(ctx).chain(nextState => {
			const state: HttpState<R> = {
				req: ctx.prop("req"),
				state: nextState,
			};

			return h.runReader(state);
		}));

	return {
		...theReader,
		bindPipe
	};
};
