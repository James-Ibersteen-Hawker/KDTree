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
- automatically deduplicates the input list with [`xxhash-wasm`](https://github.com/cyan4973/xxhash)
- stores data in [`Float32Array[]`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float32Array)
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
- Cannot be initialized from constructor, must use [`initFrom()`](#initialize)
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
It is asynchronous in order to load `xxhash-wasm` modules. Do not do `new KDTree(dataset)`. This will not work.
```js
const myTree = await KDTree.initFrom(dataset)
```
### Change Set:
```js
myTree.set(dataset) //new dataset
```
### Nearest-Neighbor Search: (partial-axis is not implemented yet)
`axis = []` specifies which axes to search on (include). Omission implies all axes are included

`includeDistance = true | false` selects whether to include the distance to the closest point in the result.

returns: `Point[]` or `[distance, Point[]]` when `includeDistance === true`

```js
const result = myTree.search(query, options{ axis: [], includeDistance: true | false })
```
### Serialization: (not decoding yet)
```js
const serial = myTree.serialize(format)
```
`format = String` specifies output format. Omission assumes `"json"`.

Values:  `"json", "blob", "es6-standard", "es6-typed"`

- `"json"`: JSON-string
- `"blob"`: Blob-format
- `"es6-standard"`: standard JS `Array[]` format
- `"es6-typed"`: standard JS `Float32Array[]` format
```js
const deSerializedTree = KDTree.initFromSerial(serial, format)
```
`format` must match the serialized format to decode properly.
***
MIT License - 2026