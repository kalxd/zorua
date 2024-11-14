import { Reader, ReaderCtx, reader } from "./reader";
import { EitherAsync, Maybe, Nothing, Right } from "purify-ts";
import { ActionResult, HttpState } from "./state";

export interface Cond<S, ST, E, R> extends Reader<HttpState<S, ST>, EitherAsync<ActionResult<E>, Maybe<R>>> {
	bindPipe: <RA>(cond: Cond<S, R, E, RA>) => Cond<S, ST, E, RA>;
}

export interface CondCtx<T, ST> extends ReaderCtx<HttpState<T, ST>> {}

export const cond = <S, ST, E, R>(
	f: (ctx: CondCtx<S, ST>) => EitherAsync<ActionResult<E>, Maybe<R>>
): Cond<S, ST, E, R> => {
	const theReader = reader(f);

	const bindPipe: Cond<S, ST, E, R>["bindPipe"] = g => {
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
