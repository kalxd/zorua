import { createServer, IncomingMessage } from "node:http";

import { Reader, ReaderCtx, reader } from "./reader";
import { EitherAsync, Right } from "purify-ts";

interface HttpState<S> {
	req: IncomingMessage;
	state: S;
}

interface HttpApplication {
	listen: (port: number, callback: () => void) => void;
}

const application = <S>(state: S): HttpApplication => {
	const listen: HttpApplication["listen"] = (port, callback) => {
		const srv = createServer((_, res) => {
			res.end("ok");
		});

		srv.listen(port, undefined, undefined, callback);
	};

	return {
		listen
	};
};


application(undefined)
	.listen(3000, () => console.log("start!"));
