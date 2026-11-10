import { authenticationService } from '@/services/authentication';
import type { RegistrationService } from '@/types/auth';

// BACKEND INTEGRATION: Single shared auth adapter; explicitly enabled mock in dev,
// unavailable otherwise. See docs/authentication-handoff.md for proposed contracts.
export const registerOwner: RegistrationService = values => authenticationService.registerOwner(values);
