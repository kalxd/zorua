import { EitherAsync, Left } from "purify-ts";
import { Reader, ReaderCtx, reader } from "./reader";
import { HttpState, ActionResult } from "./state";

export interface Handler<T, E, R, ST = undefined> extends Reader<HttpState<T, ST>, EitherAsync<ActionResult<E>, R>> {
	bindPipe: <RA>(r: Handler<R, E, RA, ST>) => Handler<T, E, RA, ST>;
}

export interface HandlerCtx<T, E, ST = undefined> extends ReaderCtx<HttpState<T, ST>> {
	send: <A>(value: A) => EitherAsync<ActionResult<E>, never>;
}

export const handler = <T, E, R, ST = undefined>(
	f: (ctx: HandlerCtx<T, E, ST>) => EitherAsync<ActionResult<E>, R>
): Handler<T, E, R, ST> => {
	const theReader = reader((ctx: ReaderCtx<HttpState<T, ST>>) => {
		const handlerCtx: HandlerCtx<T, E, ST> = {
			...ctx,
			send: <A>(v: A) => {
				const value: ActionResult<A> = {
					type: "abort",
					value: JSON.stringify(v)
				};
				return EitherAsync.liftEither(Left(value));
			}
		};

		return f(handlerCtx);
	});

	const bindPipe: Handler<T, E, R, ST>["bindPipe"] = h =>
		handler(ctx => f(ctx).chain(nextState => {
			const state = ctx.ask();
			const nt: HttpState<R, ST> = {
				...state,
				state: nextState,
			};

			return h.runReader(nt);
		}));

	return {
		...theReader,
		bindPipe
	};
};
