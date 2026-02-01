// MVP stub for a queue, replace with BullMQ/Redis when needed.
export class QueueStub<T> {
	constructor(public readonly name: string) {}
	async add(_jobName: string, _data: T): Promise<void> {
		// no-op
	}
}

