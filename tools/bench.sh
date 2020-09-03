# Build to standalone production js
yarn prod

# Build standalone production binaries
yarn pkg

# Run benchmarks on both
hyperfine 'node ./dist/verto.js' './verto' -i --export-markdown ./BENCHMARKS.md --warmup 5
