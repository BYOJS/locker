# Locker

[![npm Module](https://badge.fury.io/js/@byojs%2Flocker.svg)](https://www.npmjs.org/package/@byojs/locker)
[![License](https://img.shields.io/badge/license-MIT-a1356a)](LICENSE.txt)

**Locker** provides exclusive, stackable locking, to control concurrent access to shared resource(s).

```js
var lock = Locker();

lock.when(async function myOperation(){
   // safely operate against shared resource(s),
   // such as global state variables, files, etc
});
```

Or:

```js
var lock = Locker();

await lock.get();

// safely operate against shared resource(s),
// such as global state variables, files, etc
myOperation();

lock.release();
```

----

[Library Tests (Demo)](https://byojs.dev/locker/)

----

## Overview

The main purpose of **Locker** is to aid in managing asynchrony by gating an operation until an *exclusive lock* can be obtained. If an operation already holds that lock, subsequent requests to obtain the exclusive lock will stack on top of each other, each waiting in turn.

Essentially, this provides a strictly-sequential asynchronous queue, either explicitly -- with a `lock.when().when()...` chain -- or implicitly -- by gating subsequent, separate `lock.get()` calls.

## Deployment / Import

```cmd
npm install @byojs/locker
```

The [**@byojs/locker** npm package](https://npmjs.com/package/@byojs/locker) includes a `dist/` directory with all files you need to deploy **Locker** (and its dependencies) into your application/project.

**Note:** If you obtain this library via git instead of npm, you'll need to [build `dist/` manually](#re-building-dist) before deployment.

### Using a bundler

If you are using a bundler (Astro, Vite, Webpack, etc) for your web application, you should not need to manually copy any files from `dist/`.

Just `import` like so:

```js
import Locker from "@byojs/locker";
```

The bundler tool should pick up and find whatever files (and dependencies) are needed.

### Without using a bundler

If you are not using a bundler (Astro, Vite, Webpack, etc) for your web application, and just deploying the contents of `dist/` as-is without changes (e.g., to `/path/to/js-assets/locker/`), you'll need an [Import Map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) in your app's HTML:

```html
<script type="importmap">
{
    "imports": {
        "locker": "/path/to/js-assets/locker.mjs"
    }
}
</script>
```

Now, you'll be able to `import` the library in your app in a friendly/readable way:

```js
import Locker from "locker";
```

**Note:** If you omit the above *locker* import-map entry, you can still `import` **Locker** by specifying the proper full path to the `locker.mjs` file.

## Locker API

The API provided by **Locker** is a single factory function, typically named `Locker`. This function takes no arguments, and produces independent exclusive-lock instances.

```js
import Locker from "..";

var lockA = Locker();
var lockB = Locker();
```

### Exclusive Lock instance API

Exclusive lock instances have 3 methods.

The `when(..)` method is the preferred and safest way to use **Locker**. It executes the passed-in function once an exclusive lock is obtained; the function can be normal/synchronous, or an `async` function. And once the function completes (normally, or abnormally with an exception), the lock is automatically released.

```js
import Locker from "..";

var lock = Locker();

lock.when(async function doStuff(){
    // now ready to safely access shared resource(s)
});
```

**Note:** `when()` normalizes the invocation of the passed-in function to always be asynchronous; even if the lock is *not* currently held, a promise microtask tick passes before invocation.

To support externally cancelling a pending request for the lock, pass an options object (e.g., `{ signal: .. }`) as the second argument to `when(..)`, with an [`AbortSignal` instance](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) (from an [`AbortController` instance](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)).

For example, use a [timeout signal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static) to cancel the lock if it takes too long to obtain:

```js
import Locker from "..";

var lock = Locker();

lock.when(doStuff,{ signal: AbortSignal.timeout(5000), });
```

**Note:** `signal` aborting has no effect on the `doStuff()` operation if it has already started; it only cancels obtaining the lock (which prevents `doStuff()` from starting).

Set a `pass` property on the options object (second argument), with an array of arguments to pass to the function when it's invoked:

```js
import Locker from "..";

var lock = Locker();

lock.when(doStuff,{ pass: [ 1, 2, 3 ] });
```

`when()` returns the lock instance, so you can chain multiple `when()` calls together, conceptually expressing an asynchronous queue:

```js
import Locker from "..";

var lock = Locker();

lock.when(doTaskA).when(doTaskB).when(doTaskC);
```

**Note:** `when()` does not return a promise, so by design there's no way to *wait* for the completion of the operation (or a chain of operations). If other parts of the application need to coordinate (wait for) a lock-bound task, those parts should be invoked *inside* the lock-bound task.

#### Lower-level mechanisms

As asserted earlier, the preferred and safest usage of **Locker** is with `when()`. However, sometimes it's more convenient to use two lower-level methods: `get()` and `release()`:

* `get(..)`: obtains an exclusive lock for this instance.

    If the lock is available, returns `undefined` (so as to not block an `await` unnecessarily). But if lock is already held, returns a promise that will resolve once the exclusive lock is obtained:

    ```js
    import Locker from "..";

    var lock = Locker();

    await lock.get();

    // now ready to safely access shared resource(s)

    lock.release();
    ```

    **Note:** `lock.release()` should be called as soon as the lock obtained by `lock.get()` is no longer needed. See below for important clarifications.

    Pass `true` as an argument (or the options object `{ forceResolvedPromise: true }`) to always return a promise; if lock is inactive, that promise will already be resolved. This safely enables promise chaining like `lock.get(true).then(..)`, if desired:

    ```js
    import Locker from "..";

    var lock = Locker();

    lock.get(true)
        // safe to call .then()
        .then(/* .. */)
        .finally(() => lock.release());
    ```

    To support externally cancelling a pending request for the lock, pass an options object (e.g., `{ signal: .. }`) as the argument to `get(..)`, with an [`AbortSignal` instance](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) (from an [`AbortController` instance](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)).

    For example, use a [timeout signal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static) to cancel the lock if it takes too long to obtain:

    ```js
    import Locker from "..";

    var lock = Locker();

    try {
        await lock.get({ signal: AbortSignal.timeout(5000), });

        // ..

        lock.release();
    }
    catch (err) {
        // lock may have timed out
    }
    ```

    **Note:** If obtaining the lock is canceled by the `signal`, an exception will be thrown -- hence, the `try..catch`. In this case, `lock.release()` *should not* be called; doing so might prematurely release a subsequent hold on the lock (elsewhere in the app).

* `release()`: releases a current hold on the lock (if any); takes no input and has no return value. Has no effect if the lock is not currently active.

    ```js
    import Locker from "..";

    var lock = Locker();

    await lock.get();

    // now ready to safely access shared resource(s)

    lock.release();
    ```

    Calls to `lock.get()` and `lock.release()` must always be paired together, and pairs of calls must never be *nested*. Otherwise, the application will experience deadlocks or other unexpected behavior.

    Further, take care not to call `lock.release()` unless its *paired* `lock.get()` call succeeded (no cancellation exception). Otherwise, this may prematurely release a subsequent hold on the lock (elsewhere in the app), causing bugs.

## Re-building `dist/*`

If you need to rebuild the `dist/*` files for any reason, run:

```cmd
# only needed one time
npm install

npm run build:all
```

## Tests

Visit [`https://byojs.dev/locker/`](https://byojs.dev/locker/) and click the "run tests" button.

### Run Locally (browser)

To instead run the tests locally in a browser, first make sure you've [already run the build](#re-building-dist), then:

```cmd
npm run test:start
```

This will start a static file webserver (no server logic), serving the interactive test page from `http://localhost:8080/`; visit this page in your browser and click the "run tests" button.

By default, the `test/browser.js` file imports the code from the `src/*` directly. However, to test against the `dist/*` files (as included in the npm package), you can modify `test/browser.js`, updating the `/src` in its `import` statements to `/dist` (see the import-map in `test/index.html` for more details).

### Run Locally (CLI)

To run the tests on the CLI, first make sure you've [already run the build](#re-building-dist), then:

```cmd
npm test
```

By default, the `test/cli.js` file imports the code from the `src/*` directly. However, to test against the `dist/*` files (as included in the npm package), swap out which of the two `import` statements at the top of `test/cli.js` is commented out, to use the `./dist/locker.mjs` import specifier.

## License

[![License](https://img.shields.io/badge/license-MIT-a1356a)](LICENSE.txt)

All code and documentation are (c) 2024 locker and released under the [MIT License](http://mit-license.org/). A copy of the MIT License [is also included](LICENSE.txt).
