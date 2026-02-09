import type { AuditEvent } from './events';

/** Sink abstraction for audit event delivery. */
export interface AuditSink {
  write(event: AuditEvent): Promise<void>;
}

/** Console sink options. */
export interface ConsoleSinkOptions {
  stream?: Pick<NodeJS.WritableStream, 'write'>;
}

/** Writes one JSON line per audit event. */
export class ConsoleSink implements AuditSink {
  private readonly stream: Pick<NodeJS.WritableStream, 'write'>;

  constructor(options: ConsoleSinkOptions = {}) {
    this.stream = options.stream ?? process.stdout;
  }

  public async write(event: AuditEvent): Promise<void> {
    const line = `${JSON.stringify(event)}\n`;
    this.stream.write(line);
  }
}

/** Failure behavior for batching flush operations. */
export type BatchingErrorStrategy = 'drop' | 'throw';

/** Batching sink options. */
export interface BatchingSinkOptions {
  flushIntervalMs?: number;
  maxBatchSize?: number;
  onError?: BatchingErrorStrategy;
  onDropped?: (error: unknown, event: AuditEvent) => void;
}

/**
 * Batches events before forwarding to an underlying sink.
 * Use `flush()` during shutdown to ensure all queued events are drained.
 */
export class BatchingSink implements AuditSink {
  private readonly sink: AuditSink;
  private readonly flushIntervalMs: number;
  private readonly maxBatchSize: number;
  private readonly onError: BatchingErrorStrategy;
  private readonly onDropped: ((error: unknown, event: AuditEvent) => void) | undefined;

  private buffer: AuditEvent[] = [];
  private timer: NodeJS.Timeout | null = null;
  private flushing: Promise<void> | null = null;

  constructor(sink: AuditSink, options: BatchingSinkOptions = {}) {
    this.sink = sink;
    this.flushIntervalMs = options.flushIntervalMs ?? 250;
    this.maxBatchSize = options.maxBatchSize ?? 100;
    this.onError = options.onError ?? 'drop';
    this.onDropped = options.onDropped;

    if (this.flushIntervalMs > 0) {
      this.timer = setInterval(() => {
        void this.flush();
      }, this.flushIntervalMs);
      this.timer.unref();
    }
  }

  public async write(event: AuditEvent): Promise<void> {
    this.buffer.push(event);

    if (this.buffer.length >= this.maxBatchSize) {
      await this.flush();
    }
  }

  /** Flush buffered events to the underlying sink. */
  public async flush(): Promise<void> {
    if (this.flushing) {
      await this.flushing;
      // Re-check: events may have been buffered while we waited.
      if (this.buffer.length > 0) {
        return this.flush();
      }
      return;
    }

    this.flushing = this.flushInternal();

    try {
      await this.flushing;
    } finally {
      this.flushing = null;
    }
  }

  /** Stop interval flushing and flush remaining events. */
  public async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    await this.flush();
  }

  private async flushInternal(): Promise<void> {
    while (this.buffer.length > 0) {
      const event = this.buffer.shift();
      if (!event) {
        continue;
      }

      try {
        await this.sink.write(event);
      } catch (error) {
        if (this.onError === 'throw') {
          this.buffer.unshift(event);
          throw error;
        }

        if (this.onDropped) {
          this.onDropped(error, event);
        }
      }
    }
  }
}
