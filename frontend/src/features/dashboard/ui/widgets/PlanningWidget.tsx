/**
 * Planning widget — wraps WeeklyPlanningPreview.
 * @module features/dashboard/ui/widgets
 */

import { memo } from 'react';
import WeeklyPlanningPreview from '../components/WeeklyPlanningPreview';

export default memo(function PlanningWidget() {
    return <WeeklyPlanningPreview />;
});
