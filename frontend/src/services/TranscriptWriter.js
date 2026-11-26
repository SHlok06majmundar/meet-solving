// Coalesce interim updates and serialize writes so a slow request cannot overwrite a final chunk.
export class TranscriptWriter {
  constructor(save, onError = () => {}) {
    this.save = save;
    this.onError = onError;
    this.pending = new Map();
    this.saved = new Map();
    this.running = false;
    this.closed = false;
    this.retryTimer = null;
    this.retryDelay = 1000;
  }

  enqueue(item) {
    if (this.closed) return;
    const signature = `${item.text}::${Boolean(item.isFinal)}`;
    if (this.saved.get(item.id) === signature) return;
    this.pending.set(item.id, { item, signature });
    if (!this.retryTimer) void this.flush();
  }

  async flush() {
    if (this.running || this.closed) return;
    this.running = true;
    try {
      while (this.pending.size && !this.closed) {
        const [id, entry] = this.pending.entries().next().value;
        try {
          await this.save(entry.item);
          this.saved.set(id, entry.signature);
          if (this.saved.size > 2000) this.saved.delete(this.saved.keys().next().value);
          if (this.pending.get(id) === entry) this.pending.delete(id);
          this.retryDelay = 1000;
        } catch (error) {
          this.onError(error);
          if (!this.closed) {
            this.retryTimer = setTimeout(() => {
              this.retryTimer = null;
              void this.flush();
            }, this.retryDelay);
            this.retryDelay = Math.min(this.retryDelay * 2, 30000);
          }
          break;
        }
      }
    } finally { this.running = false; }
  }

  close() {
    this.closed = true;
    clearTimeout(this.retryTimer);
    this.pending.clear();
  }
}
