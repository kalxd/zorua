import { EitherAsync, Right } from "purify-ts";

const readFile = (): EitherAsync<string, string> => {
	return EitherAsync.liftEither(Right(""));
};
