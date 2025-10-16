export type TaskFn<T=any> = () => Promise<T>

export class RunnerQueue {
  private concurrency: number
  private running = 0
  private queue: Array<{ fn: TaskFn; resolve: (v:any)=>void; reject: (e:any)=>void }> = []

  constructor(concurrency = 2) { this.concurrency = Math.max(1, concurrency) }

  setConcurrency(n: number) { this.concurrency = Math.max(1, n) }

  add<T>(fn: TaskFn<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject }); this.tick()
    })
  }

  private tick() {
    while (this.running < this.concurrency && this.queue.length) {
      const next = this.queue.shift()!
      this.running++
      next.fn()
        .then(v => next.resolve(v))
        .catch(err => next.reject(err))
        .finally(() => { this.running--; this.tick() })
    }
  }
}

