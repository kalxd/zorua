import { EitherAsync, Left } from "purify-ts";
import { Reader, ReaderCtx, reader } from "./reader";
import { HttpState, ActionResult } from "./state";

export interface Handler<S, E, R, ST = undefined> extends Reader<HttpState<S, ST>, EitherAsync<ActionResult<E>, R>> {
	bindPipe: <RA>(r: Handler<R, E, RA, ST>) => Handler<S, E, RA, ST>;
}

export interface HandlerCtx<S, E, ST = undefined> extends ReaderCtx<HttpState<S, ST>> {
	state: <K extends keyof S>(key: K) => S[K];
	source: <K extends keyof ST>(key: K) => ST[K];
	send: <A>(value: A) => EitherAsync<ActionResult<E>, never>;
}

export const handler = <S, E, R, ST = undefined>(
	f: (ctx: HandlerCtx<S, E, ST>) => EitherAsync<ActionResult<E>, R>
): Handler<S, E, R, ST> => {
	const theReader = reader((ctx: ReaderCtx<HttpState<S, ST>>) => {
		const handlerCtx: HandlerCtx<S, E, ST> = {
			...ctx,
			state: key => ctx.asks(x => x.state[key]),
			source: key => ctx.asks(x => x.source[key]),
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

	const bindPipe: Handler<S, E, R, ST>["bindPipe"] = h =>
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
