// note: swap the commenting of these two statements
//    to test the dist/* files
import Locker from "./src/locker.js";
// import Locker from "./dist/locker.mjs";

import Tests from "./test-cases.js";


Tests(Locker,output,logError).catch(logError);


// ***********************

function output(msg) {
	console.log(msg);
}

function logError(err,returnLog = false) {
	var err = `${
			err.stack ? err.stack : err.toString()
		}${
			err.cause ? `\n${logError(err.cause,/*returnLog=*/true)}` : ""
	}`;
	if (returnLog) return err;
	else console.error(err);
}
