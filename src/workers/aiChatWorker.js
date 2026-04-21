function parseSSE(line) {
  const result = {};
  if (line.startsWith("event:")) {
    result.event = line.substring(6).trim();
  } else if (line.startsWith("data:")) {
    const afterPrefix = line.substring(5);
    if (afterPrefix.length > 0 && afterPrefix[0] === " ") {
      result.data = afterPrefix.substring(1);
    } else {
      result.data = afterPrefix;
    }
  } else if (line.startsWith("id:")) {
    result.id = line.substring(3).trim();
  }
  return result;
}

self.addEventListener("message", async (event) => {
  const message = event.data;

  if (message.type === "start") {
    let abortController = null;
    let reader = null;

    try {
      abortController = new AbortController();

      const fetchOptions = {
        method: message.method || "POST",
        headers: message.headers,
        signal: abortController.signal,
      };
      if (message.body) fetchOptions.body = message.body;

      // Retry fetch once after a short delay if the first attempt fails.
      // This handles the race condition where a service worker is still
      // activating and intercepts/drops the request.
      let response;
      try {
        response = await fetch(message.url, fetchOptions);
      } catch (firstError) {
        if (abortController.signal.aborted) throw firstError;
        await new Promise((r) => setTimeout(r, 1500));
        response = await fetch(message.url, fetchOptions);
      }

      if (!response.ok) {
        self.postMessage({
          type: "error",
          error: `HTTP ${response.status}: ${response.statusText}`,
        });
        return;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("text/event-stream")) {
        self.postMessage({
          type: "error",
          error: "Invalid content type. Expected text/event-stream",
        });
        return;
      }

      self.postMessage({ type: "open" });

      if (!response.body) {
        self.postMessage({
          type: "error",
          error: "Response body is null",
        });
        return;
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      // Keep currentEvent and currentData outside the loop to persist across chunk boundaries
      let currentEvent = "";
      let currentData = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") {
            if (currentData !== "") {
              self.postMessage({
                type: "message",
                event: currentEvent || "message",
                data: currentData,
              });
            }
            currentEvent = "";
            currentData = "";
          } else {
            const parsed = parseSSE(line);
            if (parsed.event) currentEvent = parsed.event;
            if (parsed.data !== undefined) {
              if (currentData) {
                currentData += "\n" + parsed.data;
              } else {
                currentData = parsed.data;
              }
            }
          }
        }
      }

      // Flush remaining buffer
      if (buffer) {
        const lines = buffer.split("\n");

        for (const line of lines) {
          if (line.trim() === "") {
            if (currentData !== "") {
              self.postMessage({
                type: "message",
                event: currentEvent || "message",
                data: currentData,
              });
            }
            currentEvent = "";
            currentData = "";
          } else {
            const parsed = parseSSE(line);
            if (parsed.event) currentEvent = parsed.event;
            if (parsed.data !== undefined) {
              if (currentData) {
                currentData += "\n" + parsed.data;
              } else {
                currentData = parsed.data;
              }
            }
          }
        }
      }

      // Flush any remaining event that wasn't terminated by an empty line
      if (currentData !== "") {
        self.postMessage({
          type: "message",
          event: currentEvent || "message",
          data: currentData,
        });
      }

      self.postMessage({ type: "close" });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        self.postMessage({ type: "close" });
      } else {
        self.postMessage({
          type: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } finally {
      if (reader) {
        try {
          await reader.cancel();
        } catch {}
      }
      if (abortController) {
        abortController.abort();
      }
    }
  } else if (message.type === "stop") {
    self.close();
  }
});
