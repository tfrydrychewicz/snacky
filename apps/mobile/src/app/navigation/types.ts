export type RootStackParamList = {
  Placeholder: undefined;
  Auth: undefined;
  Main: undefined;
  Onboarding: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
