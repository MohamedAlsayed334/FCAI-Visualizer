import { SearchingAlgorithm } from './SearchingAlgorithm';
import { genLinearSearchSteps } from '../../../algorithms/searching/searchingGenerators';

export class LinearSearch extends SearchingAlgorithm {
  constructor() {
    super('linear-search');
  }

  generateSteps({ arr, target }) {
    return genLinearSearchSteps(arr, target);
  }
}
