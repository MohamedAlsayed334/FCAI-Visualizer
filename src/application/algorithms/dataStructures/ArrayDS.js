import { DataStructureAlgorithm } from './DataStructureAlgorithm';

export class ArrayDS extends DataStructureAlgorithm {
  constructor() {
    super('array-ds');
  }

  generateSteps(input) {
    const values = [];
    const steps = [];

    steps.push({
      ds: 'array', data: { values: [], highlighted: -1 },
      msg: 'Initialize empty array', msgKey: 'steps:ds.array.init', codeLine: 0, codeLines: {},
    });

    for (const op of input) {
      if (op.op === 'insert') {
        const idx = op.index ?? values.length;
        values.splice(idx, 0, op.value);
        steps.push({
          ds: 'array', data: { values: [...values], highlighted: idx, operation: 'insert' },
          msg: `Insert ${op.value} at index ${idx}`,
          msgKey: 'steps:ds.array.insert', msgParams: { v: op.value, idx }, codeLine: 1, codeLines: {},
        });
      } else if (op.op === 'delete') {
        const idx = op.index ?? values.length - 1;
        const removed = values.splice(idx, 1)[0];
        steps.push({
          ds: 'array', data: { values: [...values], highlighted: -1, operation: 'delete' },
          msg: `Delete ${removed} at index ${idx}`,
          msgKey: 'steps:ds.array.delete', msgParams: { v: removed, idx }, codeLine: 2, codeLines: {},
        });
      } else if (op.op === 'set') {
        const idx = op.index ?? 0;
        if (idx < values.length) {
          values[idx] = op.value;
          steps.push({
            ds: 'array', data: { values: [...values], highlighted: idx, operation: 'set' },
            msg: `Set index ${idx} = ${op.value}`,
            msgKey: 'steps:ds.array.set', msgParams: { idx, v: op.value }, codeLine: 3, codeLines: {},
          });
        }
      }
    }

    return steps;
  }
}
