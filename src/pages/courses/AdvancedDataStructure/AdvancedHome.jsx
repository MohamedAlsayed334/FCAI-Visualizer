import CourseOverview from '../../../components/shared/CourseOverview';
import { advancedDataStructureCourse } from '../../../data/courses';

export default function AdvancedHome() {
  return <CourseOverview course={advancedDataStructureCourse} />;
}
