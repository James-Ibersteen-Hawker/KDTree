/*
Plan:
- Use Float32Arrays
- Use contiguous storage, without a tree-based structure
- Partition linearly instead of vertically
- Keep the array-of-indexes approach and the flatpacked storage
- Child bounds are in parallel arrays, similarly processed to the flatpacked storage
*/