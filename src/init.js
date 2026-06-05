import KDTree from "./kdtree.js";
import BigSet from "./benchmark.js"
import SmallSet from "./data.js"
import fs from 'fs/promises';
//////
let start = performance.now()
const newTree = await KDTree.initFrom(BigSet);
let end = performance.now()
console.log(start, end)

const q = [-30.5,Math.PI, Math.E];
for (let i = 0; i < 100000; i++) {
    newTree.search(q)
}
start = performance.now();
const result = newTree.search(q)
end = performance.now();
console.log(start, end);
console.log(result)


const list = [];
for (let i = 0; i < 50000; i++) {
    const point = new Array(4);
    for (let d = 0; d < 4; d++) {
        const random = Math.random() * 500 - Math.random() * 500;
        point[d] = random;
    }
}

async function savePoints(myList) {
  try {
    const dataString = JSON.stringify(myList);
    // Write the file (Arguments: filename, data)
    await fs.writeFile('points_4d.json', dataString);
    console.log('File successfully saved!');
  } catch (error) {
    console.error('Error writing file:', error);
  }
}

savePoints(list);