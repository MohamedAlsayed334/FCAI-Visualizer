import { DataStructureAlgorithm } from './DataStructureAlgorithm';

export class QueueDS extends DataStructureAlgorithm {
  constructor() {
    super('queue-ds');
  }

  generateSteps(input) {
    const values = [];
    const steps = [];

    steps.push({
      ds: 'queue', data: { values: [], highlighted: -1 },
      msg: 'Initialize empty queue (FIFO)', msgKey: 'steps:ds.queue.init', codeLine: 0, codeLines: {},
    });

    for (const op of input) {
      if (op.op === 'enqueue' || op.op === 'insert') {
        values.push(op.value);
        steps.push({
          ds: 'queue', data: { values: [...values], highlighted: values.length - 1, operation: 'enqueue' },
          msg: `Enqueue ${op.value}`,
          msgKey: 'steps:ds.queue.enqueue', msgParams: { v: op.value }, codeLine: 1, codeLines: {},
        });
      } else if (op.op === 'dequeue' || op.op === 'delete') {
        if (values.length === 0) continue;
        const val = values.shift();
        steps.push({
          ds: 'queue', data: { values: [...values], highlighted: -1, operation: 'dequeue' },
          msg: `Dequeue ${val}`,
          msgKey: 'steps:ds.queue.dequeue', msgParams: { v: val }, codeLine: 2, codeLines: {},
        });
      }
    }

    return steps;
  }
}
