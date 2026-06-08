# JavaScript KD-Tree
An implicit SoA structure KD-tree implemented in JavaScript.
## Table of Contents:
1. [Features](#features)
2. [Limitations](#limitations)
3. [Structure](#structure)
4. [API](#api)
***

### Features:
- xxhash-based deduplication
- N-dimension support
- full-axis NN search
- specific-axis(es) NN search
- full serialization
- Can handle 32bit floats, non-integers, and non-positives

### Limitations:
- The nature of 32bit Floats rounds values to 7 decimal places
- The tree is implicit, and so is harder to read
- Depends on xxhash
- Asynchronous creation

### Structure:
- Nodeless implicit SoA structure
- Maintains parallel arrays preserved in serialization
- Uses `quickselect` and `median-of-three` partitioning around the pivot
- Core data is immutable
***
## API
Initialization: