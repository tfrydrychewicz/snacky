export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Onboarding: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
