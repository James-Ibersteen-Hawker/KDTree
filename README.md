> Status: v.01 released
# JavaScript KD-Tree
A SoA memory-efficient KD-Tree implementation in JavaScript. It is expected to be more efficient in memory than object or pointer based trees.

It is built to handle midrange point sets (10k - 100k points) of low dimensionality.

It however lacks most analytics functionality, and the `es6-standard` serialization method dangerously exposes internal state, use at your own risk. <b>VERY IMPORTANT</b>

### Terms Reference
- [Float32Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float32Array): A contiguous-in-memory typed array which stores 32bit floats
- [Int32Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Int32Array): A contiguous-in-memory typed array which stores positive and negative 32bit integers
- [Uint32Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint32Array): A contiguous-in-memory typed array which stores only positive 32bit integers
- [Structure of Arrays](https://en.wikipedia.org/wiki/AoS_and_SoA) (SoA): A structure whereby data isn't kept in objects, but at a given index in parallel arrays, for better efficiency
- [Nearest-neighbor search](https://en.wikipedia.org/wiki/Nearest_neighbor_search) (NN): A method which tells you out of a dataset of vector points, which point is closest to your query point P.
- [KD-Tree](https://en.wikipedia.org/wiki/K-d_tree): A spatial NN search construct organized more efficiently into a tree structure.
- [xxHash](https://github.com/cyan4973/xxhash): A powerful non-cryptographic very fast hash used for deduplication within this tree. `xxhash-wasm` is the WebAssembly version
- [Quickselect](https://en.wikipedia.org/wiki/Quickselect): A partial version of the Quicksort algorithm, designed to partition the list to find the kth smallest element.
- [Median-of-three](https://en.wikipedia.org/wiki/Median#Efficient_computation_of_the_sample_median): A more accurate median-selection algorithm which compares three points to find the median, instead of the numerical or geometric median
- [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob): A raw binary buffer, immutable until decoded. Primarily used for downloading.
***
## Table of Contents:
1. [Quickstart](#quickstart)
2. [Features](#features)
3. [Limitations](#limitations)
4. [Structure](#structure)
5. [API](#api)
6. [Benchmarking](#benchmarking)
7. [Reference](#terms-reference)
***

### Features:
- Memory-efficient implicit SoA tree structure
- Automatically deduplicates the input list with `xxhash-wasm`
- Stores data in `Float32Array[]`
- NN search for D dimensions
- Full-axis spatial NN search
- Partial-axis NN search
- Full serialization and deserialization in multiple formats

### Limitations:
- Values are stored as `Float32` (~7 decimal digits of precision)
- Input values are constrained by `Float32Array[]` format
- Internal indices are limited to `Uint32Array[]` values
- The tree is implicit, and so is harder to read
- Dependency on `xxhash-wasm`
- Asynchronous creation
- The speed of search and quality of the tree degrades above ~10-30 dimensions.

### Structure:
- Nodeless implicit SoA structure
- Stores node data in parallel arrays
- No pointers or object storage
- Serialization preserves internal layout
- Uses `quickselect` and `median-of-three` partitioning around the pivot
- Core data is immutable after initialization
- Automatic deduplication with `xxhash-wasm`
- Cannot be initialized from constructor, must use [`initFrom()`](#initialize)
- Mins and Maxes are stored as `Float32Array[]`
- Left and Right ID's are stored as `Int32Array[]`
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
import KDTree from "https://cdn.jsdelivr.net/gh/James-Ibersteen-Hawker/KDTree@v3.0.0/kdtree.js";

const tree = await KDTree.initFrom(dataset);

const nearest = tree.search([5, 10]);
```
### Import:
js import
```js
import KDTree from 'https://cdn.jsdelivr.net/gh/James-Ibersteen-Hawker/KDTree@v3.0.0/kdtree.js'
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
| `leaf_threshold` | `Number` | Returns the size cutoff of the leaf |
| `components` | `Object{ dimension, leaflength, length, layout, storage, byteSize }` | Displays the general attributes of the KD-Tree|
| `methods` | `Object{ name: function }` | Returns an object of the methods available on the KD-Tree |
| `properties` | `Object{ name: method }` | Returns an object of the getter-properties of the KD-Tree |
| `leafsize` | `void` | Sets the leaf threshold of the KD-Tree |

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

if `includeDistance` is `true`, then the function will return `[distance, point]`
if `includeDistance` is `false`, then the function will return `point`.

Point is an array `[x,y,z,a,b,c...]` and Distance is a `Number`. 

```js
const result = myTree.search(query, { axes: [], includeDistance: true })
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
|`"es6-standard"***` | `Array[]` of typed arrays of formats `Float32Array[], Uint32Array[], and Int32Array[]` | Non-converted, easier to process, the most explicit format | Large, full-allocation, not fully JS Arrays, exposes internal state to mutation (see WARNING) |
|`"json"` | JSONified `es6-standard` format | JSON-encoded for string-only storage | Even heavier than `es6-standard`, string-only |
|`"es6-typed"` | A contiguous `ArrayBuffer()` of all the data | fastest zero-copy transfer, contiguous storage in memory | Hard to read and parse, does not hint at contents |
|`"blob"` | Blob-encoded `es6-typed` | Immutable, downloadable, a single package | Hard to deal with, requires decoding, limited-use |

<h3><b>***!!! Important Warning !!!</b></h3>

The `es6-standard` serialization output is both read/write access. Since it exposes the internal state of the tree, if anything writes to or corrupts the output, the tree's data will also be corrupted. This is because the serialization `es6-standard` does not reallocate, and maintains a shared ArrayBuffer.

<h2>Deserialization</h2>

```js
const deSerializedTree = KDTree.initFromSerial(serial)
```

***

## Benchmarking:

### Metrics against seven 3D sets: 
`O(N)` time of construction

Search time remained approximately constant within measurement noise for tested ranges

<b>Linear set growth: 3D</b>
| Size | Construction (in ms) | Search (in ms) | 
| :----: | :--------------------: | :--------------: |
| 10,000 | 5.043691466 | 0.007543008 |
| 20,000 | 9.261608314 | 0.003628262 |
| 30,000 | 13.94977631 | 0.001879596 |
| 40,000 | 20.39556221 | 0.001972118 |
| 50,000 | 25.47883556 | 0.001766268 |
| 60,000 | 30.18733742 | 0.002713570 |
| 70,000 | 37.85199371 | 0.002158740 |

<b>Exponential set growth: 3D</b>
| Size | Construction (in ms) | Search (in ms) | 
| :----: | :--------------------: | :--------------: |
| 10 | 0.013415766 | 0.002723270 |
| 100 | 0.054140202 | 0.013077772 |
| 1,000 | 0.316238202 | 0.004994876 |
| 10,000 | 4.235251884 | 0.002001026 |
| 100,000 | 56.929321726 | 0.002161332 |



***
[MIT License](./LICENSE) - 2026 James Ibersteen Hawker
