export type Trip = {
  id: string;
  passengerId: string;
  passenger: string;
  passengerPhone?: string;
  pickup: string;
  destination: string;
  reward: string;
  distance: string;
  time: string;
  destinationLocation: {
    latitude: number;
    longitude: number;
  };
  stepStatus: number;
  status: string;
  isAcceptedByDeliveryman: boolean;
  originalData: any;
  isProcessing?: boolean;
};

export type WebSocketOrderData = {
  order: any;
  action: string;
  timestamp: string;
  deliverymanId?: string;
};

export type WebSocketError = {
  message: string;
  code?: string;
};

export type LocationData = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp?: number;
};
