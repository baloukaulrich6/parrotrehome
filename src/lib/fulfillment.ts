export function fulfillmentLabel(method: string | null | undefined): string {
  if (method === "PICKUP") return "Pickup at the breeder / trainer (appointment and location to be confirmed)";
  if (method === "DELIVERY") return "Delivery (availability, costs and date to be confirmed before payment)";
  return "Not specified — contact the customer";
}
