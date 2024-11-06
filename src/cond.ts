import { Reader } from "./reader";
import { EitherAsync } from "purify-ts";

interface CondReader<S, E> extends Reader<S, EitherAsync<E, boolean>> {
}
