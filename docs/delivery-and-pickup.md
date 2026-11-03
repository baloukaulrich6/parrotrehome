# Delivery and pickup preference

The request form requires a choice between delivery and collection at the breeder / trainer. The preference is saved on the order, shown to the customer and administration, and included in both request acknowledgement and team notification emails.

A preference is not a confirmed transportation booking. Delivery availability, charges and timing must be agreed before payment; collection requires confirmation of the actual bird location and an appointment. Multiple birds can have different collection locations. The customer's state is still required for service eligibility, for either option.

Historical requests display “Not specified — contact the customer”. Existing API integrations may omit the preference; unsupported values are rejected. No historical delivery or pickup choice is inferred.

Deployment runs `scripts/migrate-fulfillment.py` after the usual database backup. It adds a nullable `Request.fulfillmentMethod` column and preserves existing data. Repeated runs preserve recorded choices.
