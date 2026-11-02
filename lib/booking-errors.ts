/** Domain error carrying the HTTP status the API should respond with. */
export class BookingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "BookingError";
    this.status = status;
  }
}

/** Media add-on shape used across the trip event, checkout and media project layers. */
export type AddonSummary = {
  _id?: unknown;
  addonId?: string;
  code: string;
  name: string;
  kind?: string;
  description?: string;
  price: number;
  perPerson: boolean;
  active?: boolean;
};
