import { createServer } from "node:http";
import { EitherAsync, Just, Left, Maybe, Right, type Codec } from "purify-ts";
import { Handler, handler } from "./handler";
import { Cond, cond } from "./cond";
import { HttpState, mkActionInnerErr } from "./state";
import * as CC from "purify-ts";

interface HttpDecl<S, ST, E, R> {
	method: (method: string) => HttpDecl<S, ST & { method: string }, E, R>;
	body: <C>(codec: Codec<C>) => HttpDecl<S, ST & { body: C }, E, R>;
	service: <RA>(handler: Handler<R, E, RA, ST>) => HttpMiddleware<S, E, R>;
}

const httpDecl = <S, ST, E, R>(
	state: S,
	ca: Cond<S, undefined, E, ST>,
	ha: Handler<S, E, R>
): HttpDecl<S, ST, E, R> => {
	const service: HttpDecl<S, ST, E, R>["service"] = hb => {
		const h = handler<S, E, R>(ctx => {
			const st = ctx.ask();
			return ha.runReader(st).chain(a => {
				return ca.runReader(st).chain(x => x.caseOf({
					Just: r => {
						const nt: HttpState<R, ST> = {
							...st,
							state: a,
							route: r
						};
						return hb.runReader(nt).chain(ctx.send)
					},
					Nothing: () => EitherAsync.liftEither(Right(a))
				}));
			});
		});

		return middleware(state, h);
	};

	const method: HttpDecl<S, ST, E, R>["method"] = m => {
		const cb: Cond<S, ST, E, ST & { method: string }> = cond(ctx => {
			const st = ctx.ask();
			const x = Maybe.fromNullable(st.req.method)
				.map(s => s.toLowerCase())
				.filter(method => method === m.toLowerCase())
				.map(method => ({
					...st.route,
					method
				}));

			return EitherAsync.liftEither(Right(x));
		});

		const c = ca.bindPipe(cb);

		return httpDecl(state, c, ha);
	};

	const body: HttpDecl<S, ST, E, R>["body"] = <C>(codec: Codec<C>) => {
		const cb: Cond<S, ST, E, ST & { body: C }> = cond(ctx => {
			const st = ctx.ask();

			return EitherAsync.fromPromise(async () => {
				const bodyBuf = await new Promise<string>((resolve, reject) => {
					let bodyBuf = "";
					st.req.on("data", buf => bodyBuf += buf);
					st.req.on("end", () => resolve(bodyBuf));
					st.req.on("end", reject);
				});

				try {
					return Right(JSON.parse(bodyBuf));
				}
				catch (e) {
					return Left(mkActionInnerErr((e as Error).message));
				}
			})
				.chain(async x => {
					return codec.decode(x)
						.mapLeft(mkActionInnerErr)
				})
				.map(body => ({
					...st.route,
					body
				}))
				.map(Just);
		});

		return httpDecl(state, ca.bindPipe(cb), ha);
	};

	return {
		method,
		body,
		service,
	}
};

interface HttpMiddleware<S, E, R> {
	fn: <RA>(handler: Handler<R, E, RA>) => HttpMiddleware<S, E, RA>;
	source: (path: string) => HttpDecl<S, { path: string }, E, R>;
	listen: (port: number, callback: () => void) => void;
}

const middleware = <S, E, R>(
	state: S,
	ha: Handler<S, E, R>
): HttpMiddleware<S, E, R> => {
	const fn: HttpMiddleware<S, E, R>["fn"] = hb => {
		const h = ha.bindPipe(hb);
		return middleware(state, h);
	};

	const source: HttpMiddleware<S, E, R>["source"] = path => {
		const c: Cond<S, undefined, E, { path: string }> = cond(ctx => {
			const req = ctx.prop("req");

			const x = Maybe.fromNullable(req.url)
				.filter(url => url === path)
				.map(url => ({ path: url }));

			return EitherAsync.liftEither(Right(x));
		});

		return httpDecl(state, c, ha);
	};

	const listen: HttpMiddleware<S, E, R>["listen"] = (port, callback) => {
		const srv = createServer(async (req, res) => {
			const httpState: HttpState<S> = {
				req,
				state,
				route: undefined
			};

			const result = await ha.runReader(httpState);
			const [content, code] = result.caseOf({
				Right: a => [JSON.stringify(a), 200],
				Left: e => {
					if (e.type === "abort") {
						return [e.value, 200];
					}
					if (e.type === "err") {
						return [e.err.encodeToBody(), e.err.code];
					}
					if (e.type === "innerErr") {
						return [e.err, e.code];
					}
					const _: never = e;
					return _;
				}
			});
			res.setHeader("Content-Type", "application/json");
			res.write(content);
			res.statusCode = code;
			res.end();
		});

		srv.listen(port, undefined, undefined, callback);
	};

	return {
		fn,
		source,
		listen
	};
};

interface HttpApplication<S> {
	fn: <E, R>(handler: Handler<S, E, R>) => HttpMiddleware<S, E, R>;
	listen: (port: number, callback: () => void) => void;
}

const application = <S>(state: S): HttpApplication<S> => {
	const fn: HttpApplication<S>["fn"] = h => middleware(state, h);

	const listen: HttpApplication<S>["listen"] = (port, callback) => {
		const srv = createServer((_, res) => {
			res.end("ok");
		});

		srv.listen(port, undefined, undefined, callback);
	};

	return {
		fn,
		listen
	};
};

const fn1: Handler<{ nameCount: number }, never, number> = handler(ctx => {
	const state = ctx.prop("state");
	return EitherAsync.liftEither(Right(state.nameCount + 1))
});

const fn2: Handler<number, never, { name: string, value: string }> = handler(ctx => {
	console.log("do this?");
	const value = ctx.prop("state");
	const nextState = {
		name: "hello",
		value: JSON.stringify(value)
	};
	return EitherAsync.liftEither(Right(nextState));
});

const fn3 = fn1.bindPipe(fn2);

application({ nameCount: 1 })
	.fn(fn3)
	.source("/abc").method("get").service(handler(ctx => {
		return EitherAsync.liftEither(Right({
			a: 1,
			b: ["1", { a: 1 }]
		}))
	}))
	.source("/abc").method("post").body(CC.Codec.interface({ name: CC.string, code: CC.number })).service(handler(ctx => {
		const body = ctx.ask().route.body;
		return ctx.send(body);
	}))
	.listen(3000, () => console.log("start!"));
