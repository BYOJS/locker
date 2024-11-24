// note: this module specifier comes from the import-map
//    in index.html; swap "src" for "dist" here to test
//    against the dist/* files
import Locker from "locker/src";

import Tests from "./test-cases.js";


var runTestsBtn;
var testResultsEl;


// ***********************

if (document.readyState == "loading") {
	document.addEventListener("DOMContentLoaded",ready,false);
}
else {
	ready();
}


// ***********************

async function ready() {
	runTestsBtn = document.getElementById("run-tests-btn");
	testResultsEl = document.getElementById("test-results");

	runTestsBtn.addEventListener("click",runTests,false);
}

async function runTests() {
	testResultsEl.innerHTML = "";
	try {
		runTestsBtn.disabled = true;
		await Tests(Locker,output,logError);
		runTestsBtn.disabled = false;
	}
	catch (err) {
		logError(err);
	}
}

function output(msg,append = true) {
	if (append) {
		testResultsEl.innerHTML += `${msg}<br>`;
	}
	else {
		testResultsEl.innerHTML = `${msg}<br>`;
	}
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
