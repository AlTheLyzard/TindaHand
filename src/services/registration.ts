import { authenticationService } from '@/services/authentication';
import type { RegistrationService } from '@/types/auth';

// TODO(backend): Connect owner registration to the approved authentication service.
// - Method/Action: POST / Register Owner account
// - Expected Input/Payload: RegistrationFormValues; password and PIN are request-only secrets
// - Expected Response: RegistrationResult with server-assigned Owner ID or field-level errors
// - UI State to Wire: Set completion only after confirmation and preserve fields on failure
export const registerOwner: RegistrationService = values => authenticationService.registerOwner(values);
