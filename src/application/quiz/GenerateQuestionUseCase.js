import { generateQuestion } from '../../services/aiService';
import { Question } from '../../domain/quiz/Question';

export class GenerateQuestionUseCase {
  async execute(topic, subTopic, difficulty, questionType, questionMode, language, uiLocale = 'en') {
    try {
      const aiQuestion = await generateQuestion(topic, subTopic, difficulty, questionType, questionMode, language, uiLocale);
      return new Question(aiQuestion);
    } catch (err) {
      throw new Error(`Failed to generate question: ${err.message}`, { cause: err });
    }
  }
}
