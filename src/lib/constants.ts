export const SPEED_OPTIONS = [0.5, 1, 1.5, 2, 3] as const;
export const BASE_STEP_DELAY = 1000; // ms

export const DEFAULT_CODE = `console.log("Start");

setTimeout(function timer() {
  console.log("Timer done");
}, 1000);

Promise.resolve().then(function microtask() {
  console.log("Microtask 1");
});

console.log("End");`;

export interface CodeExample {
  name: string;
  code: string;
}

export const CODE_EXAMPLES: CodeExample[] = [
  {
    name: "Event Loop Basics",
    code: DEFAULT_CODE,
  },
  {
    name: "Closures",
    code: `function createCounter() {
  let count = 0;
  return function increment() {
    count = count + 1;
    console.log(count);
    return count;
  };
}

const counter = createCounter();
counter();
counter();
counter();`,
  },
  {
    name: "Promise Chaining",
    code: `console.log("Script start");

Promise.resolve("first")
  .then(function first(val) {
    console.log(val);
    return "second";
  })
  .then(function second(val) {
    console.log(val);
  });

console.log("Script end");`,
  },
  {
    name: "Multiple Timers",
    code: `console.log("Start");

setTimeout(function fast() {
  console.log("Fast timer");
}, 0);

setTimeout(function slow() {
  console.log("Slow timer");
}, 2000);

Promise.resolve().then(function micro() {
  console.log("Microtask");
});

console.log("End");`,
  },
  {
    name: "Call Stack",
    code: `function multiply(a, b) {
  return a * b;
}

function square(n) {
  return multiply(n, n);
}

function printSquare(n) {
  const result = square(n);
  console.log(result);
}

printSquare(5);`,
  },
  {
    name: "Hoisting",
    code: `console.log(x);
console.log(typeof greet);

var x = 10;

function greet() {
  console.log("Hello!");
}

greet();
console.log(x);`,
  },
  {
    name: "Mixed Async",
    code: `console.log("1");

setTimeout(function timeout1() {
  console.log("2");
}, 0);

Promise.resolve().then(function promise1() {
  console.log("3");
}).then(function promise2() {
  console.log("4");
});

setTimeout(function timeout2() {
  console.log("5");
}, 0);

console.log("6");`,
  },
];
