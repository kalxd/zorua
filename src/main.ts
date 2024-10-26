import { createServer } from "node:http";
import { EitherAsync, Right } from "purify-ts";
import { Handler, handler } from "./handler";
import { HttpState } from "./state";

interface HttpMiddleware<S, E, R> {
	fn: <RA>(handler: Handler<R, E, RA>) => HttpMiddleware<S, E, RA>;
	listen: (port: number, callback: () => void) => void;
}

const middleware = <S, E, R>(
	state: S, ha: Handler<S, E, R>
): HttpMiddleware<S, E, R> => {
	const fn: HttpMiddleware<S, E, R>["fn"] = hb => {
		const h = ha.bindPipe(hb);
		return middleware(state, h);
	};

	const listen: HttpMiddleware<S, E, R>["listen"] = (port, callback) => {
		const srv = createServer(async (req, res) => {
			const httpState: HttpState<S> = {
				req,
				state
			};

			const result = await ha.runReader(httpState);
			const content = JSON.stringify(result);
			res.setHeader("Content-Type", "application/json");
			res.write(content);
			res.end();
		});

		srv.listen(port, undefined, undefined, callback);
	};

	return {
		fn,
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

application({ nameCount: 1 })
	.fn(handler(ctx => {
		const state = ctx.askByKey("state");
		if (state.nameCount === 1) {
			const v = ctx.liftSend("open here");
			return v;
		}
		return EitherAsync.liftEither(Right(state.nameCount + 1))
	}))
	.fn(handler(ctx => {
		console.log("do this?");
		const value = ctx.askByKey("state");
		const nextState = {
			name: "hello",
			value: JSON.stringify(value)
		};
		return EitherAsync.liftEither(Right(nextState));
	}))
	.listen(3000, () => console.log("start!"));
