function parseSSE(line: string) {
  const result: { event?: string; data?: string; id?: string } = {};
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

type WorkerMessage =
  | {
      type: "start";
      url: string;
      headers: Record<string, string>;
      body: string;
      method?: string;
    }
  | {
      type: "stop";
    };

self.addEventListener("message", async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type === "start") {
    let abortController: AbortController | null = null;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      abortController = new AbortController();

      const effectiveMethod = message.method || "POST";
      const response = await fetch(message.url, {
        method: effectiveMethod,
        headers: message.headers,
        body: effectiveMethod === "GET" ? undefined : message.body,
        signal: abortController.signal,
      });

      if (!response.ok) {
        if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429
        ) {
          self.postMessage({
            type: "error",
            error: `HTTP ${response.status}: ${response.statusText}`,
          });
          return;
        } else {
          self.postMessage({
            type: "error",
            error: `HTTP ${response.status}: ${response.statusText}`,
          });
          return;
        }
      }

      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("text/event-stream")) {
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

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        let currentData = "";

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
            if (parsed.event) {
              currentEvent = parsed.event;
            }
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

      if (buffer) {
        const lines = buffer.split("\n");
        let currentEvent = "";
        let currentData = "";

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
            if (parsed.event) {
              currentEvent = parsed.event;
            }
            if (parsed.data !== undefined) {
              if (currentData) {
                currentData += "\n" + parsed.data;
              } else {
                currentData = parsed.data;
              }
            }
          }
        }

        if (currentData !== "") {
          self.postMessage({
            type: "message",
            event: currentEvent || "message",
            data: currentData,
          });
        }
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
        } catch {
          // Ignore cancel errors
        }
      }
      if (abortController) {
        abortController.abort();
      }
    }
  } else if (message.type === "stop") {
    self.close();
  }
});
