import { Reader, ReaderCtx, reader } from "./reader";
import { EitherAsync, Maybe, Nothing, Right } from "purify-ts";
import { ActionResult, HttpState } from "./state";

export interface Cond<S, TS, E, R> extends Reader<HttpState<S, TS>, EitherAsync<ActionResult<E>, Maybe<R>>> {
	bindPipe: <RA>(cond: Cond<S, R, E, RA>) => Cond<S, TS, E, RA>;
}

export interface CondCtx<T, TS> extends ReaderCtx<HttpState<T, TS>> {}

export const cond = <S, TS, E, R>(
	f: (ctx: CondCtx<S, TS>) => EitherAsync<ActionResult<E>, Maybe<R>>
): Cond<S, TS, E, R> => {
	const theReader = reader(f);

	const bindPipe: Cond<S, TS, E, R>["bindPipe"] = g => {
		return cond(ctx => f(ctx).chain(x => x.caseOf({
			Just: r => {
				const state = ctx.ask();
				const rr: HttpState<S, R> = {
					...state,
					source: r
				};
				return g.runReader(rr);
			},
			Nothing: () => EitherAsync.liftEither(Right(Nothing))
		})));
	};

	return {
		...theReader,
		bindPipe
	};
}
