// src/navigation/routes.ts
export type RootStackParamList = {
  Login: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  RegisterUser: undefined;
  Home: undefined;
  Trips: undefined;
  Map: undefined;
  Profile?: undefined;
  Notifications?: undefined;
  Wallet?: undefined;
  Earnings?: undefined;
  Stats?: undefined;
  EditProfile?: undefined;
};


export const ROUTES = {
  LOGIN: "Login",
  ONBOARDING: "Onboarding",
  MAIN_TABS: "MainTabs",
  HOME: "Home",
  TRIPS: "Trips",
  MAP: "Map",
  PROFILE: "Profile",
  NOTIFICATIONS: "Notifications",
  EARNINGS: "Wallet",   // Agora aponta para o Tab "Wallet" — consistente com BottomMenu
  STATS: "Stats",
  REGISTER_USER: "RegisterUser",
  UPDATE_PROFILE: "EditProfile",
} as const;
