// Assumed endpoint per Stack Mapping Contract row 3. No backend reference files
// were recorded for this sprint — employee-lifecycle endpoints belong to a
// separate backend sprint; adjust the path below if the implemented controller differs.
import { apiRequest } from '../../../shared/api/httpClient';
import { ActionApiResponse } from '../../../shared/types/actionResult';
import { LifecycleActionRequest } from '../types/lifecycleAction';

export function submitLifecycleAction(request: LifecycleActionRequest): Promise<ActionApiResponse> {
  return apiRequest<ActionApiResponse>(`/employees/${request.employeeId}/lifecycle-actions`, {
    method: 'POST',
    body: request,
  });
}
