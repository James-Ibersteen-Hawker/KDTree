import KDTree from "./kdtree.js";
// import d50k3d from "./datasets/50k3d.js"
// import d50k4d from "./datasets/50k4d.js"
// import d603d from "./datasets/603d.js"
// import { writeFile } from 'node:fs/promises';
import d10p from "./benchmark_sets/10p.js";
import d100p from "./benchmark_sets/100p.js";
import d1000p from "./benchmark_sets/1000p.js";
import d10000p from "./benchmark_sets/10000p.js";
import d100000p from "./benchmark_sets/100000p.js";
import d1000000p from "./benchmark_sets/1000000p.js";


// const list = [];
// const l = 1000000;
// for (let i = 0; i < l; i++) {
//     const point = [];
//     for (let d = 0; d < 3; d++) {
//         const random = Math.random() * 1000;
//         point.push(random);
//     }
//     list.push(point);
// }
// await writeFile(
//   `./src/benchmark_sets/${l}p.js`,
//   `const d${l}p = ${JSON.stringify(list)};\nexport default d${l}p;`
// );
const q = [300 * Math.E, 300.4323834, Math.PI];
const iterations = 500;
const benchmarks = [];
const lists = [d10p, d100p, d1000p, d10000p, d100000p]
for (let i = 0; i < lists.length; i++) {
    const testList = lists[i];
    const testOBJ = {
        "construction (in ms)": null,
        "search (in ms)": null,
        size: testList.length,
        result: null
    }
    let TestTree;
    //construction
    let cumulativeBuildTime = 0;
    for (let d = 0; d < iterations; d++) {
        const buildStart = performance.now();
        TestTree = await KDTree.initFrom(testList);
        const buildEnd = performance.now();
        cumulativeBuildTime += buildEnd - buildStart;
    }
    testOBJ["construction (in ms)"] = cumulativeBuildTime / iterations;
    //searching
    let cumulativeSearchTime = 0;
    for (let d = 0; d < iterations; d++) {
        const searchStart = performance.now();
        testOBJ.result = TestTree.search(q, {});
        const searchEnd = performance.now();
        cumulativeSearchTime += searchEnd - searchStart;
    }
    testOBJ["search (in ms)"] = cumulativeSearchTime / iterations;
    benchmarks.push(testOBJ);
}
console.log(q);
console.table(benchmarks)