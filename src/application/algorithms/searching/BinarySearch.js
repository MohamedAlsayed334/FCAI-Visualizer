import { SearchingAlgorithm } from './SearchingAlgorithm';
import { genBinarySearchSteps } from '../../../algorithms/searching/searchingGenerators';

export class BinarySearch extends SearchingAlgorithm {
  constructor() {
    super('binary-search');
  }

  generateSteps({ arr, target }) {
    return genBinarySearchSteps(arr, target);
  }
}
