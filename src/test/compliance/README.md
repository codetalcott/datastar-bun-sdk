# Datastar Server-Side SDK Compliance Testing Suite

This test suite validates that the datastar-bun-sdk correctly implements server-side Datastar SSE event generation according to the official Datastar SDK specification.

## Requirements

The datastar-bun-sdk MUST be a **server-side SDK** that:

1. **Generates Datastar SSE Events**: Creates properly formatted Server-Sent Events for Datastar frontend consumption
2. **Implements Event Types**: Supports all standard Datastar event types (mergeSignals, mergeFragments, executeScript, removeSignals, removeFragments)
3. **Handles Signal Processing**: Can read and process signals from HTTP request bodies
4. **Provides Test Server**: Exposes a `/test` endpoint for compliance testing

## Test Server Requirements

The SDK must provide a test server that:
- Exposes a `/test` endpoint accepting all HTTP methods
- Uses the SDK's `readSignals()` function to extract the `events` array from requests
- Loops through events and uses `event.type` to generate appropriate Datastar SSE responses
- Returns properly formatted `text/event-stream` responses with correct Content-Type headers

## Usage

```
$ ./test-all.sh $server_address
Running tests with argument: $server_address
Processing GET cases...
Processing POST cases...
```

If nothing else is output then all tests passed!

Results of the test can be found in `./get_cases/$case_name/testOutput.txt` (or `post_cases` depending on the test).

 ## Adding new cases

 To add a new test case, simply add a folder named after the test in either `./get-cases` or `./post-cases`.

That folder must contain an `input.json` file and an `output.txt` file.

The `input.json` file must contain valid json of the following shape:

```
{"events":
  [
    { "type": "executeScript",
      "script": "console.log('hello');",
      "eventId": 1,
      "retryDuration": 2000,
       "attributes": {
         "type": "text/javascript",
         "blocking": false
       },
       "autoRemove": false
     }
   ]
}
```

The `output.txt` file must contain valid a `txt/eventstream` like such:

```
event: datastar-execute-script
id: 1
retry: 2000
data: attributes type text/javascript
data: attributes blocking false
data: autoRemove false
data: script console.log('hello');
```
