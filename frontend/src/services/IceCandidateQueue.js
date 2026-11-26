export class IceCandidateQueue {
  constructor() { this.pending = new Map(); }
  async add(id, candidate, peer) {
    if (peer?.signalingState === 'closed') return;
    if (peer?.remoteDescription) return peer.addIceCandidate(candidate);
    if (!this.pending.has(id)) this.pending.set(id, []);
    const queue = this.pending.get(id);
    if (queue.length < 100) queue.push(candidate);
  }
  async flush(id, peer) {
    if (!peer.remoteDescription || peer.signalingState === 'closed') return;
    const queue = this.pending.get(id) || [];
    this.pending.delete(id);
    for (const candidate of queue) await peer.addIceCandidate(candidate);
  }
  delete(id) { this.pending.delete(id); }
  clear() { this.pending.clear(); }
}
