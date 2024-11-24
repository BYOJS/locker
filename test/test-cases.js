export default Tests;


// ***********************

async function Tests(Locker,output,logError) {
	output("Locker tests running...");

	var testCases = [ one, two, three, four, five, ];

	for (let test of testCases) {
		let result = await test();
		if (!result) {
			return;
		}
	}

	output(`Locker tests (${testCases.length}) complete.`);


	// ***********************

	async function one() {
		var lock = Locker();

		var actual = [];
		var expected = [ "lock obtained", "lock re-obtained", ];

		try {
			await lock.get();
			actual.push("lock obtained");
			lock.release();

			await lock.get();
			actual.push("lock re-obtained");
			lock.release();

			if (JSON.stringify(actual) != JSON.stringify(expected)) {
				output(`(1) failed`);
				output(`  Expected: ${expected.join(",")}`);
				output(`  Found: ${actual.join(",")}`);
				return false;
			}

			return true;
		}
		catch (err) {
			logError(err);
		}

		return false;
	}

	async function two() {
		var lock = Locker();

		var actual = [];
		var expected = [
			"when: 1",
			"when: 2",
			"when: 3",
			"when: 4",
			"lock re-obtained",
		];

		try {
			lock
				.when(async () => {
					actual.push("when: 1");

					await delay(10);

					actual.push("when: 2");
				})
				.when(v => {
					actual.push(`when: ${v}`);
				},{ pass: [ 3, ], })
				.when(async () => {
					await delay(10);

					actual.push("when: 4");
				});

			await lock.get();
			actual.push("lock re-obtained");
			lock.release();

			if (JSON.stringify(actual) != JSON.stringify(expected)) {
				output(`(2) failed`);
				output(`  Expected: ${expected.join(",")}`);
				output(`  Found: ${actual.join(",")}`);
				return false;
			}

			return true;
		}
		catch (err) {
			logError(err);
		}

		return false;
	}

	async function three() {
		async function step(v) {
			await delay(10);
			actual.push(`before step: ${v}`);
			await lock.get(true);
			actual.push(`step: ${v}`);
			lock.release();
			await delay(10);
			actual.push(`after step: ${v}`);
		}

		var lock = Locker();

		var actual = [];
		var expected = [
			"before step: 1",
			"step: 1",
			"before step: 2",
			"step: 2",
			"before step: 3",
			"step: 3",
			"lock re-obtained",
			"after step: 1",
			"after step: 2",
			"after step: 3",
		];

		try {
			for (let i = 1; i <= 3; i++) {
				step(i).catch(err => actual.push(err));
			}

			await delay(15);

			await lock.get();
			actual.push("lock re-obtained");
			lock.release();

			await delay(50);

			if (JSON.stringify(actual) != JSON.stringify(expected)) {
				output(`(3) failed`);
				output(`  Expected: ${expected.join(",")}`);
				output(`  Found: ${actual.join(",")}`);
				return false;
			}

			return true;
		}
		catch (err) {
			logError(err);
		}

		return false;
	}

	async function four() {
		function step(v) {
			return (
				lock.get(true)
					.then(() => actual.push(`step: ${v}`))
					.then(() => delay(10))
					.then(() => lock.release())
			);
		}

		var lock = Locker();

		var actual = [];
		var expected = [
			"step: 1",
			"step: 2",
			"step: 3",
			"lock re-obtained",
		];

		try {
			await Promise.all([
				step(1),
				step(2),
				step(3),
			]);

			await lock.get();
			actual.push("lock re-obtained");
			lock.release();

			if (JSON.stringify(actual) != JSON.stringify(expected)) {
				output(`(4) failed`);
				output(`  Expected: ${expected.join(",")}`);
				output(`  Found: ${actual.join(",")}`);
				return false;
			}

			return true;
		}
		catch (err) {
			logError(err);
		}

		return false;
	}

	async function five() {
		function step(v,signal) {
			return (
				lock.get({ forceResolvedPromise: true, signal, })
					.then(() => actual.push(`step: ${v}`))
					.then(() => delay(v * 100))
					.then(() => lock.release())
			);
		}

		var lock = Locker();

		var actual = [];
		var expected = [
			"step: 1",
			"step: 3",
			"fulfilled",
			"abort",
			"fulfilled",
			"lock re-obtained",
		];

		try {
			actual.push(
				...(await Promise.allSettled([
					step(1),
					step(2,AbortSignal.timeout(50)),
					step(3),
				]))
					.map(obj => (
						obj.status == "fulfilled" ?
							obj.status :

						obj.status == "rejected" ?
							(obj.reason && obj.reason.type) :

							"unknown"
					))
			);

			await lock.get();
			actual.push("lock re-obtained");
			lock.release();

			if (JSON.stringify(actual) != JSON.stringify(expected)) {
				output(`(5) failed`);
				output(`  Expected: ${expected.join(",")}`);
				output(`  Found: ${actual.join(",")}`);
				return false;
			}

			return true;
		}
		catch (err) {
			logError(err);
		}

		return false;
	}
}

function delay(ms) {
	return new Promise((res) => setTimeout(res, ms));
}
