import fc from 'fast-check';

// Configure fast-check defaults for all property-based tests
fc.configureGlobal({
  numRuns: 100,
});
