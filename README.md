# 索罗亚

![索罗亚](https://media.52poke.com/wiki/thumb/archive/2/2b/20140413172924%21570Zorua.png/93px-570Zorua.png)

一个实验性质的类型安全web框架，为了探索另一种形式的后端开发。

# 注意事项

* 实打实的实验性质项目，除非对底层实现了然于胸，不然不推荐使用，个人项目也不推荐。
* 需要一定的ts类型基础，泛型操作是基础中的基础。
* 需要理解、运用高阶函数，理解什么是函数的组合。
* 需要理解Either（或Result、Option）概念，用函数式的叫法，就是知道什么是Either Monad。
* 基于上一点，这个项目强依赖[purify-ts](https://gigobyte.github.io/purify/)，但看最近issue不是很活跃。换言之，purify-ts有弃坑风险。

## 示例

```typescript
application(1000 /* 这里填全局状态，想填什么都行 */)
  .fn(hanler(ctx => { // @f1
    const state = ctx.ask(); // 获取上面传入的1000。
	return { state }; // 返回类型为 { state: number }。
  }))
  .fn(handler(ctx => { // @f2
    const state = ctx.ask(); // 此时的state受上个fn影响，变成与上一个返回值同一个类型：{ state: number }。
	return { state: state.state.toString() }; // 此时类型为 { state: string }。
  }))
  .source("/abc").method("get").service(handler(ctx => { // 这是一个路由定义，上下文同样受fn影响。 @f3
	const state = ctx.ask(); // { state: string }。
	return state; // 返回请求响应，但不影响下文的状态。
  }))
  .source("/abc").method("post").body(C.interface({})).service(ctx => { // @f4
	const body = ctx.source("body");  // 因为调用了body，所以此处可以得到body，不然会报"body"不存在错误。
	const state = ctx.ask(); // { state: string }，依然还是原先状态，不会受source影响。
	return { [state]: body };
  })
  .fn(handler(ctx => "not found"))
  .listen(3000, () => console.log("启动！"));
```

这就最简单的例子了，每一层携带的上下文，由上层决定。上面代码可以近似看成：

```js
createServer((req, res) => {
	const res1 = f1(req, 1000);
	const res2 = f2(req, res1);

	if (req.url === "/abc" && req.method === "get") {
		return f3(req, res2, { url, method });
	}

	if (req.url === "/abc" && req.method === "post") {
		const body = tryReadFrom(req);
		return f4(req, res2, { url, method, body });
	}

	return "not found";
})
```

# 协议

AGPL v3
