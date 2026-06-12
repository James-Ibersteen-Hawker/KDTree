// import { writeFile } from 'node:fs/promises';
// import d10000p from "./linear-benchmarks/10000p.js";
// import d20000p from "./linear-benchmarks/20000p.js";
// import d30000p from "./linear-benchmarks/30000p.js";
// import d40000p from "./linear-benchmarks/40000p.js";
// import d50000p from "./linear-benchmarks/50000p.js";
// import d60000p from "./linear-benchmarks/60000p.js";
// import d70000p from "./linear-benchmarks/70000p.js";

// const list = [];
// const l = 70000;
// for (let i = 0; i < l; i++) {
//     const point = [];
//     for (let d = 0; d < 3; d++) {
//         const random = Math.random() * 1000;
//         point.push(random);
//     }
//     list.push(point);
// }
// await writeFile(
//   `./src/linear-benchmarks/${l}p.js`,
//   `const d${l}p = ${JSON.stringify(list)};\nexport default d${l}p;`
// );

// const iterations = 500;
// const benchmarks = [];
// const linearLists = [d10000p, d20000p, d30000p, d40000p, d50000p, d60000p, d70000p]
// const lists = [d10p, d100p, d1000p, d10000p, d100000p]
// async function benchmark(list) {
//     for (let i = 0; i < list.length; i++) {
//         const testList = list[i];
//         const testOBJ = {
//             "construction (in ms)": null,
//             "search (in ms)": null,
//             size: testList.length,
//             result: null
//         }
//         let TestTree;
//         //construction
//         let cumulativeBuildTime = 0;
//         for (let d = 0; d < iterations; d++) {
//             const buildStart = performance.now();
//             TestTree = await KDTree.initFrom(testList);
//             const buildEnd = performance.now();
//             cumulativeBuildTime += buildEnd - buildStart;
//         }
//         testOBJ["construction (in ms)"] = cumulativeBuildTime / iterations;
//         //searching
//         let cumulativeSearchTime = 0;
//         for (let d = 0; d < iterations; d++) {
//             const searchStart = performance.now();
//             testOBJ.result = TestTree.search(q, {});
//             const searchEnd = performance.now();
//             cumulativeSearchTime += searchEnd - searchStart;
//         }
//         testOBJ["search (in ms)"] = cumulativeSearchTime / iterations;
//         benchmarks.push(testOBJ);
//     }
// }
// await benchmark(linearLists);
// console.table(benchmarks)