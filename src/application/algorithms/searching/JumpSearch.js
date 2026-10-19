import { SearchingAlgorithm } from './SearchingAlgorithm';
import { genJumpSearchSteps } from '../../../algorithms/searching/searchingGenerators';

export class JumpSearch extends SearchingAlgorithm {
  constructor() {
    super('jump-search');
  }

  generateSteps({ arr, target }) {
    return genJumpSearchSteps(arr, target);
  }
}
