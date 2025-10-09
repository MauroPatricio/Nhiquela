export const ENDPOINTS = {
  LOGIN: "/users/signin",
  REGISTER_DRIVER: "/users/signup",
  UPDATE_DRIVER_REQUEST: "/users/deliveryman/update-request",
  GET_ROUTES: "/routes",
  GET_ROUTE_DETAILS: (routeId: string) => `/routes/${routeId}`,
  UPDATE_DRIVER_PROFILE: "/drivers/update",
  GET_ORDERS_STATUS: (status: string) => `/orders/status/${status}`,
  GET_TRIPS: (status: string) => `/orders/status/${status}`,


  // Atualizar status da entrega
  ACCEPT_ORDER_BY_DELIVERYMAN: (orderId: string) => `/${orderId}/acceptedByDeliveryman`,
  START_ORDER_IN_TRANSIT: (orderId: string) => `/${orderId}/intransit`,
  CONFIRM_ORDER_DELIVERED: (orderId: string) => `/${orderId}/confirmDestination`,
  GET_TRIPS_HISTORY: (id: string) => `/orders/deliveryman/history/${id}`
};
