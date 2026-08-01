import type { ApiResponseErrorPayload, ContactRequest, ContactResponse } from '@simple-site/interfaces';
import apiService from './apiService';

/**
 * Contact service. `POST /api/contact` is public (the form serves anonymous
 * visitors) and relays the message to the site owner by email. The whole
 * surface 404s when the `contact` feature flag is off.
 */

/** Sends a contact message. Resolves on success, throws with the API message otherwise. */
export const sendContactMessage = async (contact: ContactRequest): Promise<void> => {
  const response = await apiService.post<ContactRequest, ContactResponse>('contact', contact);
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
};
