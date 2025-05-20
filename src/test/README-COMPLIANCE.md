# Datastar Compliance Tests

This directory contains tests for verifying that the SDK's implementation complies with the Datastar specification. These tests are based on the official test suite from the [Datastar repository](https://github.com/starfederation/datastar).

## Running Compliance Tests

To run the compliance tests, use the following command:

```bash
bun run test:compliance
```

This will:
1. Start a test server on localhost:3000
2. Run all the compliance tests against the server
3. Report the results

## Updating Compliance Tests

If the Datastar specification is updated, you can update these compliance tests to match the latest version:

```bash
bun run test:compliance:update
```

This will:
1. Clone the latest version of the Datastar repository
2. Copy the test cases and scripts to this directory
3. Update the VERSION file with the latest Git commit hash

## Test Structure

The compliance tests are organized as follows:

- `get-cases/` - Test cases for GET requests
- `post-cases/` - Test cases for POST requests
- `test-all.sh` - Script to run all tests
- `test-get.sh` - Script to run GET tests
- `test-post.sh` - Script to run POST tests
- `normalize.sh` - Script to normalize test output
- `VERSION` - File containing the version information for the tests

Each test case directory contains:
- `input.json` - The input for the test
- `output.txt` - The expected output
- `testOutput.txt` - The actual output (generated when tests are run)

## Legacy Testing

If you want to run the tests by cloning the repository directly (the old way), you can use:

```bash
bun run test:compliance:clone
```

This is kept for reference, but the preferred method is to use the local tests.