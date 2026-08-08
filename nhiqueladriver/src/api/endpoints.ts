export const ENDPOINTS = {
  LOGIN: "/users/signin",
  UPLOAD_LOCAL: "/upload/local",
  SEND_OTP: "/users/send-otp",
  VERIFY_OTP: "/users/verify-otp",
  FORGOT_PASSWORD: "/users/forgot-password",
  REGISTER_DRIVER: "/users/signup",
  UPDATE_DRIVER_REQUEST: "/users/deliveryman/update-request",
  GET_ROUTES: "/routes",
  GET_ROUTE_DETAILS: (routeId: string) => `/routes/${routeId}`,
  UPDATE_DRIVER_PROFILE: "/drivers/update",
  PROVIDER_SUBCATEGORIES: "/provider-subcategories",
  VEHICLE_COLORS: "/vehicle-colors",
  PING: "/drivers/ping",

  GET_ORDERS_STATUS: (status: string) => `/orders/statusDelivery/${status}`,
  GET_TRIPS: (status: string) => `/orders/status/${status}`,
  GET_ACCEPT_ORDER: '/orders/accepted/byDeliveryman',
  GET_ALL_ORDERS_FOR_DELIVERYMAN: '/orders/deliveryman/all',
  

  // Atualizar status da entrega
  UPDATE_DELIVERYMAN_LOCATION: () => `/tracking/update`,

  ACCEPT_ORDER_BY_DELIVERYMAN: (orderId: string) => `orders/${orderId}/acceptedByDeliveryman`,
  START_ORDER_IN_TRANSIT: (orderId: string) => `orders/${orderId}/intransit`,
  CONFIRM_ORDER_DELIVERED: (orderId: string) => `orders/${orderId}/confirmDestination`,
  CANCEL_ORDER_BY_DELIVERYMAN: (orderId: string) => `orders/${orderId}/cancelByDeliveryman`,
  GET_TRIPS_HISTORY: (id: string) => `/orders/deliveryman/history/${id}`
};