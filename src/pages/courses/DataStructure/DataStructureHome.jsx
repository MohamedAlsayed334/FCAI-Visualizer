import CourseOverview from '../../../components/shared/CourseOverview';
import { dataStructureCourse } from '../../../data/courses';

export default function DataStructureHome() {
  return <CourseOverview course={dataStructureCourse} />;
}
