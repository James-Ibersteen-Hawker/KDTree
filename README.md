> Status: late development, pre v.01
# JavaScript KD-Tree
A memory-efficient implicit SoA structure KD-tree implemented in JavaScript. It was built as an exercise-turned tool to learn memory efficiency, specifically in a JavaScript environment. It employs 32bit arrays throughout.
## Table of Contents:
1. [Quickstart](#quickstart)
2. [Features](#features)
3. [Limitations](#limitations)
4. [Structure](#structure)
5. [API](#api)
6. [Benchmarking](#benchmarking)
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
4. [Properties](#properties)
5. [Change Set / Clear Set](#change-set)
6. [Nearest-neighbor Search](#nearest-neighbor-search)
7. [Serialization](#serialization)
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
### Properties:
| Property | Returns | Purpose |
| :--------: | :-------: | :-------: |
| `data` | `Array[]` | Returns an array of the original dataset. However, this set is post-dedupe, and is in partitioned order
| `size` | `Number` | Returns the total number of points in the tree |
| `leafsize` | `Number` | Returns the size cutoff of the leaf |
| `components` | `Object{ dimension, leaflength, length, layout, storage, byteSize }` | Displays the general attributes of the KD-Tree|

### Change Set:
```js
myTree.set(dataset) //new dataset
```
```js
myTree.clear() //clears all internal data
```
### Nearest-Neighbor Search:
`axis = []` specifies which axes to search on (include). Omission implies all axes are included

`includeDistance = true | false` selects whether to include the distance to the closest point in the result.

returns: `Point[]` or `[distance, Point[]]` when `includeDistance === true`

```js
const result = myTree.search(query, options{ axis: [], includeDistance: true | false })
```
If the list is under the `leafsize` threshold, it will not construct a tree; It will instead just blitz the list on a search.
### Serialization:
```js
const serial = myTree.serialize(format)
```
`format = String` specifies output format. Omission assumes `"json"`.

Values can be `"json", "blob", "es6-standard", or "es6-typed"`

| Name | Format | Advantages | Disadvantages |
| :-----: | ------ | ------- | ------------- |
|`"es6-standard"` | `Array[]` of typed arrays of formats `Float32Array[], Uint32Array[], and Int32Array[]` | Non-converted, easier to process, the most explicit format | Large, full-allocation, not fully JS Arrays |
|`"json"` | JSONified `es6-standard` format | JSON-encoded for string-only storage | Even heavier than `es6-standard`, string-only |
|`"es6-typed"` | A contiguous `ArrayBuffer()` of all the data | fastest zero-copy transfer, contiguous storage in memory | Hard to read and parse, does not hint at contents |
|`"blob"` | Blob-encoded `es6-typed` | Immutable, downloadable, a single package | Hard to deal with, requires decoding, limited-use |

<b>General Warning</b>: the `es6-standard` serialization output is both read/write access; altering it alters the tree that created it, and the tree that is created <i>from</i> it
```js
const deSerializedTree = KDTree.initFromSerial(serial)
```
***
## Benchmarking:

### Metrics against seven 3D sets: 
`O(N)` time of construction     `O(≈1)` time of search

<b>Linear set growth:</b>
| Size | Construction (in ms) | Search (in ms) | 
| :----: | :--------------------: | :--------------: |
| 10,000 | 5.043691466 | 0.007543008 |
| 20,000 | 9.261608314 | 0.003628262 |
| 30,000 | 13.94977631 | 0.001879596 |
| 40,000 | 20.39556221 | 0.001972118 |
| 50,000 | 25.47883556 | 0.001766268 |
| 60,000 | 30.18733742 | 0.002713570 |
| 70,000 | 37.85199371 | 0.002158740 |

<b>Exponential set growth:</b>
| Size | Construction (in ms) | Search (in ms) | 
| :----: | :--------------------: | :--------------: |
| 10 | 0.013415766 | 0.002723270 |
| 100 | 0.054140202 | 0.013077772 |
| 1,000 | 0.316238202 | 0.004994876 |
| 10,000 | 4.235251884 | 0.002001026 |
| 100,000 | 56.929321726 | 0.002161332 |



***
[MIT License](./LICENSE) - 2026 James Ibersteen Hawker