interface Reader<T, R> {
	runReader: (env: Readonly<T>) => R;
	pipe: <RA>(reader: Reader<R, RA>) => Reader<T, RA>;
}

interface ReaderCtx<T> {
	ask: () => Readonly<T>;
	asks: <R>(f: (env: Readonly<T>) => R) => R;
	bindFrom: <RA>(reader: Reader<T, RA>) => RA;
}

const reader = <T, R>(f: (helper: ReaderCtx<T>) => R): Reader<T, R> => {
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

// examples
const inc: Reader<number, number> = reader(ctx => ctx.ask() + 1);

const f = inc.pipe(inc).pipe(inc);
const v = f.runReader(10);
console.log(v);
