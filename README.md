> Status: late development, pre v.01
# JavaScript KD-Tree
A memory-efficient implicit SoA structure KD-tree implemented in JavaScript. It was built as an exercise-turned tool to learn memory efficiency, specifically in a JavaScript environment. It employs 32bit arrays throughout.
## Table of Contents:
1. [Quickstart](#quickstart)
2. [Features](#features)
3. [Limitations](#limitations)
4. [Structure](#structure)
5. [API](#api)
***

### Features:
- Memory-efficient implicit [Structure-of-Arrays](https://en.wikipedia.org/wiki/AoS_and_SoA) (SoA) tree structure
- Automatically deduplicates the input list with [`xxhash-wasm`](https://github.com/cyan4973/xxhash)
- Stores data in [`Float32Array[]`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float32Array)
- N-dimensional nearest-neighbor (NN) search
- Full-axis NN search
- Partial-axis NN search (not yet)
- Full serialization and deserialization in multiple formats (not yet)

### Limitations:
- Values are stored as `Float32` (~7 decimal digits of precision)
- Input values are constrained by `Float32Array[]` format
- Internal indices are limited to [`Uint32Array[]`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint32Array) values
- The tree is implicit, and so is harder to read
- Dependency on `xxhash-wasm`
- Asynchronous creation
- Curse of dimensionality

### Structure:
- Nodeless implicit SoA structure
- Stores tree data in parallel arrays
- Serialization preserves internal layout
- Uses `quickselect` and `median-of-three` partitioning around the pivot
- Core data is immutable after initialization
- Automatic deduplication with `xxhash-wasm`
- Cannot be initialized from constructor, must use [`initFrom()`](#initialize)
- Mins and Maxes are stored as `Float32Array[]`
- Left and Right ID's are stored as [`Int32Array[]`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Int32Array)
- Referential construction: does not alter the order of data, only of indexes to data. This simplifies processing
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
If the list is under the `leafsize` threshold, it will not construct a tree; It will instead just blitz the list on a search.
### Serialization: (not decoding yet)
```js
const serial = myTree.serialize(format)
```
`format = String` specifies output format. Omission assumes `"json"`.

Values:  `"json", "blob", "es6-standard", "es6-typed"`

- `"json"`: JSON stringified version of es6-standard
- `"blob"`: Blob version of es6-typed
- `"es6-standard"`: a standard JS `Array` containing the internal `Float32Array, Uint32Array, and Int32Array` in their original forms (not converted to arrays)
- `"es6-typed"`: An `ArrayBuffer()` contiguous format
```js
const deSerializedTree = KDTree.initFromSerial(serial)
```
<b>Warning</b>: the `es6-standard` and `es6-typed` serialization outputs are both read/write access; altering them alters the tree that created them, and the tree that is created <i>from</i> them

***
MIT License - 2026 James Ibersteen Hawker