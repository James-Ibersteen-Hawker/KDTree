> Status: late development, pre v.01
# JavaScript KD-Tree
A memory-efficient implicit SoA structure KD-tree implemented in JavaScript.
## Table of Contents:
1. [Quickstart](#quickstart)
2. [Features](#features)
3. [Limitations](#limitations)
4. [Structure](#structure)
5. [API](#api)
***

### Features:
- memory-efficient implicit Structure-of-Arrays (SoA) tree structure
- automatically deduplicates the input list with `xxhash-wasm`
- stores data in `Float32`
- N-dimensional nearest-neighbor (NN) search
- full-axis NN search
- partial-axis NN search (not yet)
- full serialization and deserialization in multiple formats (not yet)

### Limitations:
- Values are stored as Float32 (~7 decimal digits of precision)
- Input values are constrained by `Float32` format
- Internal indices are limited to `Uint32` values
- The tree is implicit, and so is harder to read
- Dependency on `xxhash-wasm`
- Asynchronous creation

### Structure:
- Nodeless implicit SoA structure
- Stores tree data in parallel arrays
- serialization preserves internal layout
- Uses `quickselect` and `median-of-three` partitioning around the pivot
- Core data is immutable after initialization
- Automatic deduplication with `xxhash-wasm`
- Cannot be initialized from constructor, must use [initFrom()](#initialize)
***
#  API
## Table of Contents
1. [Quickstart](#quickstart)
2. [Import](#import)
3. [Initialize](#initialize)
4. [Change Set](#change-set)
5. [Nearest-neighbor Search - Partial axis is not implemented yet](#nearest-neighbor-search-partial-axis-is-not-implemented-yet)
6. [Serialization - Not implemented yet](#serialization)
***
### Quickstart:
```js
import KDTree from "js-kdtree";

const tree = await KDTree.initFrom(dataset);

const nearest = tree.search([5, 10]);
```
### Import:
```js
import KDTree from 'js-kdtree'
```
### Initialize:
```js
// It is asynchronous in order to load `xxhash-wasm` modules
const myTree = await KDTree.initFrom(dataset)
//do not do <new KDTree(dataset)>. This will not work.
```
### Change Set:
```js
myTree.set(dataset) //new dataset
```
### Nearest-Neighbor Search: (partial-axis is not implemented yet)
```js
const result = myTree.search(query, options{ axis: [], includeDistance: true | false })

/* 

- <axis?> specifies which axes to search on (include). Omission implies all axes are included

- <includeDistance?> selects whether to include the distance to the closest point in the result. It is a Boolean value

- returns:
  Point[]
  [distance, Point[]] when includeDistance is true

*/
```
### Serialization: (not implemented yet)
```js
//serialization
const serialTree = myTree.serialize(format?)
/*

- <format?> specifies output format. Omission assumes {JSON}
- values: "json", "blob", "es6-standard", "es6-typed"
    - "json": JSON-string
    - "blob": Blob-format Array[]
    - "es6-standard": standard JS Array[] format
    - "es6-typed": standard JS Float32Array[] format

*/

//deserialization
const deSerializedTree = KDTree.initFromSerial(data, format?)
/*

Format must be specified to match data. {JSON} is assumed by default

*/
```
