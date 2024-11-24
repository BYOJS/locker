export { Locker, };
export default Locker;


// ***********************

function Locker() {
	var curDef = { promise: null, resolve: null, reject: null, };
	var lock = {
		when(fn,options = {}) {
			return whenUnlocked.call(
				this,
				fn,
				{
					...(
						options != null && typeof options == "object" ?
							options :
							{}
					),
					lock,
				}
			);
		},
		get(options = {}) {
			var {
				forceResolvedPromise = false,
				...otherOptions
			} = (
				options === true ?
					{ forceResolvedPromise: true, } :
					options
			);
			return getLock({
				forceResolvedPromise,
				...otherOptions,
				curDef,
			});
		},
		release() {
			return releaseLock(curDef);
		},
	};
	return lock;
}

function whenUnlocked(fn,{ pass = [], signal, lock, }) {
	var lockObtained = false;
	lock
		.get({ forceResolvedPromise: true, signal, })
		.then(() => {
			lockObtained = true;
			return fn.apply(this,pass);
		})
		.finally(() => lockObtained && lock.release());
	return lock;
}

function getLock({
	forceResolvedPromise,
	signal,
	curDef,
}) {
	// signal provided, but already aborted?
	if (signal != null && signal.aborted) {
		throw new Error(signal.reason);
	}

	var nextDef = getDeferred();

	if (curDef.promise == null) {
		Object.assign(curDef,nextDef);
		scheduleDefCleanup(curDef);
		if (forceResolvedPromise) {
			return Promise.resolve();
		}
	}
	else {
		let curPr = curDef.promise;
		let { promise: nextPr, resolve, reject, } = nextDef;
		nextDef = null;
		curDef.promise = curPr.then(() => {
			var _nextPr = nextPr;
			curDef.resolve = resolve;
			curDef.reject = reject;
			curPr = nextPr = resolve = reject = null;
			return _nextPr;
		});
		scheduleDefCleanup(curDef);
		if (signal != null) {
			return new Promise((res,rej) => {
				var onAbort = reason => {
					// promise not yet resolved?
					if (rej != null) {
						rej(reason);
						releaseLock(curDef);
					}
					onAbort = res = rej = null;
				};
				signal.addEventListener("abort",onAbort);
				curPr.then(() => {
					signal.removeEventListener("abort",onAbort);
					if (res != null) {
						res();
					}
					onAbort = res = rej = null;
				});
			});
		}
		return curPr;
	}
}

function scheduleDefCleanup(curDef) {
	var pr = curDef.promise;
	pr.finally(() => {
		// cleanup deferred (if lock now inactive)
		if (curDef.promise == pr) {
			curDef.promise = curDef.resolve = curDef.reject = null;
		}
		pr = null;
	});
}

function releaseLock(curDef) {
	if (curDef.resolve != null) {
		let resolve = curDef.resolve;
		curDef.resolve = curDef.reject = null;
		resolve();
	}
}

function getDeferred() {
	if (typeof Promise.withResolvers == "function") {
		return Promise.withResolvers();
	}
	else {
		let resolve, reject, promise = new Promise((res,rej) => {
			resolve = res;
			reject = rej;
		});
		return { promise, resolve, reject, };
	}
}
