export interface Reader<T, R> {
	runReader: (env: Readonly<T>) => R;
	pipe: <RA>(reader: Reader<R, RA>) => Reader<T, RA>;
}

export interface ReaderCtx<T> {
	ask: () => Readonly<T>;
	asks: <R>(f: (env: Readonly<T>) => R) => R;
	askByKey: <K extends keyof T>(key: K) => Readonly<T[K]>;
	bindFrom: <RA>(reader: Reader<T, RA>) => RA;
	bindWith: <TA, R>(r: Reader<TA, R>, f: (env: T) => TA) => R;
}

export const reader = <T, R>(f: (helper: ReaderCtx<T>) => R): Reader<T, R> => {
	const runReader: Reader<T, R>["runReader"] = env => {
		const ctx: ReaderCtx<T> = {
			ask: () => env,
			asks: g => g(env),
			askByKey: key => env[key],
			bindFrom: r => r.runReader(env),
			bindWith: (r, f) => r.runReader(f(env))
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
