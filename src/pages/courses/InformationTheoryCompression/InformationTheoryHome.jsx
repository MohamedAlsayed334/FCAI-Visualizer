import CourseOverview from '../../../components/shared/CourseOverview';
import { informationTheoryCourse } from '../../../data/courses';

export default function InformationTheoryHome() {
  return <CourseOverview course={informationTheoryCourse} />;
}
