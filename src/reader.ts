import { EitherAsync, Right, Left } from "purify-ts";

export interface Reader<T, R> {
	runReader: (env: Readonly<T>) => R;
	pipe: <RA>(reader: Reader<R, RA>) => Reader<T, RA>;
}

export interface ReaderCtx<T> {
	ask: () => Readonly<T>;
	asks: <R>(f: (env: Readonly<T>) => R) => R;
	bindFrom: <RA>(reader: Reader<T, RA>) => RA;
}

export const reader = <T, R>(f: (helper: ReaderCtx<T>) => R): Reader<T, R> => {
	const runReader: Reader<T, R>["runReader"] = env => {
		const ctx: ReaderCtx<T> = {
			ask: () => env,
			asks: g => g(env),
			bindFrom: r => r.runReader(env)
		};

		return f(ctx);
	};

	const pipe = <RA>(r: Reader<R, RA>): Reader<T, RA> => reader(ctx => {
			const envR = f(ctx);
			return r.runReader(envR);
	});

	return {
		runReader,
		pipe
	};
};

export interface Handler<T, E, R> extends Reader<T, EitherAsync<E, R>> {
	bindPipe: <RA>(handler: Handler<R, E, RA>) => Handler<T, E, RA>;
}

export interface HandlerCtx<T> extends ReaderCtx<T> {
	asksN: () => number;
}

export const mkHandler = <T, E, R>(f: (ctx: HandlerCtx<T>) => EitherAsync<E, R>): Handler<T, E, R> => {
	const theReader = reader((ctx: ReaderCtx<T>) => {
		const asksN: HandlerCtx<T>["asksN"] = () => 10;
		return f({ ...ctx, asksN });
	});

	const bindPipe = <RA>(handle: Handler<R, E, RA>): Handler<T, E, RA> => {
		return mkHandler(ctx => {
			return f(ctx).chain(handle.runReader);
		});
	};

	return {
		...theReader,
		bindPipe
	}
};


/// examples
const inc: Handler<number, string, number> = mkHandler(ctx => {
	const n = ctx.ask();
	if (n > 5) {
		return EitherAsync.liftEither(Left("more than 5"));
	}
	else {
		return EitherAsync.liftEither(Right(ctx.asksN() + 1));
	}
});

const f = inc.bindPipe(inc).bindPipe(inc).bindPipe(inc).bindPipe(inc).bindPipe(inc);

const main = async (): Promise<void> => {
	const v = await f.runReader(1);
	v.caseOf({
		Right: a => {
			console.log("ok", a);
		},
		Left: e => {
			console.error("err", e);
		}
	})
};

main().catch(console.error);
