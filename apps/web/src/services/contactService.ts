import type {
  ApiResponseErrorPayload,
  ApiResponseSuccessPayload,
  ContactConfig,
  ContactRequest,
  ContactResponse,
} from '@simple-site/interfaces';
import { ContactConfigSchema } from '@simple-site/interfaces';
import apiService from './apiService';

/**
 * Contact service. `GET` (page settings) and `POST` (message send) are public —
 * the form serves anonymous visitors; the settings write is admin-gated with a
 * DIRECT-SAVE lifecycle (no draft/publish). The whole `/api/contact` surface
 * 404s when the `contact` feature flag is off.
 */

/** Sends a contact message. Resolves on success, throws with the API message otherwise. */
export const sendContactMessage = async (contact: ContactRequest): Promise<void> => {
  const response = await apiService.post<ContactRequest, ContactResponse>('contact', contact);
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
};

/** Fetches the contact page settings (empty object when nothing is stored yet). */
export const loadContactConfig = async (): Promise<ContactConfig> => {
  const response = await apiService.get<ContactConfig>('contact');
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
  return ContactConfigSchema.parse((response as ApiResponseSuccessPayload<ContactConfig>).data);
};

/** Replaces the contact page settings. Changes are LIVE immediately. */
export const saveContactConfig = async (config: ContactConfig): Promise<void> => {
  const response = await apiService.put<ContactConfig, { message: string }>('contact', config);
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
};
